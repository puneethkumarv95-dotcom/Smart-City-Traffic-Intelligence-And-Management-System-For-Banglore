require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Incident = require('../models/Incident');
const CityZone = require('../models/CityZone');
const IncidentVote = require('../models/IncidentVote');
const IncidentStatusHistory = require('../models/IncidentStatusHistory');
const IncidentAssignment = require('../models/IncidentAssignment');

describe('Phase 2: Comprehensive Incident Management Workflow Test Suite', () => {
  let citizenToken;
  let citizenUser;
  let policeToken;
  let policeUser;
  let adminToken;
  let adminUser;
  let testZone;
  let primaryIncident;
  let duplicateCandidateIncident;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_city_traffic';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Clean up test data
    await User.deleteMany({
      email: { $in: ['inc_cit_p2@smartcity.gov', 'inc_pol_p2@smartcity.gov', 'inc_adm_p2@smartcity.gov'] }
    });
    await Incident.deleteMany({ title: { $regex: /\[PHASE2_TEST\]/ } });

    // Zone
    testZone = await CityZone.findOne({ code: 'HEB-02' });
    if (!testZone) {
      testZone = await CityZone.create({
        name: 'Hebbal Flyover Zone',
        code: 'HEB-02',
        city: 'Bengaluru',
        center: { type: 'Point', coordinates: [77.597, 13.0358] }
      });
    }

    // Users
    citizenUser = await User.create({
      name: 'P2 Citizen Commuter',
      email: 'inc_cit_p2@smartcity.gov',
      password: 'Password@123',
      role: 'citizen',
      isApproved: true,
      isActive: true
    });

    policeUser = await User.create({
      name: 'Inspector P2 Police',
      email: 'inc_pol_p2@smartcity.gov',
      password: 'Password@123',
      role: 'police',
      badgeNumber: 'BTP-P2-01',
      assignedZone: testZone._id,
      department: 'Traffic Central',
      isApproved: true,
      isActive: true
    });

    adminUser = await User.create({
      name: 'Chief Admin P2',
      email: 'inc_adm_p2@smartcity.gov',
      password: 'Password@123',
      role: 'admin',
      isApproved: true,
      isActive: true
    });

    // Tokens
    const cRes = await request(app).post('/api/auth/login').send({
      email: 'inc_cit_p2@smartcity.gov',
      password: 'Password@123'
    });
    citizenToken = cRes.body.data.accessToken;

    const pRes = await request(app).post('/api/auth/login').send({
      email: 'inc_pol_p2@smartcity.gov',
      password: 'Password@123'
    });
    policeToken = pRes.body.data.accessToken;

    const aRes = await request(app).post('/api/auth/login').send({
      email: 'inc_adm_p2@smartcity.gov',
      password: 'Password@123'
    });
    adminToken = aRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Incident Creation & Unique Identifier Generation', () => {
    it('POST /api/incidents creates incident with unique incidentId and coordinates', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[PHASE2_TEST] Massive pothole causing severe vehicle delays',
          category: 'Pothole',
          description: 'A 2-foot crater in the middle lane near Hebbal junction blocking traffic flow.',
          severity: 'high',
          latitude: 13.0358,
          longitude: 77.5970,
          address: 'Hebbal Flyover Junction, Outer Ring Road',
          isAnonymous: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.incidentId).toBeDefined();
      expect(res.body.data.incidentId).toMatch(/^INC-\d{6}-\d{4}$/);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.location.coordinates).toEqual([77.5970, 13.0358]);

      primaryIncident = res.body.data;
    });

    it('POST /api/incidents with multipart media files attaches images and stores them', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', '[PHASE2_TEST] Flooded underpass near Hebbal with evidence')
        .field('category', 'Road Flooding')
        .field('description', 'Water level reaching 2 feet causing car stalling under bridge.')
        .field('severity', 'high')
        .field('latitude', '13.0362')
        .field('longitude', '77.5975')
        .field('address', 'Hebbal Underpass, Bangalore')
        .field('isAnonymous', 'false')
        .attach('media', Buffer.from('fake image content'), 'pothole.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.images.length).toBe(1);
      expect(res.body.data.images[0].url).toMatch(/^\/uploads\/evidence-/);
      expect(res.body.data.isAnonymous).toBe(false);
      expect(res.body.data.reportedBy).toBe(citizenUser._id.toString());
    });

    it('Anonymous reports redact reportedBy for unprivileged users but reveal to police', async () => {
      const anonRes = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[PHASE2_TEST] Anonymous traffic congestion report',
          category: 'Traffic Congestion',
          description: 'Gridlock near Hebbal signal due to signal malfunction.',
          severity: 'medium',
          latitude: 13.0355,
          longitude: 77.5973,
          address: 'Hebbal Flyover Ramp',
          isAnonymous: true
        });

      expect(anonRes.status).toBe(201);
      const anonIncidentId = anonRes.body.data._id;

      // Public / unauthenticated: reportedBy is null
      const pubRes = await request(app).get(`/api/incidents/${anonIncidentId}`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.isAnonymous).toBe(true);
      expect(pubRes.body.data.reportedBy).toBeNull();

      // Police: reportedBy is visible
      const polRes = await request(app)
        .get(`/api/incidents/${anonIncidentId}`)
        .set('Authorization', `Bearer ${policeToken}`);
      expect(polRes.status).toBe(200);
      expect(polRes.body.data.reportedBy).toBeDefined();
      expect(polRes.body.data.reportedBy._id.toString()).toBe(citizenUser._id.toString());
    });

    it('POST /api/incidents with disallowed file type is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', '[PHASE2_TEST] Malicious upload test')
        .field('category', 'Other')
        .field('description', 'Attempting to upload executable script file.')
        .field('severity', 'low')
        .field('latitude', '13.0360')
        .field('longitude', '77.5970')
        .field('address', 'Hebbal Road')
        .attach('media', Buffer.from('console.log("bad")'), 'malicious.js');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only JPEG, PNG, WEBP images and MP4\/WEBM videos are permitted/);
    });

    it('Incident status history is recorded in IncidentStatusHistory collection', async () => {
      const history = await IncidentStatusHistory.find({ incident: primaryIncident._id });
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].newStatus).toBe('submitted');
      expect(history[0].changedByName).toBe(citizenUser.name);
    });
  });

  describe('2. Duplicate Incident Detection Algorithm', () => {
    it('POST /api/incidents/check-duplicates flags similar reports within radius', async () => {
      const res = await request(app)
        .post('/api/incidents/check-duplicates')
        .send({
          category: 'Pothole',
          latitude: 13.0360,
          longitude: 77.5972,
          title: 'Deep pothole on flyover lane',
          description: 'Large crater in road near Hebbal',
          radiusMeters: 1000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasDuplicates).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].confidence).toBeGreaterThan(30);
    });
  });

  describe('3. Citizen "My Reports" & Filtering', () => {
    it('GET /api/incidents/my returns only reports authored by the citizen', async () => {
      const res = await request(app)
        .get('/api/incidents/my')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((inc) => inc.reportedBy.toString() === citizenUser._id.toString())).toBe(true);
    });

    it('GET /api/incidents/:id returns full details and populated zone', async () => {
      const res = await request(app).get(`/api/incidents/${primaryIncident._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.incidentId).toBe(primaryIncident.incidentId);
      expect(res.body.data.zone).toBeDefined();
    });

    it('GET /api/incidents/:id/history returns chronological history list', async () => {
      const res = await request(app).get(`/api/incidents/${primaryIncident._id}/history`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('4. Community Voting with Vote Change Support', () => {
    it('POST /api/incidents/:id/vote records initial confirm vote', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ voteType: 'confirm' });

      expect(res.status).toBe(200);
      expect(res.body.data.confirmationsCount).toBe(1);
      expect(res.body.data.disputesCount).toBe(0);
    });

    it('POST /api/incidents/:id/vote allows changing vote from confirm to dispute', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ voteType: 'dispute' });

      expect(res.status).toBe(200);
      expect(res.body.data.confirmationsCount).toBe(0);
      expect(res.body.data.disputesCount).toBe(1);
    });

    it('Duplicate same-vote attempt returns 400', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/vote`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ voteType: 'dispute' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Police Triage: Verify, Request Info, Assign, and Duplicate Workflow', () => {
    it('POST /api/incidents/:id/request-info changes status to info_requested', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/request-info`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ notes: 'Please provide nearest pillar number or landmark photo.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('info_requested');
      expect(res.body.data.verificationStatus).toBe('info_requested');
    });

    it('POST /api/incidents/:id/verify verifies the report with priority update', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/verify`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ notes: 'Confirmed by patrolling officer.', priority: 'critical' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('verified');
      expect(res.body.data.severity).toBe('critical');
      expect(res.body.data.verificationStatus).toBe('verified');
    });

    it('GET /api/incidents/officers lists available officers with workload count', async () => {
      const res = await request(app)
        .get('/api/incidents/officers')
        .set('Authorization', `Bearer ${policeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].activeAssignmentsCount).toBeDefined();
    });

    it('POST /api/incidents/:id/assign assigns officer and records IncidentAssignment', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/assign`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          officerId: policeUser._id.toString(),
          notes: 'Emergency road repair unit dispatched.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('assigned');
      expect(res.body.data.assignedOfficer).toBe(policeUser._id.toString());

      const assignmentDoc = await IncidentAssignment.findOne({ incident: primaryIncident._id });
      expect(assignmentDoc).toBeDefined();
      expect(assignmentDoc.assignedOfficer.toString()).toBe(policeUser._id.toString());
      expect(assignmentDoc.assignmentStatus).toBe('assigned');
    });

    it('PATCH /api/incidents/:id/status updates progress to in_progress and resolved', async () => {
      // Step to in_progress
      const pRes = await request(app)
        .patch(`/api/incidents/${primaryIncident._id}/status`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ status: 'in_progress', notes: 'Asphalt cold mix application underway.' });

      expect(pRes.status).toBe(200);
      expect(pRes.body.data.status).toBe('in_progress');

      // Step to resolved
      const rRes = await request(app)
        .patch(`/api/incidents/${primaryIncident._id}/status`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ status: 'resolved', notes: 'Road repaired and traffic flow restored.' });

      expect(rRes.status).toBe(200);
      expect(rRes.body.data.status).toBe('resolved');
      expect(rRes.body.data.resolvedAt).toBeDefined();

      const assignmentDoc = await IncidentAssignment.findOne({ incident: primaryIncident._id });
      expect(assignmentDoc.assignmentStatus).toBe('completed');
    });

    it('POST /api/incidents/:id/duplicate links duplicate report to primary', async () => {
      // Create second incident to mark as duplicate
      const secondIncRes = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[PHASE2_TEST] Second report of Hebbal crater',
          category: 'Pothole',
          description: 'Same pothole reported by another driver.',
          severity: 'medium',
          latitude: 13.0359,
          longitude: 77.5971,
          address: 'Hebbal Flyover, Bengaluru'
        });

      const dupId = secondIncRes.body.data._id;

      const markRes = await request(app)
        .post(`/api/incidents/${dupId}/duplicate`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({
          duplicateOf: primaryIncident._id.toString(),
          notes: 'Identical pothole observation on same lane.'
        });

      expect(markRes.status).toBe(200);
      expect(markRes.body.data.status).toBe('duplicate');
      expect(markRes.body.data.duplicateOf.toString()).toBe(primaryIncident._id.toString());
    });

    it('POST /api/incidents/:id/reject rejects an incident with required reason', async () => {
      // Create a candidate incident to reject
      const rejectCandidate = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[PHASE2_TEST] Spurious hazard report to be rejected',
          category: 'Other',
          description: 'Non-existent hazard reported for testing rejection.',
          severity: 'low',
          latitude: 13.0365,
          longitude: 77.5975,
          address: 'Hebbal, Bengaluru'
        });

      const res = await request(app)
        .post(`/api/incidents/${rejectCandidate.body.data._id}/reject`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ reason: 'False alarm verified by ground patrol.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.verificationStatus).toBe('rejected');
    });

    it('Invalid status transition is rejected with 400', async () => {
      // Create fresh submitted incident and attempt premature jump to resolved
      const freshInc = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[PHASE2_TEST] Fresh incident for invalid transition test',
          category: 'Pothole',
          description: 'Testing invalid direct transition.',
          severity: 'low',
          latitude: 13.0360,
          longitude: 77.5970,
          address: 'Hebbal Road'
        });

      const res = await request(app)
        .patch(`/api/incidents/${freshInc.body.data._id}/status`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ status: 'resolved', notes: 'Premature resolution attempt' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid status transition/);
    });

    it('POST /api/incidents/:id/feedback allows citizen to rate resolved incident', async () => {
      const res = await request(app)
        .post(`/api/incidents/${primaryIncident._id}/feedback`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ rating: 5, comments: 'Pothole was patched very quickly, smooth road now.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
    });

    it('POST /api/incidents/:id/feedback fails if incident is not resolved', async () => {
      const unresRes = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: '[PHASE2_TEST] Unresolved incident for feedback test',
          category: 'Pothole',
          description: 'Testing feedback before resolution occurs.',
          latitude: 13.0358,
          longitude: 77.5970,
          address: 'Hebbal, Bengaluru'
        });

      const res = await request(app)
        .post(`/api/incidents/${unresRes.body.data._id}/feedback`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ rating: 4, comments: 'Too early' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Feedback can only be provided once an incident has been resolved/);
    });
  });

  describe('6. Admin Incident Statistics from MongoDB Aggregation', () => {
    it('GET /api/admin/incidents/statistics returns aggregated live numbers', async () => {
      const res = await request(app)
        .get('/api/admin/incidents/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalReports).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categoryBreakdown).toBeDefined();
      expect(res.body.data.zoneBreakdown).toBeDefined();
    });

    it('Citizen cannot access /api/admin/incidents/statistics (RBAC protection)', async () => {
      const res = await request(app)
        .get('/api/admin/incidents/statistics')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
    });
  });
});
