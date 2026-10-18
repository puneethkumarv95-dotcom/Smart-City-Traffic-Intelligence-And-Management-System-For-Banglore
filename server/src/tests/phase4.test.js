require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const CityZone = require('../models/CityZone');
const Incident = require('../models/Incident');
const OfficerShift = require('../models/OfficerShift');
const EscalationEvent = require('../models/EscalationEvent');
const EmergencyRequest = require('../models/EmergencyRequest');
const EmergencyDispatch = require('../models/EmergencyDispatch');
const CitizenFeedback = require('../models/CitizenFeedback');

describe('Phase 4: Advanced Police Operations, Emergency Response & Citizen Services Test Suite', () => {
  let citizenToken;
  let citizenUser;
  let policeToken;
  let policeUser;
  let emergencyToken;
  let emergencyUser;
  let adminToken;
  let adminUser;
  let testZone;
  let testIncident;
  let testShiftId;
  let testEscalationId;
  let testEmergencyRequestId;
  let testDispatchId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_city_traffic';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Clean up test data
    await User.deleteMany({
      email: {
        $in: [
          'p4_cit@smartcity.gov',
          'p4_pol@smartcity.gov',
          'p4_emg@smartcity.gov',
          'p4_adm@smartcity.gov'
        ]
      }
    });

    testZone = await CityZone.findOne({ code: 'MG-01' });
    if (!testZone) {
      testZone = await CityZone.create({
        name: 'MG Road Central Zone',
        code: 'MG-01',
        city: 'Bengaluru',
        center: { type: 'Point', coordinates: [77.6095, 12.9754] }
      });
    }

    citizenUser = await User.create({
      name: 'P4 Citizen Rao',
      email: 'p4_cit@smartcity.gov',
      password: 'Password@123',
      role: 'citizen',
      isApproved: true,
      isActive: true
    });

    policeUser = await User.create({
      name: 'P4 Officer Kumar',
      email: 'p4_pol@smartcity.gov',
      password: 'Password@123',
      role: 'police',
      badgeNumber: 'BTP-P4-101',
      assignedZone: testZone._id,
      isApproved: true,
      isActive: true
    });

    emergencyUser = await User.create({
      name: 'P4 Paramedic Shreya',
      email: 'p4_emg@smartcity.gov',
      password: 'Password@123',
      role: 'emergency',
      department: '108 Ambulance Emergency',
      isApproved: true,
      isActive: true
    });

    adminUser = await User.create({
      name: 'P4 Admin Sharma',
      email: 'p4_adm@smartcity.gov',
      password: 'Password@123',
      role: 'admin',
      isApproved: true,
      isActive: true
    });

    // Obtain JWT tokens
    const cRes = await request(app).post('/api/auth/login').send({
      email: 'p4_cit@smartcity.gov',
      password: 'Password@123'
    });
    citizenToken = cRes.body.data.accessToken;

    const pRes = await request(app).post('/api/auth/login').send({
      email: 'p4_pol@smartcity.gov',
      password: 'Password@123'
    });
    policeToken = pRes.body.data.accessToken;

    const eRes = await request(app).post('/api/auth/login').send({
      email: 'p4_emg@smartcity.gov',
      password: 'Password@123'
    });
    emergencyToken = eRes.body.data.accessToken;

    const aRes = await request(app).post('/api/auth/login').send({
      email: 'p4_adm@smartcity.gov',
      password: 'Password@123'
    });
    adminToken = aRes.body.data.accessToken;

    // Create an active critical incident for command center & escalations
    testIncident = await Incident.create({
      title: 'Major Multi-Vehicle Collision at MG Road Junction',
      category: 'Road Accident',
      description: 'Three cars collided blocking both lanes near MG Road Metro Station.',
      severity: 'critical',
      location: {
        type: 'Point',
        coordinates: [77.6095, 12.9754]
      },
      address: 'MG Road Junction near Metro Station',
      city: 'Bengaluru',
      zone: testZone._id,
      status: 'submitted',
      verificationStatus: 'pending',
      reportedBy: citizenUser._id
    });
  });

  afterAll(async () => {
    // Cleanup generated Phase 4 records
    if (testIncident) await Incident.findByIdAndDelete(testIncident._id);
    await OfficerShift.deleteMany({ officer: policeUser._id });
    await EscalationEvent.deleteMany({ incident: testIncident._id });
    await EmergencyRequest.deleteMany({ callerPhone: '9888877777' });
    await CitizenFeedback.deleteMany({ submittedBy: citizenUser._id });
    await User.deleteMany({
      email: {
        $in: [
          'p4_cit@smartcity.gov',
          'p4_pol@smartcity.gov',
          'p4_emg@smartcity.gov',
          'p4_adm@smartcity.gov'
        ]
      }
    });
    await mongoose.connection.close();
  });

  describe('1. Traffic Police Command Center & Priority Queue', () => {
    it('GET /api/police/command-center returns real-time operational metrics and prioritized stream', async () => {
      const res = await request(app)
        .get('/api/police/command-center')
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data.metrics).toHaveProperty('totalActive');
      expect(res.body.data.metrics).toHaveProperty('criticalIncidents');
      expect(res.body.data.metrics).toHaveProperty('pendingVerification');
      expect(res.body.data.metrics).toHaveProperty('activeOfficersOnDuty');
      expect(Array.isArray(res.body.data.incidents)).toBe(true);
      expect(res.body.data.incidents.length).toBeGreaterThan(0);
      expect(res.body.data.incidents[0]).toHaveProperty('priorityScore');
    });

    it('GET /api/police/command-center forbids unprivileged citizen access', async () => {
      const res = await request(app)
        .get('/api/police/command-center')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/police/priority-queue returns incidents ranked by dynamic priority score', async () => {
      const res = await request(app)
        .get('/api/police/priority-queue?severity=critical')
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('incidents');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.incidents.length).toBeGreaterThan(0);
      expect(res.body.data.incidents[0].severity).toBe('critical');
      expect(typeof res.body.data.incidents[0].priorityScore).toBe('number');
    });
  });

  describe('2. Officer Shift Management & Conflict Detection', () => {
    const shiftStart = new Date(Date.now() + 3600000); // 1 hour from now
    const shiftEnd = new Date(Date.now() + 28800000); // 8 hours later

    it('POST /api/police/shifts schedules a new shift successfully', async () => {
      const res = await request(app)
        .post('/api/police/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          officer: policeUser._id.toString(),
          shiftType: 'morning',
          shiftStart: shiftStart.toISOString(),
          shiftEnd: shiftEnd.toISOString(),
          assignedZone: testZone._id.toString(),
          patrolVehicle: 'KA-04-TR-9001',
          notes: 'Regular morning peak traffic monitoring'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('shiftId');
      expect(res.body.data.shiftId).toMatch(/^SFT-\d{6}-\d{4}$/);
      expect(res.body.data.dutyStatus).toBe('scheduled');
      testShiftId = res.body.data._id;
    });

    it('POST /api/police/shifts detects and blocks overlapping shift conflicts (409 Conflict)', async () => {
      // Overlapping by 3 hours inside the existing shift window
      const overlapStart = new Date(shiftStart.getTime() + 7200000); // +2h
      const overlapEnd = new Date(shiftStart.getTime() + 14400000); // +4h

      const res = await request(app)
        .post('/api/police/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          officer: policeUser._id.toString(),
          shiftType: 'afternoon',
          shiftStart: overlapStart.toISOString(),
          shiftEnd: overlapEnd.toISOString(),
          assignedZone: testZone._id.toString(),
          patrolVehicle: 'KA-04-TR-9002'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Shift conflict detected');
      expect(res.body).toHaveProperty('conflictShift');
    });

    it('GET /api/police/shifts retrieves officer shift roster', async () => {
      const res = await request(app)
        .get(`/api/police/shifts?officerId=${policeUser._id}`)
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shifts.length).toBeGreaterThan(0);
      expect(res.body.data.shifts[0].officer._id.toString()).toBe(policeUser._id.toString());
    });

    it('PUT /api/police/shifts/:id allows officer to update duty status', async () => {
      const res = await request(app)
        .put(`/api/police/shifts/${testShiftId}`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          dutyStatus: 'active',
          notes: 'Officer clocked in for active duty'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dutyStatus).toBe('active');
    });
  });

  describe('3. Automated Escalation Engine', () => {
    it('creates an escalation event and retrieves it via GET /api/police/escalations', async () => {
      // Manually seed an escalation event linked to testIncident
      const escalation = await EscalationEvent.create({
        incident: testIncident._id,
        zone: testZone._id,
        reason: 'critical_pending_timeout',
        escalationLevel: 'supervisor',
        notes: 'Critical incident pending verification exceeding 15 min SLA'
      });
      testEscalationId = escalation._id;

      const res = await request(app)
        .get('/api/police/escalations?status=active')
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.escalations.length).toBeGreaterThan(0);
      expect(res.body.data.escalations[0]).toHaveProperty('escalationId');
    });

    it('PATCH /api/police/escalations/:id/acknowledge updates escalation status', async () => {
      const res = await request(app)
        .patch(`/api/police/escalations/${testEscalationId}/acknowledge`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          actionTaken: 'Duty Inspector dispatched patrol unit BTP-P4-101 to junction'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('acknowledged');
      expect(res.body.data.acknowledgedBy).toBeDefined();
    });

    it('PATCH /api/police/escalations/:id/resolve resolves the escalation', async () => {
      const res = await request(app)
        .patch(`/api/police/escalations/${testEscalationId}/resolve`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          resolutionNotes: 'Patrol unit cleared lane 1 and cordoned area.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolvedBy).toBeDefined();
    });
  });

  describe('4. Citizen Emergency SOS & Dispatches', () => {
    it('POST /api/emergency/requests registers citizen emergency with tracking ID & simulation disclaimer', async () => {
      const res = await request(app)
        .post('/api/emergency/requests')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          emergencyType: 'accident',
          severity: 'critical',
          description: 'Head-on collision, passenger trapped in vehicle',
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'Corporation Circle, Near Hudson Memorial Church',
          callerPhone: '9888877777',
          callerName: 'P4 Citizen Rao',
          casualties: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('requestId');
      expect(res.body.data.requestId).toMatch(/^REQ-\d{6}-\d{4}$/);
      expect(res.body).toHaveProperty('disclaimer');
      expect(res.body.disclaimer).toContain('Simulation Mode');
      testEmergencyRequestId = res.body.data._id;
    });

    it('GET /api/emergency/requests/:id retrieves emergency request details', async () => {
      const res = await request(app)
        .get(`/api/emergency/requests/${testEmergencyRequestId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.request._id.toString()).toBe(testEmergencyRequestId.toString());
    });

    it('POST /api/emergency/dispatches assigns responder unit and initiates dispatch', async () => {
      const res = await request(app)
        .post('/api/emergency/dispatches')
        .set('Authorization', `Bearer ${emergencyToken}`)
        .send({
          emergencyRequest: testEmergencyRequestId.toString(),
          unitIdentifier: 'AMB-108-BLR',
          vehicleType: 'ambulance',
          responderName: 'Paramedic Shreya',
          responderContact: '9988776655',
          currentLatitude: 12.9784,
          currentLongitude: 77.6408,
          notes: 'Ambulance dispatched with life support system'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('dispatchId');
      expect(res.body.data.dispatchId).toMatch(/^DSP-\d{6}-\d{4}$/);
      expect(res.body.data.status).toBe('accepted');
      testDispatchId = res.body.data._id;
    });

    it('PATCH /api/emergency/dispatches/:id/status progresses dispatch lifecycle to completed', async () => {
      // Step 1: En route
      const r1 = await request(app)
        .patch(`/api/emergency/dispatches/${testDispatchId}/status`)
        .set('Authorization', `Bearer ${emergencyToken}`)
        .send({ status: 'en_route', note: 'Approaching Hudson Church intersection' });
      expect(r1.status).toBe(200);
      expect(r1.body.data.status).toBe('en_route');

      // Step 2: Arrived
      const r2 = await request(app)
        .patch(`/api/emergency/dispatches/${testDispatchId}/status`)
        .set('Authorization', `Bearer ${emergencyToken}`)
        .send({ status: 'arrived', note: 'Ambulance arrived at scene' });
      expect(r2.status).toBe(200);
      expect(r2.body.data.status).toBe('arrived');

      // Step 3: Completed
      const r3 = await request(app)
        .patch(`/api/emergency/dispatches/${testDispatchId}/status`)
        .set('Authorization', `Bearer ${emergencyToken}`)
        .send({ status: 'completed', note: 'Patient stabilized and transported to Bowring Hospital' });
      expect(r3.status).toBe(200);
      expect(r3.body.data.status).toBe('completed');

      // Verify parent emergency request transitioned to 'resolved'
      const checkReq = await EmergencyRequest.findById(testEmergencyRequestId);
      expect(checkReq.status).toBe('resolved');
    });
  });

  describe('5. Emergency Route Preemption Simulation', () => {
    it('POST /api/emergency/simulate-route calculates priority travel time reduction and preempted intersections', async () => {
      const res = await request(app)
        .post('/api/emergency/simulate-route')
        .send({
          origin: [77.5946, 12.9716],
          destination: [77.6095, 12.9754]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('disclaimer');
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data.metrics).toHaveProperty('standardMinutes');
      expect(res.body.data.metrics).toHaveProperty('corridorMinutes');
      expect(res.body.data.metrics.corridorMinutes).toBeLessThanOrEqual(res.body.data.metrics.standardMinutes);
      expect(Array.isArray(res.body.data.preemptedIntersections)).toBe(true);
    });
  });

  describe('6. Citizen Post-Incident Feedback & Ratings', () => {
    it('POST /api/feedback submits 1-5 star citizen review for resolved incident', async () => {
      // Mark test incident as resolved first so feedback can be submitted
      testIncident.status = 'resolved';
      testIncident.resolvedAt = new Date();
      testIncident.assignedOfficer = policeUser._id;
      await testIncident.save();

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          incidentId: testIncident._id.toString(),
          rating: 5,
          responseTimeliness: 5,
          officerProfessionalism: 4,
          comment: 'Quick response and cleared the vehicle obstruction promptly!',
          suggestions: 'Keep emergency towing vehicles nearby during peak hours'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('feedbackId');
      expect(res.body.data.feedbackId).toMatch(/^FDB-\d{6}-\d{4}$/);
      expect(res.body.data.rating).toBe(5);
    });

    it('POST /api/feedback enforces 1 feedback per citizen for the same incident (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          incidentId: testIncident._id.toString(),
          rating: 4
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already submitted feedback');
    });

    it('GET /api/feedback/statistics returns aggregated satisfaction analytics', async () => {
      const res = await request(app)
        .get('/api/feedback/statistics')
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data.metrics.totalCount).toBeGreaterThan(0);
      expect(res.body.data.metrics).toHaveProperty('avgRating');
      expect(res.body.data.metrics).toHaveProperty('avgTimeliness');
      expect(res.body.data.metrics).toHaveProperty('avgProfessionalism');
    });
  });
});
