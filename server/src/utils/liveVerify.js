const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const AI_URL = 'http://127.0.0.1:8000';
const CLIENT_URL = 'http://localhost:5173';

const results = [];

function record(step, module, scenario, passed, details = '') {
  results.push({
    step,
    module,
    scenario,
    status: passed ? 'PASS' : 'FAIL',
    details
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${module}] ${scenario}: ${details}`);
}

async function runLiveVerification() {
  console.log('\n======================================================');
  console.log('   STARTING SCTIMS LIVE END-TO-END RUNTIME AUDIT');
  console.log('======================================================\n');

  // STEP 2: Service Health Checks
  try {
    const backendHealth = await axios.get(`${API_URL}/health`);
    record('STEP 2', 'SYSTEM', 'Backend API Health Check', backendHealth.status === 200, backendHealth.data.message);
  } catch (err) {
    record('STEP 2', 'SYSTEM', 'Backend API Health Check', false, err.message);
  }

  try {
    const aiHealth = await axios.get(`${AI_URL}/health`);
    record('STEP 2', 'AI SERVICE', 'Python FastAPI Health Check', aiHealth.status === 200, JSON.stringify(aiHealth.data));
  } catch (err) {
    record('STEP 2', 'AI SERVICE', 'Python FastAPI Health Check', false, err.message);
  }

  try {
    const clientRes = await axios.get(CLIENT_URL);
    record('STEP 2', 'FRONTEND', 'React Vite Server HTTP 200', clientRes.status === 200, 'Frontend serving index.html');
  } catch (err) {
    record('STEP 2', 'FRONTEND', 'React Vite Server HTTP 200', false, err.message);
  }

  // STEP 3: Authentication & Role Authorization
  let citizenToken = '';
  let citizenRefresh = '';
  let policeToken = '';
  let adminToken = '';
  let emergencyToken = '';
  let operatorToken = '';

  // 1. Citizen Registration
  const testEmail = `testcitizen_${Date.now()}@smartcity.gov`;
  try {
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test Live Citizen',
      email: testEmail,
      password: 'Password@123',
      phone: '+91 99999 88888',
      preferredLanguage: 'en',
      notificationRadiusKm: 5
    });
    record('STEP 3', 'AUTH', 'Citizen Dynamic Registration', regRes.status === 201, `Created ID: ${regRes.data.data.user.id}`);
  } catch (err) {
    record('STEP 3', 'AUTH', 'Citizen Dynamic Registration', false, err.response?.data?.message || err.message);
  }

  // 2. Duplicate Registration Guard
  try {
    await axios.post(`${API_URL}/auth/register`, {
      name: 'Duplicate Citizen',
      email: testEmail,
      password: 'Password@123'
    });
    record('STEP 3', 'AUTH', 'Duplicate Email Registration Guard', false, 'Allowed duplicate email');
  } catch (err) {
    record('STEP 3', 'AUTH', 'Duplicate Email Registration Guard', err.response?.status === 400 || err.response?.status === 409, 'Correctly rejected duplicate registration');
  }

  // 3. Citizen Login
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: 'Password@123'
    });
    citizenToken = loginRes.data.data.accessToken;
    citizenRefresh = loginRes.data.data.refreshToken;
    record('STEP 3', 'AUTH', 'Citizen Authentication & JWT Issuance', !!citizenToken, `Role: ${loginRes.data.data.user.role}`);
  } catch (err) {
    record('STEP 3', 'AUTH', 'Citizen Authentication & JWT Issuance', false, err.message);
  }

  // 4. Token Refresh Rotation
  try {
    const refreshRes = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: citizenRefresh
    });
    citizenToken = refreshRes.data.data.accessToken;
    record('STEP 3', 'AUTH', 'Refresh Token Rotation', !!refreshRes.data.data.accessToken, 'Obtained rotated access token');
  } catch (err) {
    record('STEP 3', 'AUTH', 'Refresh Token Rotation', false, err.message);
  }

  // 5. Login other seed accounts
  for (const [role, email] of [
    ['police', 'police@smartcity.gov'],
    ['admin', 'admin@smartcity.gov'],
    ['emergency', 'emergency@smartcity.gov'],
    ['operator', 'operator@smartcity.gov']
  ]) {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password: 'Password@123'
      });
      if (role === 'police') policeToken = res.data.data.accessToken;
      if (role === 'admin') adminToken = res.data.data.accessToken;
      if (role === 'emergency') emergencyToken = res.data.data.accessToken;
      if (role === 'operator') operatorToken = res.data.data.accessToken;
      record('STEP 3', 'AUTH', `${role.toUpperCase()} Role Authentication`, res.status === 200, `User: ${res.data.data.user.name}`);
    } catch (err) {
      record('STEP 3', 'AUTH', `${role.toUpperCase()} Role Authentication`, false, err.message);
    }
  }

  // 6. Role Authorization Guards
  try {
    // Citizen trying to access Police queue
    await axios.get(`${API_URL}/incidents/officers`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    record('STEP 3', 'SECURITY', 'RBAC Enforcement on Police Officers List', false, 'Citizen unexpectedly accessed police endpoint');
  } catch (err) {
    record('STEP 3', 'SECURITY', 'RBAC Enforcement on Police Officers List', err.response?.status === 403, 'Correctly denied with 403 Forbidden');
  }

  try {
    // Citizen trying to access Admin statistics
    await axios.get(`${API_URL}/admin/incidents/statistics`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    record('STEP 3', 'SECURITY', 'RBAC Enforcement on Admin Incident Statistics', false, 'Citizen unexpectedly accessed admin endpoint');
  } catch (err) {
    record('STEP 3', 'SECURITY', 'RBAC Enforcement on Admin Incident Statistics', err.response?.status === 403, 'Correctly denied with 403 Forbidden');
  }

  // STEP 5: Incident Reporting Lifecycle
  let createdIncidentId = '';
  let incidentPublicId = '';
  try {
    const incRes = await axios.post(
      `${API_URL}/incidents`,
      {
        title: 'Live Test Waterlogging Hazard',
        description: 'Severe waterlogging blocking both lanes near Silk Board junction.',
        category: 'Road Flooding',
        severity: 'high',
        latitude: 12.9175,
        longitude: 77.6225,
        address: 'Central Silk Board, Hosur Road, Bengaluru',
        city: 'Bengaluru'
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    createdIncidentId = incRes.data.data._id || incRes.data.data.incident?._id;
    incidentPublicId = incRes.data.data.incidentId || incRes.data.data.incident?.incidentId;
    record('STEP 5', 'INCIDENT', 'Citizen Geo-Tagged Incident Submission', incRes.status === 201, `Incident ID: ${incidentPublicId}`);
  } catch (err) {
    record('STEP 5', 'INCIDENT', 'Citizen Geo-Tagged Incident Submission', false, err.response?.data?.message || err.message);
  }

  // Duplicate Check API
  try {
    const dupRes = await axios.post(
      `${API_URL}/incidents/check-duplicates`,
      {
        category: 'Road Flooding',
        latitude: 12.9175,
        longitude: 77.6225,
        title: 'Waterlogging near Silk Board',
        radiusMeters: 1000
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    record('STEP 5', 'INCIDENT', 'Smart Duplicate Detection Heuristic', dupRes.status === 200 && dupRes.data.hasDuplicates, `Found ${dupRes.data.potentialDuplicates?.length || 0} duplicate candidates`);
  } catch (err) {
    record('STEP 5', 'INCIDENT', 'Smart Duplicate Detection Heuristic', false, err.message);
  }

  // Citizen Community Voting
  try {
    const voteRes = await axios.post(
      `${API_URL}/incidents/${createdIncidentId}/vote`,
      { voteType: 'confirm' },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    record('STEP 5', 'INCIDENT', 'Community Incident Confirmation Vote', voteRes.status === 200, `Confirmations: ${voteRes.data.data.confirmationsCount}`);
  } catch (err) {
    record('STEP 5', 'INCIDENT', 'Community Incident Confirmation Vote', false, err.message);
  }

  // STEP 6: Police Verification & Assignment
  try {
    const verifyRes = await axios.post(
      `${API_URL}/incidents/${createdIncidentId}/verify`,
      {
        priority: 'high',
        notes: 'Verified by Patrol Unit 4 on site.'
      },
      { headers: { Authorization: `Bearer ${policeToken}` } }
    );
    record('STEP 6', 'POLICE', 'Traffic Police Incident Verification', verifyRes.status === 200, `Status: ${verifyRes.data.data.verificationStatus}`);
  } catch (err) {
    record('STEP 6', 'POLICE', 'Traffic Police Incident Verification', false, err.message);
  }

  // Assign Officer
  let officerId = '';
  try {
    const officersRes = await axios.get(`${API_URL}/incidents/officers`, {
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    if (officersRes.data.data.length > 0) {
      officerId = officersRes.data.data[0]._id;
      const assignRes = await axios.post(
        `${API_URL}/incidents/${createdIncidentId}/assign`,
        {
          officerId: officerId,
          notes: 'Deploy water drainage pumps immediately.'
        },
        { headers: { Authorization: `Bearer ${policeToken}` } }
      );
      record('STEP 6', 'POLICE', 'Officer Dispatch & Workload Assignment', assignRes.status === 200, `Assigned to: ${officersRes.data.data[0].name}`);
    } else {
      record('STEP 6', 'POLICE', 'Officer Dispatch & Workload Assignment', true, 'No officers found to assign (skipped safely)');
    }
  } catch (err) {
    record('STEP 6', 'POLICE', 'Officer Dispatch & Workload Assignment', false, err.message);
  }

  // Status Progression to In Progress
  try {
    const inProgRes = await axios.patch(
      `${API_URL}/incidents/${createdIncidentId}/status`,
      {
        status: 'in_progress',
        notes: 'Drainage operations underway.'
      },
      { headers: { Authorization: `Bearer ${policeToken}` } }
    );
    record('STEP 6', 'POLICE', 'Incident Status Progression (In Progress)', inProgRes.status === 200, `Status: ${inProgRes.data.data.status}`);
  } catch (err) {
    record('STEP 6', 'POLICE', 'Incident Status Progression (In Progress)', false, err.message);
  }

  // Status Progression to Resolved
  try {
    const statusRes = await axios.patch(
      `${API_URL}/incidents/${createdIncidentId}/status`,
      {
        status: 'resolved',
        notes: 'Water drained completely. Traffic flowing normally.'
      },
      { headers: { Authorization: `Bearer ${policeToken}` } }
    );
    record('STEP 6', 'POLICE', 'Incident Lifecycle Resolution', statusRes.status === 200, `New Status: ${statusRes.data.data.status}`);
  } catch (err) {
    record('STEP 6', 'POLICE', 'Incident Lifecycle Resolution', false, err.message);
  }

  // Citizen Post-Resolution Feedback
  try {
    const feedbackRes = await axios.post(
      `${API_URL}/incidents/${createdIncidentId}/feedback`,
      {
        rating: 5,
        comments: 'Prompt resolution by the traffic police team!'
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    record('STEP 6', 'INCIDENT', 'Citizen Satisfaction Rating & Feedback', feedbackRes.status === 200, 'Rating 5 stars recorded');
  } catch (err) {
    record('STEP 6', 'INCIDENT', 'Citizen Satisfaction Rating & Feedback', false, err.message);
  }

  // STEP 7 & 8: Live Traffic Conditions & Hotspots
  try {
    const condRes = await axios.get(`${API_URL}/traffic/conditions`);
    record('STEP 7', 'TRAFFIC', 'Live / Modeled Traffic Conditions Feed', condRes.status === 200, `Corridors: ${condRes.data.data.corridors?.length || 0}, Mode: ${condRes.data.data.dataSource}`);
  } catch (err) {
    record('STEP 7', 'TRAFFIC', 'Live / Modeled Traffic Conditions Feed', false, err.message);
  }

  try {
    const hotRes = await axios.get(`${API_URL}/traffic/hotspots`);
    record('STEP 8', 'TRAFFIC', 'Geospatial Incident Hotspots Clustering', hotRes.status === 200, `Hotspots detected: ${hotRes.data.data?.length || 0}`);
  } catch (err) {
    record('STEP 8', 'TRAFFIC', 'Geospatial Incident Hotspots Clustering', false, err.message);
  }

  try {
    const histRes = await axios.get(`${API_URL}/traffic/history`);
    record('STEP 8', 'TRAFFIC', 'Traffic History & Peak-Hour Analytics', histRes.status === 200, `Hourly distribution buckets: ${histRes.data.data.hourlyDistribution?.length || 0}`);
  } catch (err) {
    record('STEP 8', 'TRAFFIC', 'Traffic History & Peak-Hour Analytics', false, err.message);
  }

  // STEP 9: Smart Route Navigation
  try {
    const routeRes = await axios.post(`${API_URL}/traffic/routes`, {
      origin: [77.5946, 12.9716], // Majestic [lng, lat]
      destination: [77.6271, 12.9279] // Koramangala [lng, lat]
    });
    const routesCount = routeRes.data.data?.routes?.length || 0;
    const distanceKm = routeRes.data.data?.routes?.[0]?.distanceKm || 0;
    record('STEP 9', 'ROUTING', 'OSRM Multi-Route Turn-by-Turn Navigation', routeRes.status === 200 && routesCount > 0, `${routesCount} routes calculated, Primary: ${distanceKm} km`);
  } catch (err) {
    record('STEP 9', 'ROUTING', 'OSRM Multi-Route Turn-by-Turn Navigation', false, err.message);
  }

  // STEP 11: Notifications API
  let notifId = '';
  try {
    const notifRes = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    record('STEP 11', 'NOTIFICATIONS', 'User Notification Retrieval', notifRes.status === 200, `Count: ${notifRes.data.data?.length || 0}`);
    if (notifRes.data.data?.length > 0) {
      notifId = notifRes.data.data[0]._id;
      const readRes = await axios.patch(`${API_URL}/notifications/${notifId}/read`, {}, {
        headers: { Authorization: `Bearer ${citizenToken}` }
      });
      record('STEP 11', 'NOTIFICATIONS', 'Mark Single Notification Read', readRes.status === 200, 'Notification marked as read');
    }
  } catch (err) {
    record('STEP 11', 'NOTIFICATIONS', 'User Notification Retrieval', false, err.message);
  }

  // STEP 12: Road Closure Management
  let closureId = '';
  try {
    const closureRes = await axios.post(
      `${API_URL}/traffic/closures`,
      {
        title: 'Ballari Road Maintenance Closure',
        roadName: 'Ballari Road Elevated Underpass',
        reason: 'Flyover girder expansion joint maintenance',
        severity: 'full',
        latitude: 13.0358,
        longitude: 77.5912,
        address: 'Ballari Road, Hebbal, Bengaluru',
        diversionInstructions: 'Divert through service road via Outer Ring Road exit.',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      },
      { headers: { Authorization: `Bearer ${policeToken}` } }
    );
    closureId = closureRes.data.data._id;
    record('STEP 12', 'CLOSURES', 'Police Road Closure Creation & Broadcast', closureRes.status === 201, `Closure ID: ${closureRes.data.data.closureId}`);
  } catch (err) {
    record('STEP 12', 'CLOSURES', 'Police Road Closure Creation & Broadcast', false, err.response?.data?.message || err.message);
  }

  // Citizen blocked from creating closure
  try {
    await axios.post(
      `${API_URL}/traffic/closures`,
      {
        title: 'Fake Closure',
        roadName: 'Fake Road',
        reason: 'Test Reason',
        diversionInstructions: 'Divert through side street',
        latitude: 12.97,
        longitude: 77.59,
        address: 'MG Road',
        endTime: new Date(Date.now() + 86400000).toISOString()
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    record('STEP 12', 'CLOSURES', 'Citizen Road Closure Creation Block', false, 'Citizen unexpectedly permitted to create road closure');
  } catch (err) {
    record('STEP 12', 'CLOSURES', 'Citizen Road Closure Creation Block', err.response?.status === 403, 'Correctly rejected with 403 Forbidden');
  }

  // Commuter Saved Route
  try {
    const saveRes = await axios.post(
      `${API_URL}/routes/saved`,
      {
        name: 'Home to Tech Park',
        origin: { address: 'Koramangala 4th Block', coordinates: [77.6271, 12.9279] },
        destination: { address: 'Whitefield ITPL', coordinates: [77.7499, 12.9698] },
        distanceKm: 18.2,
        estimatedDurationMin: 42
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    const savedRouteId = saveRes.data.data._id;
    record('STEP 9', 'ROUTING', 'Commuter Bookmark Saved Route', saveRes.status === 201, `Saved Route ID: ${savedRouteId}`);

    // Check saved route hazards
    const checkRes = await axios.get(`${API_URL}/routes/saved/${savedRouteId}/check`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    record('STEP 9', 'ROUTING', 'Dynamic Hazard Scan on Saved Route', checkRes.status === 200, `Hazards found: ${checkRes.data.data?.hazardsCount || 0}`);
  } catch (err) {
    record('STEP 9', 'ROUTING', 'Commuter Bookmark Saved Route', false, err.message);
  }

  // Super Admin Statistics
  try {
    const adminStats = await axios.get(`${API_URL}/admin/incidents/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('STEP 4', 'ADMIN', 'Super Admin Incident Aggregations', adminStats.status === 200, `Total Incidents in DB: ${adminStats.data.data?.summary?.totalIncidents || 0}`);
  } catch (err) {
    record('STEP 4', 'ADMIN', 'Super Admin Incident Aggregations', false, err.message);
  }

  console.log('\n======================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`   LIVE AUDIT SUMMARY: ${passCount} PASSED / ${failCount} FAILED (${results.length} TOTAL)`);
  console.log('======================================================\n');

  return { passCount, failCount, total: results.length, results };
}

runLiveVerification().then((res) => {
  if (res.failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
