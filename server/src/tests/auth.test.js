require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const CityZone = require('../models/CityZone');

describe('Phase 1: Backend Foundation, Authentication & RBAC Test Suite', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_city_traffic';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Ensure police and citizen test accounts exist
    await User.deleteMany({ email: { $in: ['test_police@smartcity.gov', 'test_citizen@smartcity.gov'] } });

    await User.create({
      name: 'Officer Test Police',
      email: 'test_police@smartcity.gov',
      password: 'Password@123',
      role: 'police',
      badgeNumber: 'TEST-BTP-01',
      isApproved: true,
      isActive: true
    });

    await User.create({
      name: 'Test Citizen Commuter',
      email: 'test_citizen@smartcity.gov',
      password: 'Password@123',
      role: 'citizen',
      isApproved: true,
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Health Check & API Basics', () => {
    it('GET /api/health should return 200 with Bengaluru city metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.city).toBe('Bengaluru');
    });

    it('GET /api/unknown-endpoint should return 404', async () => {
      const res = await request(app).get('/api/non-existent-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Citizen Public Registration', () => {
    const testEmail = `test_citizen_${Date.now()}@example.com`;

    it('POST /api/auth/register should successfully register a new citizen', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Ananya Sharma',
        email: testEmail,
        password: 'Password@123',
        phone: '+91 91234 56789',
        preferredLanguage: 'en',
        notificationRadiusKm: 6
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.role).toBe('citizen'); // STRICTLY citizen
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('POST /api/auth/register should reject duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate Citizen',
        email: testEmail,
        password: 'Password@123'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/register should fail with short password (< 6 chars)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Invalid Password Citizen',
        email: `short_pw_${Date.now()}@example.com`,
        password: '123'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Login, JWT Generation & Refresh Token Rotation', () => {
    let accessToken;
    let refreshToken;

    it('POST /api/auth/login should authenticate Traffic Police account', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test_police@smartcity.gov',
        password: 'Password@123'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('police');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /api/auth/login should reject invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test_police@smartcity.gov',
        password: 'WrongPassword999'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/refresh should perform token rotation and issue new tokens', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken); // Old token replaced!
    });
  });

  describe('4. RBAC Protection & User Profile', () => {
    it('GET /api/auth/me should return user details when Bearer token is provided', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'test_citizen@smartcity.gov',
        password: 'Password@123'
      });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test_citizen@smartcity.gov');
      expect(res.body.data.role).toBe('citizen');
    });

    it('GET /api/auth/me should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

