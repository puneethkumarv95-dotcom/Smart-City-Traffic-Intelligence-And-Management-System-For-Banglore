require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const CityZone = require('../models/CityZone');
const Incident = require('../models/Incident');
const IncidentVote = require('../models/IncidentVote');
const RoadClosure = require('../models/RoadClosure');
const TrafficAlert = require('../models/TrafficAlert');
const SavedRoute = require('../models/SavedRoute');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const connectDB = require('../config/db');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    await connectDB();
    logger.info('--- Clearing Existing Initial Database Collections ---');

    await User.deleteMany({});
    await CityZone.deleteMany({});
    await Incident.deleteMany({});
    await IncidentVote.deleteMany({});
    await RoadClosure.deleteMany({});
    await TrafficAlert.deleteMany({});
    await SavedRoute.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    logger.info('--- Seeding Bengaluru Traffic Zones ---');

    const zonesData = [
      {
        name: 'Majestic Central',
        code: 'MAJ-01',
        city: 'Bengaluru',
        description: 'Kempegowda Bus Station & City Railway Station Central Transport Hub',
        center: {
          type: 'Point',
          coordinates: [77.5713, 12.9767] // [lng, lat]
        },
        radiusKm: 3.5,
        congestionLevel: 'severe'
      },
      {
        name: 'Hebbal Flyover Junction',
        code: 'HEB-02',
        city: 'Bengaluru',
        description: 'Airport corridor & Outer Ring Road intersection bottleneck',
        center: {
          type: 'Point',
          coordinates: [77.597, 13.0358] // [lng, lat]
        },
        radiusKm: 4.0,
        congestionLevel: 'high'
      },
      {
        name: 'Central Silk Board',
        code: 'CSB-03',
        city: 'Bengaluru',
        description: 'Hosur Road, BTM Layout and HSR Layout confluence corridor',
        center: {
          type: 'Point',
          coordinates: [77.6238, 12.9177] // [lng, lat]
        },
        radiusKm: 3.8,
        congestionLevel: 'severe'
      },
      {
        name: 'Whitefield IT Corridor',
        code: 'WTF-04',
        city: 'Bengaluru',
        description: 'ITPB, Hope Farm Junction and Kadugodi tech cluster',
        center: {
          type: 'Point',
          coordinates: [77.75, 12.9698] // [lng, lat]
        },
        radiusKm: 6.0,
        congestionLevel: 'moderate'
      },
      {
        name: 'Electronic City Phase 1 & 2',
        code: 'ELC-05',
        city: 'Bengaluru',
        description: 'Elevated Expressway terminus and industrial tech park',
        center: {
          type: 'Point',
          coordinates: [77.6602, 12.8452] // [lng, lat]
        },
        radiusKm: 5.5,
        congestionLevel: 'moderate'
      },
      {
        name: 'Yelahanka Satellite Town',
        code: 'YLH-06',
        city: 'Bengaluru',
        description: 'North Bengaluru arterial highway and residential sector',
        center: {
          type: 'Point',
          coordinates: [77.5963, 13.1007] // [lng, lat]
        },
        radiusKm: 5.0,
        congestionLevel: 'low'
      }
    ];

    const insertedZones = await CityZone.insertMany(zonesData);
    logger.info(`Seeded ${insertedZones.length} Bengaluru City Zones`);

    const zoneMap = {};
    insertedZones.forEach((z) => {
      zoneMap[z.code] = z._id;
    });

    logger.info('--- Seeding Authorized Demonstration Users (5 Roles) ---');

    const usersData = [
      {
        name: 'Ramesh Kumar (Citizen)',
        email: 'citizen@smartcity.gov',
        password: 'Password@123',
        phone: '+91 98450 11223',
        role: 'citizen',
        isApproved: true,
        isActive: true,
        preferredLanguage: 'en',
        notificationRadiusKm: 5
      },
      {
        name: 'Inspector Suresh Gowda',
        email: 'police@smartcity.gov',
        password: 'Password@123',
        phone: '+91 94808 01001',
        role: 'police',
        badgeNumber: 'BTP-INSP-4029',
        department: 'Bengaluru Traffic Police - Central Division',
        assignedZone: zoneMap['MAJ-01'],
        isApproved: true,
        isActive: true,
        preferredLanguage: 'kn',
        notificationRadiusKm: 10
      },
      {
        name: 'Dr. Priya Narayanan (EMS Lead)',
        email: 'emergency@smartcity.gov',
        password: 'Password@123',
        phone: '+91 98800 10808',
        role: 'emergency',
        badgeNumber: 'EMS-KA-108-01',
        department: '108 GVK Emergency Ambulance Response Dispatch',
        assignedZone: zoneMap['HEB-02'],
        isApproved: true,
        isActive: true,
        preferredLanguage: 'en',
        notificationRadiusKm: 15
      },
      {
        name: 'Venkatesh Rao (Smart Parking Ops)',
        email: 'operator@smartcity.gov',
        password: 'Password@123',
        phone: '+91 99000 55443',
        role: 'operator',
        badgeNumber: 'BBMP-PRK-88',
        department: 'BBMP Smart Mobility & Multi-Level Car Parking',
        assignedZone: zoneMap['CSB-03'],
        isApproved: true,
        isActive: true,
        preferredLanguage: 'en',
        notificationRadiusKm: 5
      },
      {
        name: 'Chief Commissioner Rajesh Varma, IAS',
        email: 'admin@smartcity.gov',
        password: 'Password@123',
        phone: '+91 94480 00001',
        role: 'admin',
        badgeNumber: 'BENGALURU-SMARTCITY-DIR',
        department: 'Smart City Urban Mobility & Transit Directorate',
        isApproved: true,
        isActive: true,
        preferredLanguage: 'en',
        notificationRadiusKm: 30
      }
    ];

    const createdUsers = [];
    for (const u of usersData) {
      const created = await User.create(u);
      createdUsers.push(created);
    }
    logger.info(`Seeded ${createdUsers.length} User Accounts across all 5 user roles`);

    const citizenUser = createdUsers[0];
    const policeUser = createdUsers[1];

    logger.info('--- Seeding Demonstration Road Incidents ---');

    const incidentsData = [
      {
        title: 'Multi-vehicle collision blocking inbound flyover lanes',
        category: 'accident',
        description: 'Two cars and a light commercial vehicle collided on the main ramp towards Kempegowda International Airport. Ambulances on scene.',
        severity: 'critical',
        location: { type: 'Point', coordinates: [77.5975, 13.0360] },
        address: 'Bellary Road, Hebbal Flyover Inbound Ramp, Bengaluru',
        zone: zoneMap['HEB-02'],
        reportedBy: citizenUser._id,
        isAnonymous: false,
        status: 'assigned',
        confirmVotesCount: 14,
        disputeVotesCount: 1,
        assignedTo: {
          officer: policeUser._id,
          officerName: policeUser.name,
          department: policeUser.department,
          assignedAt: new Date(Date.now() - 15 * 60 * 1000),
          notes: 'Emergency tow vehicle dispatched. Diversion active via service road.'
        },
        verifiedBy: {
          officer: policeUser._id,
          officerName: policeUser.name,
          verifiedAt: new Date(Date.now() - 25 * 60 * 1000),
          notes: 'Confirmed by RT Nagar police patrol unit.'
        },
        statusHistory: [
          { status: 'submitted', changedByName: citizenUser.name, actorRole: 'citizen', timestamp: new Date(Date.now() - 35 * 60 * 1000) },
          { status: 'verified', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 25 * 60 * 1000) },
          { status: 'assigned', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 15 * 60 * 1000) }
        ]
      },
      {
        title: 'Deep asphalt sinkhole near metro pillar 142',
        category: 'pothole',
        description: 'Severe road surface collapse due to underground water main leak. Two-wheelers at high risk of skidding.',
        severity: 'high',
        location: { type: 'Point', coordinates: [77.6238, 12.9177] },
        address: 'Central Silk Board Service Road, near Madiwala Underpass',
        zone: zoneMap['CSB-03'],
        reportedBy: citizenUser._id,
        isAnonymous: false,
        status: 'verified',
        confirmVotesCount: 9,
        disputeVotesCount: 0,
        verifiedBy: {
          officer: policeUser._id,
          officerName: policeUser.name,
          verifiedAt: new Date(Date.now() - 45 * 60 * 1000),
          notes: 'BBMP public works department alerted for emergency asphalt patching.'
        },
        statusHistory: [
          { status: 'submitted', changedByName: citizenUser.name, actorRole: 'citizen', timestamp: new Date(Date.now() - 60 * 60 * 1000) },
          { status: 'verified', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 45 * 60 * 1000) }
        ]
      },
      {
        title: 'Traffic signal blackout causing gridlock',
        category: 'signal_failure',
        description: 'Four-way junction signals unpowered due to local transformer trip. Traffic crawling in all directions.',
        severity: 'medium',
        location: { type: 'Point', coordinates: [77.5713, 12.9767] },
        address: 'Anand Rao Circle Junction, Majestic Central',
        zone: zoneMap['MAJ-01'],
        reportedBy: null,
        isAnonymous: true,
        status: 'submitted',
        confirmVotesCount: 6,
        disputeVotesCount: 0,
        statusHistory: [
          { status: 'submitted', changedByName: 'Anonymous Citizen', actorRole: 'citizen', timestamp: new Date(Date.now() - 10 * 60 * 1000) }
        ]
      },
      {
        title: 'Waterlogging under Whitefield railway bridge',
        category: 'flooding',
        description: 'Pre-monsoon localized storm caused 2 feet of stagnant water blocking small vehicles.',
        severity: 'high',
        location: { type: 'Point', coordinates: [77.75, 12.9698] },
        address: 'Whitefield Main Road, Below Kadugodi Railway Bridge',
        zone: zoneMap['WTF-04'],
        reportedBy: citizenUser._id,
        isAnonymous: false,
        status: 'resolved',
        confirmVotesCount: 18,
        disputeVotesCount: 0,
        resolutionDetails: {
          notes: 'BBMP storm drain pump operated; standing water cleared and road reopened.',
          resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          resolvedBy: policeUser._id
        },
        citizenFeedback: {
          rating: 5,
          comments: 'Rapid pumping action by the municipal team. Thank you!',
          submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        statusHistory: [
          { status: 'submitted', changedByName: citizenUser.name, actorRole: 'citizen', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          { status: 'verified', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
          { status: 'assigned', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
          { status: 'in_progress', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
          { status: 'resolved', changedByName: policeUser.name, actorRole: 'police', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        ]
      }
    ];

    const insertedIncidents = await Incident.insertMany(incidentsData);
    logger.info(`Seeded ${insertedIncidents.length} Real-World Bengaluru Demonstration Incidents`);

    logger.info('--- Seeding Authorized Road Closures & Diversions ---');
    const closuresData = [
      {
        title: 'Central Silk Board Metro Interchange Pier Erection',
        roadName: 'Outer Ring Road - Silk Board Junction Slip Road',
        zone: zoneMap['CSB-03'],
        reason: 'Heavy machinery and crane positioning for Namma Metro Yellow/Blue Line interchange',
        diversionInstructions: 'Light motor vehicles diverted via 14th Main HSR Layout Sector 4 towards BTM Ring Road.',
        location: {
          type: 'Point',
          coordinates: [77.6238, 12.9177]
        },
        address: 'Central Silk Board Junction, Hosur Road, Bengaluru',
        startTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        isActive: true,
        severity: 'partial',
        createdBy: policeUser._id,
        createdByName: policeUser.name
      },
      {
        title: 'Hebbal Flyover Airport Ramp Structural Bitumen Re-surfacing',
        roadName: 'Hebbal Flyover Airport-Bound East Ramp',
        zone: zoneMap['HEB-02'],
        reason: 'Emergency bridge expansion joint repair and asphalt micro-surfacing',
        diversionInstructions: 'All Airport and Yelahanka traffic directed under the flyover via Outer Ring Road service carriageway.',
        location: {
          type: 'Point',
          coordinates: [77.597, 13.0358]
        },
        address: 'Hebbal Flyover Junction, Outer Ring Road, Bengaluru',
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
        severity: 'full',
        createdBy: policeUser._id,
        createdByName: policeUser.name
      }
    ];
    const insertedClosures = await RoadClosure.insertMany(closuresData);
    logger.info(`Seeded ${insertedClosures.length} Active Road Closures`);

    logger.info('--- Seeding City-Wide Traffic Advisories & Alerts ---');
    const alertsData = [
      {
        title: 'Severe Rainfall & Flash Waterlogging Advisory',
        message: 'IMD Bengaluru forecasts heavy monsoon precipitation. Water accumulation likely at Bellandur, Silk Board, and Hebbal underpasses. Commuters advised to monitor live traffic grid.',
        severity: 'warning',
        affectedCorridors: ['Outer Ring Road', 'Hosur Road', 'Ballari Road'],
        affectedZones: [zoneMap['CSB-03'], zoneMap['HEB-02']],
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 36 * 60 * 60 * 1000),
        isActive: true,
        issuedBy: policeUser._id,
        issuerName: 'Bengaluru Traffic Police Directorate'
      }
    ];
    const insertedAlerts = await TrafficAlert.insertMany(alertsData);
    logger.info(`Seeded ${insertedAlerts.length} Official Traffic Advisories`);

    logger.info('--- Seeding Commuter Saved Routes ---');
    const savedRoutesData = [
      {
        name: 'Daily Office Commute (Hebbal to Silk Board)',
        user: citizenUser._id,
        origin: {
          address: 'Hebbal Flyover Junction, Outer Ring Road',
          coordinates: [77.597, 13.0358]
        },
        destination: {
          address: 'Hosur Road, Central Silk Board Junction',
          coordinates: [77.6238, 12.9177]
        },
        distanceKm: 18.4,
        estimatedDurationMin: 45,
        alertRadiusKm: 1.5,
        isMonitored: true,
        notes: 'Tech park corridor via Marathahalli & Bellandur'
      }
    ];
    const insertedRoutes = await SavedRoute.insertMany(savedRoutesData);
    logger.info(`Seeded ${insertedRoutes.length} Citizen Saved Commuter Routes`);

    logger.info('--- Seeding Initial Citizen Notifications ---');
    const notificationsData = [
      {
        user: citizenUser._id,
        title: 'Road Closure Alert on Your Saved Route',
        message: 'Central Silk Board Metro interchange closure is active on Outer Ring Road. Diversion via HSR 14th Main.',
        type: 'road_closure',
        severity: 'warning',
        location: { type: 'Point', coordinates: [77.6238, 12.9177] },
        relatedClosure: insertedClosures[0]._id,
        isRead: false
      },
      {
        user: citizenUser._id,
        title: 'Incident Verified in Hebbal',
        message: 'Your reported road hazard has been verified by Inspector Suresh Gowda and dispatched to field repair.',
        type: 'incident_verified',
        severity: 'info',
        location: { type: 'Point', coordinates: [77.597, 13.0358] },
        relatedIncident: insertedIncidents[0]._id,
        isRead: false
      }
    ];
    await Notification.insertMany(notificationsData);
    logger.info(`Seeded ${notificationsData.length} Live In-App Notifications`);

    // Audit Log
    await AuditLog.create({
      actor: null,
      actorEmail: 'system',
      actorRole: 'system',
      action: 'SYSTEM_DATABASE_SEEDED',
      resourceType: 'Database',
      resourceId: 'ALL',
      details: {
        zonesSeeded: insertedZones.length,
        usersSeeded: createdUsers.length,
        incidentsSeeded: insertedIncidents.length,
        closuresSeeded: insertedClosures.length,
        alertsSeeded: insertedAlerts.length,
        city: 'Bengaluru'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Seed-Script/3.0'
    });

    logger.info('=======================================================');
    logger.info('  DATABASE RE-SEEDED SUCCESSFULLY WITH PHASE 3 TRAFFIC & MAPS');
    logger.info('=======================================================');

    process.exit(0);
  } catch (error) {
    logger.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
