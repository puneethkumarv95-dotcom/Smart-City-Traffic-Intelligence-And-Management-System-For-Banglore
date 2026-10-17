require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const CityZone = require('../models/CityZone');
const Incident = require('../models/Incident');
const RoadClosure = require('../models/RoadClosure');
const TrafficAlert = require('../models/TrafficAlert');
const SavedRoute = require('../models/SavedRoute');
const Notification = require('../models/Notification');

describe('Phase 3: Live Traffic, Maps & Smart Navigation Test Suite', () => {
  let citizenToken;
  let citizenUser;
  let policeToken;
  let policeUser;
  let testZone;
  let createdClosureId;
  let createdSavedRouteId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_city_traffic';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Clean up test users
    await User.deleteMany({
      email: { $in: ['p3_cit@smartcity.gov', 'p3_pol@smartcity.gov'] }
    });

    testZone = await CityZone.findOne({ code: 'HEB-02' });
    if (!testZone) {
      testZone = await CityZone.create({
        name: 'Hebbal Flyover Zone',
        code: 'HEB-02',
        city: 'Bengaluru',
        center: { type: 'Point', coordinates: [77.597, 13.0358] }
      });
    }

    citizenUser = await User.create({
      name: 'P3 Commuter',
      email: 'p3_cit@smartcity.gov',
      password: 'Password@123',
      role: 'citizen',
      isApproved: true,
      isActive: true
    });

    policeUser = await User.create({
      name: 'Inspector P3 Officer',
      email: 'p3_pol@smartcity.gov',
      password: 'Password@123',
      role: 'police',
      badgeNumber: 'BTP-P3-09',
      assignedZone: testZone._id,
      isApproved: true,
      isActive: true
    });

    const cRes = await request(app).post('/api/auth/login').send({
      email: 'p3_cit@smartcity.gov',
      password: 'Password@123'
    });
    citizenToken = cRes.body.data.accessToken;

    const pRes = await request(app).post('/api/auth/login').send({
      email: 'p3_pol@smartcity.gov',
      password: 'Password@123'
    });
    policeToken = pRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Traffic Observations & Conditions Service', () => {
    it('GET /api/traffic/conditions returns road corridor telemetry with demonstration mode label', async () => {
      const res = await request(app).get('/api/traffic/conditions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dataSource).toBeDefined();
      expect(Array.isArray(res.body.data.corridors)).toBe(true);
      expect(res.body.data.corridors.length).toBeGreaterThan(0);

      const firstCorridor = res.body.data.corridors[0];
      expect(firstCorridor.name).toBeDefined();
      expect(firstCorridor.color).toMatch(/^#/);
      expect(firstCorridor.congestionLevel).toBeDefined();
      expect(firstCorridor.coordinates.length).toBeGreaterThan(1);
    });
  });

  describe('2. Geospatial Incident Hotspots Heatmap', () => {
    it('GET /api/traffic/hotspots aggregates incident locations with severity weighting', async () => {
      const res = await request(app).get('/api/traffic/hotspots');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const spot = res.body.data[0];
        expect(spot.coordinates.length).toBe(2);
        expect(spot.intensity).toBeGreaterThanOrEqual(0.2);
        expect(spot.totalWeight).toBeGreaterThanOrEqual(1);
      }
    });

    it('GET /api/traffic/hotspots supports category and minSeverity filtering', async () => {
      const res = await request(app)
        .get('/api/traffic/hotspots')
        .query({ category: 'Pothole', minSeverity: 'medium' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('3. Historical Traffic & Incident Analytics', () => {
    it('GET /api/traffic/history returns 24-hour distribution and zone breakdowns', async () => {
      const res = await request(app).get('/api/traffic/history');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hourlyDistribution).toBeDefined();
      expect(res.body.data.hourlyDistribution.length).toBe(24);
      expect(res.body.data.hourlyDistribution[9].isPeakHour).toBe(true); // 09:00 morning peak
      expect(res.body.data.categoryBreakdown).toBeDefined();
    });
  });

  describe('4. Smart Route Navigation & Closure Cross-Referencing', () => {
    it('POST /api/traffic/routes calculates route with distance, travel time, and geometry', async () => {
      const res = await request(app)
        .post('/api/traffic/routes')
        .send({
          origin: [77.5713, 12.9767], // Majestic
          destination: [77.597, 13.0358] // Hebbal
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.routes.length).toBeGreaterThan(0);

      const primary = res.body.data.routes[0];
      expect(primary.distanceKm).toBeGreaterThan(5);
      expect(primary.estimatedDurationMin).toBeGreaterThan(5);
      expect(primary.geometry.coordinates.length).toBeGreaterThan(2);
      expect(primary.etaDisclaimer).toBeDefined();
    });

    it('POST /api/traffic/routes rejects invalid coordinates format with 400', async () => {
      const res = await request(app)
        .post('/api/traffic/routes')
        .send({
          origin: [77.5713], // Missing latitude
          destination: [77.597, 13.0358]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Road Closure Management & Authorization', () => {
    it('Police can create official road closure notice via POST /api/traffic/closures', async () => {
      const res = await request(app)
        .post('/api/traffic/closures')
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          title: '[TEST_P3] Silk Board Underpass Drainage Reconstruction',
          roadName: 'Hosur Road Junction Service Road',
          reason: 'Major stormwater pipe replacement by BBMP',
          diversionInstructions: 'Divert through 14th Main HSR towards BTM ring road',
          latitude: 12.9177,
          longitude: 77.6238,
          address: 'Silk Board Junction, Hosur Road, Bengaluru',
          endTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          severity: 'full'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.closureId).toMatch(/^CLS-\d{6}-\d{4}$/);
      expect(res.body.data.isActive).toBe(true);

      createdClosureId = res.body.data._id;
    });

    it('Citizen cannot create road closure notice (RBAC 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/traffic/closures')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Unauthorized closure attempt',
          roadName: 'Test Road',
          reason: 'Test',
          diversionInstructions: 'None',
          latitude: 12.9177,
          longitude: 77.6238,
          address: 'Silk Board',
          endTime: new Date().toISOString()
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/traffic/closures lists active closures for public motorists', async () => {
      const res = await request(app).get('/api/traffic/closures');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some((c) => c._id.toString() === createdClosureId.toString())).toBe(true);
    });

    it('Police can update closure details and toggle active state via PATCH /api/traffic/closures/:id', async () => {
      const res = await request(app)
        .patch(`/api/traffic/closures/${createdClosureId}`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          diversionInstructions: 'Updated: Single lane opened for two-wheelers only.',
          severity: 'partial'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.severity).toBe('partial');
    });

    it('Police can delete closure notice via DELETE /api/traffic/closures/:id', async () => {
      const res = await request(app)
        .delete(`/api/traffic/closures/${createdClosureId}`)
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Traffic Advisories & Public Alerts', () => {
    it('Police can issue traffic advisory alert via POST /api/traffic/alerts', async () => {
      const res = await request(app)
        .post('/api/traffic/alerts')
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          title: '[TEST_P3] Monsoon High Water Alert',
          message: 'Water logging reported near Bellandur Eco-space. Commuters advised to use Varthur road detour.',
          severity: 'warning',
          affectedCorridors: ['Outer Ring Road'],
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.data.alertId).toMatch(/^ADV-\d{6}-\d{4}$/);
    });

    it('Citizen cannot publish traffic advisory (RBAC 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/traffic/alerts')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Unauthorized alert',
          message: 'Fake advisory',
          validUntil: new Date().toISOString()
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/traffic/alerts retrieves valid active advisories', async () => {
      const res = await request(app).get('/api/traffic/alerts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('7. Commuter Saved Routes & Corridor Monitoring', () => {
    it('Citizen can save commuter route via POST /api/routes/saved', async () => {
      const res = await request(app)
        .post('/api/routes/saved')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          name: 'Home to Tech Park',
          origin: {
            address: 'Majestic Central Hub',
            coordinates: [77.5713, 12.9767]
          },
          destination: {
            address: 'Hebbal Flyover Junction',
            coordinates: [77.597, 13.0358]
          },
          distanceKm: 9.7,
          estimatedDurationMin: 25,
          notes: 'Daily morning commute'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Home to Tech Park');

      createdSavedRouteId = res.body.data._id;
    });

    it('Citizen can retrieve their own saved routes via GET /api/routes/saved', async () => {
      const res = await request(app)
        .get('/api/routes/saved')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].user.toString()).toBe(citizenUser._id.toString());
    });

    it('Citizen can recalculate and check hazards along saved route via GET /api/routes/saved/:id/check', async () => {
      const res = await request(app)
        .get(`/api/routes/saved/${createdSavedRouteId}/check`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.latestDistanceKm).toBeGreaterThan(5);
      expect(res.body.data.geometry).toBeDefined();
    });

    it('Citizen can delete saved route via DELETE /api/routes/saved/:id', async () => {
      const res = await request(app)
        .delete(`/api/routes/saved/${createdSavedRouteId}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('8. In-App Notifications & Location Alerts', () => {
    it('GET /api/notifications returns user notifications with unreadCount', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('PATCH /api/notifications/read-all marks notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
