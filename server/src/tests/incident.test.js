require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Incident = require('../models/Incident');
const CityZone = require('../models/CityZone');
const IncidentVote = require('../models/IncidentVote');

describe('Phase 2: Core Incident Management Workflow Test Suite', () => {
  let citizenToken;
  let citizenUser;
  let policeToken;
  let policeUser;
  let adminToken;
  let testZone;
  let createdIncidentId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_city_traffic';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Clean up test users & test incidents
    await User.deleteMany({ email: { $in: ['inc_citizen@smartcity.gov', 'inc_police@smartcity.gov', 'inc_admin@smartcity.gov'] } });
    await Incident.deleteMany({ title: { $regex: /\[TEST\]/ } });

    // Find or create test zone (Hebbal)
    testZone = await CityZone.findOne({ code: 'HEB-02' });
    if (!testZone) {
      testZone = await CityZone.create({
        name: 'Hebbal Flyover Test Zone',
        code: 'HEB-02',
        city: 'Bengaluru',
        center: { type: 'Point', coordinates: [77.597, 13.0358] }
      });
    }

    // Create test accounts
    citizenUser = await User.create({
      name: 'Incident Citizen Tester',
      email: 'inc_citizen@smartcity.gov',
      password: 'Password@123',
      role: 'citizen',
      isApproved: true,
      isActive: true
    });

    policeUser = await User.create({
      name: 'Incident Officer Tester',
      email: 'inc_police@smartcity.gov',
      password: 'Password@123',
      role: 'police',
      badgeNumber: 'BTP-TEST-99',
      assignedZone: testZone._id,
      isApproved: true,
      isActive: true
    });

    // Obtain tokens
    const citRes = await request(app).post('/api/auth/login').send({
      email: 'inc_citizen@smartcity.gov',
      password: 'Password@123'
    });
    citizenToken = citRes.body.data.accessToken;

    const polRes = await request(app).post('/api/auth/login').send({
      email: 'inc_police@smartcity.gov',
      password: 'Password@123'
    });
    policeToken = polRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Incident Creation & Geo-Tagging', () => {
    it('POST /api/incidents should allow authenticated citizen to report a hazard', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[TEST] Pothole cluster near Hebbal Baptist Hospital',
          category: 'pothole',
          description: 'Dangerous pothole crater in the right lane heading towards airport.',
          severity: 'high',
          latitude: 13.0360,
          longitude: 77.5975,
          address: 'Bellary Road, near Baptist Hospital, Hebbal, Bengaluru',
          zoneId: testZone._id.toString(),
          isAnonymous: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.location.coordinates).toEqual([77.5975, 13.0360]); // [lng, lat]
      expect(res.body.data.isAnonymous).toBe(false);

      createdIncidentId = res.body.data._id;
    });

    it('POST /api/incidents should support anonymous reporting', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .send({
          title: '[TEST] Anonymous signal light broken at Anand Rao Circle',
          category: 'signal_failure',
          description: 'Signal has gone dark causing massive congestion gridlock.',
          severity: 'medium',
          latitude: 12.9770,
          longitude: 77.5720,
          address: 'Anand Rao Circle, Majestic, Bengaluru',
          isAnonymous: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isAnonymous).toBe(true);
      expect(res.body.data.reportedBy).toBeNull();
    });

    it('POST /api/incidents should validate required category and title length', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .send({
          title: 'Hi', // too short (< 5 chars)
          category: 'invalid_category_xyz',
          description: 'Short',
          latitude: 13.0,
          longitude: 77.0,
          address: 'Bangalore'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Geospatial Queries & Nearby Incidents', () => {
    it('GET /api/incidents/nearby should return incidents within radius', async () => {
      const res = await request(app)
        .get('/api/incidents/nearby')
        .query({
          longitude: 77.5975,
          latitude: 13.0360,
          radiusMeters: 5000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/incidents should support category and status filters', async () => {
      const res = await request(app)
        .get('/api/incidents')
        .query({
          category: 'pothole',
          status: 'submitted'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((inc) => inc.category === 'pothole')).toBe(true);
    });
  });

  describe('3. Citizen Community Voting & Anti-Abuse Deduplication', () => {
    it('POST /api/incidents/:id/vote should record confirmation vote', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ voteType: 'confirm' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.confirmVotesCount).toBe(1);
    });

    it('POST /api/incidents/:id/vote should reject double-voting by the same user', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ voteType: 'confirm' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already submitted a verification vote/i);
    });
  });

  describe('4. Officer Verification & Assignment Workflow', () => {
    it('POST /api/incidents/:id/verify should be rejected for regular citizen (RBAC guard)', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/verify`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ notes: 'Citizen trying to verify own incident' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/incidents/:id/verify should allow Traffic Police to verify incident', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/verify`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ notes: 'Field unit confirmed active pothole cluster.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('verified');
      expect(res.body.data.verifiedBy.officerName).toBe(policeUser.name);
    });

    it('POST /api/incidents/:id/assign should assign response team', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/assign`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          officerId: policeUser._id.toString(),
          notes: 'Patrol team dispatched with barricades.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('assigned');
      expect(res.body.data.assignedTo.officerName).toBe(policeUser.name);
    });

    it('PATCH /api/incidents/:id/status should update progress to resolved', async () => {
      const res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          status: 'resolved',
          notes: 'BBMP road repair crew patched pothole. Barricades cleared.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolutionDetails.resolvedAt).toBeDefined();
    });

    it('POST /api/incidents/:id/feedback should record citizen satisfaction rating', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/feedback`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          rating: 5,
          comments: 'Fast resolution by traffic police and BBMP team. Road is smooth now.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
    });
  });
});
