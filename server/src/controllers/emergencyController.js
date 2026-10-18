const mongoose = require('mongoose');
const EmergencyRequest = require('../models/EmergencyRequest');
const EmergencyDispatch = require('../models/EmergencyDispatch');
const AuditLog = require('../models/AuditLog');
const { calculateRoutes } = require('../services/routingService');
const logger = require('../utils/logger');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Educational simulation disclaimer constant
 */
const SIMULATION_DISCLAIMER =
  'Simulation Mode: In-app emergency requests do not dispatch real municipal responders. Call 112 / 108 / 100 for actual life-threatening emergencies.';

/**
 * @desc Create citizen Emergency SOS Request
 * @route POST /api/emergency/requests
 * @access Public / Citizen
 */
const createEmergencyRequest = async (req, res, next) => {
  try {
    const {
      emergencyType = 'accident',
      description,
      latitude,
      longitude,
      address,
      callerPhone,
      callerName,
      severity = 'critical',
      vehicleInfo = '',
      casualties = 0
    } = req.body;

    const requestedBy = req.user ? req.user._id : null;
    const finalCallerName = req.user ? req.user.name : callerName || 'Citizen';

    const emergencyRequest = await EmergencyRequest.create({
      requestedBy,
      callerName: finalCallerName,
      callerPhone,
      emergencyType,
      severity,
      description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      address,
      vehicleInfo,
      casualties: parseInt(casualties, 10) || 0,
      status: 'pending',
      isSimulation: true,
      simulationDisclaimer: SIMULATION_DISCLAIMER
    });

    // Audit log
    await AuditLog.create({
      action: 'EMERGENCY_REQUEST_CREATED',
      performedBy: requestedBy,
      role: req.user ? req.user.role : 'citizen',
      targetEntity: 'EmergencyRequest',
      targetId: emergencyRequest._id,
      details: {
        requestId: emergencyRequest.requestId,
        emergencyType,
        severity,
        address
      }
    });

    // Real-time notification to emergency responders and police
    const io = req.app.get('io');
    if (io) {
      const payload = {
        _id: emergencyRequest._id,
        requestId: emergencyRequest.requestId,
        emergencyType: emergencyRequest.emergencyType,
        severity: emergencyRequest.severity,
        description: emergencyRequest.description,
        address: emergencyRequest.address,
        location: emergencyRequest.location,
        callerPhone: emergencyRequest.callerPhone,
        callerName: emergencyRequest.callerName,
        createdAt: emergencyRequest.createdAt,
        isSimulation: true
      };
      io.to('role:emergency').emit('emergency:new', payload);
      io.to('role:police').emit('emergency:new', payload);
      io.to('channel:public-traffic').emit('emergency:alert', {
        requestId: emergencyRequest.requestId,
        type: emergencyRequest.emergencyType,
        address: emergencyRequest.address
      });
    }

    res.status(201).json({
      success: true,
      message: 'Emergency request registered in simulation system.',
      disclaimer: SIMULATION_DISCLAIMER,
      data: emergencyRequest
    });
  } catch (error) {
    logger.error(`Error creating emergency request: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get list of emergency requests with status and type filters
 * @route GET /api/emergency/requests
 * @access Private (Emergency Responder, Traffic Police, Admin)
 */
const getEmergencyRequests = async (req, res, next) => {
  try {
    const { status, emergencyType, severity, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (emergencyType) filter.emergencyType = emergencyType;
    if (severity) filter.severity = severity;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      EmergencyRequest.find(filter)
        .populate('requestedBy', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EmergencyRequest.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    logger.error(`Error fetching emergency requests: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get a single emergency request by ID or tracking code
 * @route GET /api/emergency/requests/:id
 * @access Public / Authenticated (Citizen with tracking code, Responders, Police, Admin)
 */
const getEmergencyRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = {};

    if (isValidObjectId(id)) {
      query._id = id;
    } else {
      query.requestId = id;
    }

    const request = await EmergencyRequest.findOne(query).populate('requestedBy', 'name phone email');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found.'
      });
    }

    // Fetch any associated dispatches
    const dispatches = await EmergencyDispatch.find({ emergencyRequest: request._id })
      .populate('responder', 'name badgeNumber phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        request,
        dispatches
      }
    });
  } catch (error) {
    logger.error(`Error fetching emergency request: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Assign responder unit and dispatch to an emergency request
 * @route POST /api/emergency/dispatches
 * @access Private (Emergency Responder, Police, Admin)
 */
const createDispatch = async (req, res, next) => {
  try {
    const {
      emergencyRequest: reqId,
      unitIdentifier,
      vehicleType = 'ambulance',
      responderName,
      responderContact,
      currentLatitude,
      currentLongitude,
      notes = ''
    } = req.body;

    const emReq = await EmergencyRequest.findById(reqId);
    if (!emReq) {
      return res.status(404).json({
        success: false,
        message: 'Target emergency request not found.'
      });
    }

    // Responder coordinates
    const startLng = parseFloat(currentLongitude);
    const startLat = parseFloat(currentLatitude);
    const destLng = emReq.location.coordinates[0];
    const destLat = emReq.location.coordinates[1];

    // Compute route and ETA using routingService
    let routeResult = null;
    let distanceKm = 0;
    let estimatedMinutes = 10;
    let routeGeometry = null;

    try {
      const routeData = await calculateRoutes({
        origin: [startLng, startLat],
        destination: [destLng, destLat]
      });
      const routesList = routeData?.routes || [];
      if (routesList.length > 0) {
        routeResult = routesList[0];
        distanceKm = routeResult.distanceKm;
        const baseDuration = routeResult.estimatedDurationMin || routeResult.durationMinutes || 15;
        // Priority vehicle gets ~35% time savings
        estimatedMinutes = Math.max(2, Math.round(baseDuration * 0.65));
        routeGeometry = routeResult.geometry;
      }
    } catch (routeErr) {
      logger.warn(`Could not calculate dispatch route: ${routeErr.message}`);
    }

    const estimatedArrival = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    const dispatch = await EmergencyDispatch.create({
      emergencyRequest: emReq._id,
      responder: req.user._id,
      unitIdentifier,
      vehicleType,
      responderName: responderName || req.user.name,
      responderContact: responderContact || req.user.phone || 'N/A',
      currentLocation: {
        type: 'Point',
        coordinates: [startLng, startLat]
      },
      destinationLocation: emReq.location,
      status: 'accepted',
      distanceKm,
      estimatedMinutes,
      estimatedArrival,
      routeGeometry,
      notes,
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Dispatch order generated.'
        },
        {
          status: 'accepted',
          timestamp: new Date(),
          note: `Unit ${unitIdentifier} accepted dispatch.`
        }
      ]
    });

    // Update emergency request status
    emReq.status = 'dispatched';
    await emReq.save();

    // Audit Log
    await AuditLog.create({
      action: 'EMERGENCY_DISPATCHED',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'EmergencyDispatch',
      targetId: dispatch._id,
      details: {
        dispatchId: dispatch.dispatchId,
        unit: unitIdentifier,
        requestId: emReq.requestId
      }
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('role:emergency').emit('dispatch:new', dispatch);
      io.to('role:police').emit('dispatch:new', dispatch);
      if (emReq.requestedBy) {
        io.to(`user:${emReq.requestedBy.toString()}`).emit('emergency:update', {
          requestId: emReq.requestId,
          status: 'dispatched',
          dispatch
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Emergency dispatch unit ${unitIdentifier} deployed successfully.`,
      disclaimer: SIMULATION_DISCLAIMER,
      data: dispatch
    });
  } catch (error) {
    logger.error(`Error creating dispatch: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Update dispatch lifecycle status (accepted -> en_route -> arrived -> completed)
 * @route PATCH /api/emergency/dispatches/:id/status
 * @access Private (Emergency Responder, Police, Admin)
 */
const updateDispatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, latitude, longitude, note } = req.body;

    const dispatch = await EmergencyDispatch.findById(id).populate('emergencyRequest');
    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch record not found.'
      });
    }

    const VALID_STATUSES = ['pending', 'accepted', 'en_route', 'arrived', 'completed', 'cancelled'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`
      });
    }

    dispatch.status = status;

    if (latitude !== undefined && longitude !== undefined) {
      dispatch.currentLocation = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    if (status === 'completed') {
      dispatch.actualArrival = new Date();
      // Also resolve parent emergency request
      if (dispatch.emergencyRequest) {
        await EmergencyRequest.findByIdAndUpdate(dispatch.emergencyRequest._id, {
          status: 'resolved'
        });
      }
    } else if (status === 'arrived') {
      dispatch.actualArrival = new Date();
    }

    dispatch.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Unit transitioned status to ${status}.`
    });

    await dispatch.save();

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to('role:emergency').emit('dispatch:update', dispatch);
      io.to('role:police').emit('dispatch:update', dispatch);
      if (dispatch.emergencyRequest && dispatch.emergencyRequest.requestedBy) {
        io.to(`user:${dispatch.emergencyRequest.requestedBy.toString()}`).emit('emergency:update', {
          requestId: dispatch.emergencyRequest.requestId,
          status,
          dispatch
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Dispatch status updated to ${status}.`,
      data: dispatch
    });
  } catch (error) {
    logger.error(`Error updating dispatch status: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get all dispatches
 * @route GET /api/emergency/dispatches
 * @access Private (Emergency Responder, Police, Admin)
 */
const getDispatches = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [dispatches, total] = await Promise.all([
      EmergencyDispatch.find(filter)
        .populate('emergencyRequest')
        .populate('responder', 'name badgeNumber phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EmergencyDispatch.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        dispatches,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    logger.error(`Error fetching dispatches: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Simulate emergency corridor routing with siren-preemption and signal clearance
 * @route POST /api/emergency/simulate-route
 * @access Public / Authenticated (Simulation educational tool)
 */
const simulateEmergencyRoute = async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination || origin.length !== 2 || destination.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination must be valid [longitude, latitude] arrays.'
      });
    }

    const routeData = await calculateRoutes({ origin, destination });
    const primaryRoute = routeData?.routes?.[0] || null;

    if (!primaryRoute) {
      return res.status(404).json({
        success: false,
        message: 'Unable to calculate emergency route for the specified coordinates.'
      });
    }

    const standardMinutes = primaryRoute.estimatedDurationMin || primaryRoute.durationMinutes || 15;
    // Emergency siren & dynamic green-light corridor saves approx 40% travel time
    const corridorMinutes = Math.max(2, Math.round(standardMinutes * 0.6));
    const timeSavedMinutes = Math.max(1, standardMinutes - corridorMinutes);

    // Extract intersection preemption points along the route geometry
    const coords = primaryRoute.geometry.coordinates;
    const preemptedIntersections = [];
    // Sample every 4th coordinate or vertex as a simulated traffic signal intersection
    for (let i = 2; i < coords.length - 1; i += Math.max(3, Math.floor(coords.length / 5))) {
      preemptedIntersections.push({
        intersectionId: `SIG-COR-${1000 + i}`,
        coordinates: coords[i],
        signalStatus: 'FORCED_GREEN_PREEMPTION',
        holdDurationSeconds: 120,
        name: `Interchange Corridor Node #${preemptedIntersections.length + 1}`
      });
    }

    res.status(200).json({
      success: true,
      disclaimer: SIMULATION_DISCLAIMER,
      data: {
        route: primaryRoute,
        metrics: {
          distanceKm: primaryRoute.distanceKm,
          standardMinutes,
          corridorMinutes,
          timeSavedMinutes,
          preemptedIntersectionCount: preemptedIntersections.length
        },
        preemptedIntersections
      }
    });
  } catch (error) {
    logger.error(`Error simulating emergency route: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createEmergencyRequest,
  getEmergencyRequests,
  getEmergencyRequestById,
  createDispatch,
  updateDispatchStatus,
  getDispatches,
  simulateEmergencyRoute,
  SIMULATION_DISCLAIMER
};
