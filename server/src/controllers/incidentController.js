const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const IncidentVote = require('../models/IncidentVote');
const IncidentStatusHistory = require('../models/IncidentStatusHistory');
const IncidentAssignment = require('../models/IncidentAssignment');
const CityZone = require('../models/CityZone');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { findDuplicates } = require('../services/duplicateDetectionService');
const logger = require('../utils/logger');

// Helper to check valid Mongo ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Valid allowed status transitions
 */
const ALLOWED_TRANSITIONS = {
  submitted: ['under_review', 'verified', 'rejected', 'duplicate', 'info_requested'],
  under_review: ['verified', 'rejected', 'duplicate', 'info_requested', 'submitted'],
  info_requested: ['submitted', 'under_review', 'rejected', 'duplicate'],
  verified: ['assigned', 'in_progress', 'rejected', 'duplicate'],
  assigned: ['in_progress', 'assigned', 'resolved', 'rejected'],
  in_progress: ['resolved', 'assigned', 'under_review'],
  resolved: ['under_review'], // Reopening requires administrative review
  rejected: ['under_review'],
  duplicate: ['under_review']
};

/**
 * @desc Create a new incident report
 * @route POST /api/incidents
 * @access Public / Authenticated Citizen
 */
const createIncident = async (req, res, next) => {
  try {
    const {
      title,
      category,
      description,
      severity = 'medium',
      latitude,
      longitude,
      address,
      city = 'Bengaluru',
      zoneId,
      isAnonymous = false
    } = req.body;

    // Separate images and videos
    const images = [];
    const videos = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const isVideo = file.mimetype.startsWith('video/');
        const mediaObj = {
          url: `/uploads/${file.filename}`,
          publicId: file.filename,
          caption: file.originalname
        };
        if (isVideo) {
          videos.push(mediaObj);
        } else {
          images.push(mediaObj);
        }
      });
    }

    // Determine Zone automatically via geospatial proximity if not provided
    let matchedZone = zoneId && isValidObjectId(zoneId) ? zoneId : null;
    if (!matchedZone) {
      const nearestZone = await CityZone.findOne({
        center: {
          $near: {
            $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
            $maxDistance: 15000 // 15km
          }
        }
      });
      if (nearestZone) {
        matchedZone = nearestZone._id;
      }
    }

    const isAnon = isAnonymous === true || isAnonymous === 'true';
    const reporterUser = req.user ? req.user._id : null;
    const reporterName = !isAnon && req.user ? req.user.name : 'Anonymous Citizen';
    const actorRole = req.user ? req.user.role : 'citizen';

    // Automatic Severity Safeguards (Critical incidents expire later and trigger notifications)
    const expiryHours = severity === 'critical' ? 72 : severity === 'high' ? 48 : 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const incident = await Incident.create({
      title,
      category,
      description,
      severity,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)] // [lng, lat]
      },
      address,
      city,
      zone: matchedZone,
      reportedBy: reporterUser,
      isAnonymous: isAnon,
      reporterIp: req.ip || '',
      status: 'submitted',
      verificationStatus: 'pending',
      images,
      videos,
      expiresAt
    });

    // Record initial status history in dedicated collection
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus: null,
      newStatus: 'submitted',
      changedBy: reporterUser,
      changedByName: reporterName,
      actorRole,
      notes: 'Initial hazard report submission.',
      timestamp: new Date()
    });

    // Populate zone for rich client response
    await incident.populate('zone', 'name code congestionLevel');

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:new', incident);
      io.to('role:police').emit('incident:police_alert', {
        id: incident._id,
        incidentId: incident.incidentId,
        title: incident.title,
        severity: incident.severity,
        category: incident.category,
        address: incident.address
      });
    }

    // Audit Log
    await AuditLog.create({
      actor: reporterUser,
      actorEmail: req.user ? req.user.email : 'anonymous',
      actorRole,
      action: 'INCIDENT_REPORTED',
      resourceType: 'Incident',
      resourceId: incident._id.toString(),
      details: {
        incidentId: incident.incidentId,
        title: incident.title,
        category: incident.category,
        severity: incident.severity,
        isAnonymous: incident.isAnonymous
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    const isOfficerOrAdmin = req.user && ['police', 'emergency', 'admin'].includes(req.user.role);
    const returnData = incident.toObject();
    if (isAnon && !isOfficerOrAdmin) {
      returnData.reportedBy = null;
    }

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully and logged in transit queue.',
      data: returnData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Check for potential duplicate incidents before submission
 * @route POST /api/incidents/check-duplicates
 * @access Public / Authenticated
 */
const checkDuplicates = async (req, res, next) => {
  try {
    const { category, latitude, longitude, title, description, radiusMeters = 1000, excludeId } = req.body;

    const duplicates = await findDuplicates({
      category,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      title,
      description,
      radiusMeters: parseInt(radiusMeters, 10),
      excludeId: excludeId && isValidObjectId(excludeId) ? excludeId : null
    });

    res.json({
      success: true,
      count: duplicates.length,
      hasDuplicates: duplicates.length > 0,
      data: duplicates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all incidents with filtering & pagination
 * @route GET /api/incidents
 * @access Public
 */
const getIncidents = async (req, res, next) => {
  try {
    const {
      status,
      verificationStatus,
      severity,
      category,
      zone,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isArchived: false };

    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (severity) query.severity = severity;
    if (category) query.category = category;
    if (zone && isValidObjectId(zone)) query.zone = zone;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { incidentId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .populate('zone', 'name code congestionLevel')
        .populate('reportedBy', 'name email role')
        .populate('assignedOfficer', 'name badgeNumber department phone')
        .populate('duplicateOf', 'incidentId title status')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Incident.countDocuments(query)
    ]);

    // Redact private reporter identities for anonymous reports if unprivileged
    const isOfficerOrAdmin = req.user && ['police', 'emergency', 'admin'].includes(req.user.role);
    const safeIncidents = incidents.map((inc) => {
      const obj = inc.toObject();
      if (obj.isAnonymous && !isOfficerOrAdmin) {
        obj.reportedBy = null;
      }
      return obj;
    });

    res.json({
      success: true,
      data: safeIncidents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get citizen's own submitted reports
 * @route GET /api/incidents/my
 * @access Private (Authenticated Citizen)
 */
const getMyIncidents = async (req, res, next) => {
  try {
    const { status, category, severity, search, page = 1, limit = 20 } = req.query;

    const query = {
      reportedBy: req.user._id,
      isArchived: false
    };

    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;

    if (search) {
      query.$or = [
        { incidentId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .populate('zone', 'name code')
        .populate('assignedOfficer', 'name badgeNumber department')
        .populate('duplicateOf', 'incidentId title status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Incident.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: incidents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get nearby incidents using GeoJSON 2dsphere
 * @route GET /api/incidents/nearby
 * @access Public
 */
const getNearbyIncidents = async (req, res, next) => {
  try {
    const { longitude, latitude, radiusMeters = 5000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude query parameters are required.'
      });
    }

    const incidents = await Incident.find({
      isArchived: false,
      status: { $nin: ['resolved', 'rejected', 'duplicate'] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radiusMeters, 10)
        }
      }
    })
      .populate('zone', 'name code')
      .limit(50);

    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get list of officers with workload count for assignment interface
 * @route GET /api/incidents/officers
 * @access Private (Police / Admin)
 */
const getAvailableOfficers = async (req, res, next) => {
  try {
    const { zoneId } = req.query;

    const filter = {
      role: { $in: ['police', 'emergency'] },
      isActive: true,
      isApproved: true
    };

    if (zoneId && isValidObjectId(zoneId)) {
      filter.assignedZone = zoneId;
    }

    const officers = await User.find(filter)
      .populate('assignedZone', 'name code')
      .select('name email phone role badgeNumber department assignedZone');

    // Calculate active assigned workload for each officer
    const officerIds = officers.map((o) => o._id);
    const workloads = await Incident.aggregate([
      {
        $match: {
          assignedOfficer: { $in: officerIds },
          status: { $in: ['assigned', 'in_progress'] }
        }
      },
      {
        $group: {
          _id: '$assignedOfficer',
          activeAssignmentsCount: { $sum: 1 }
        }
      }
    ]);

    const workloadMap = {};
    workloads.forEach((w) => {
      workloadMap[w._id.toString()] = w.activeAssignmentsCount;
    });

    const officersWithWorkload = officers.map((officer) => ({
      ...officer.toObject(),
      activeAssignmentsCount: workloadMap[officer._id.toString()] || 0
    }));

    res.json({
      success: true,
      count: officersWithWorkload.length,
      data: officersWithWorkload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get incident by ID
 * @route GET /api/incidents/:id
 * @access Public
 */
const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = {};
    if (isValidObjectId(id)) {
      query._id = id;
    } else {
      query.incidentId = id;
    }

    const incident = await Incident.findOne(query)
      .populate('zone')
      .populate('reportedBy', 'name email role phone')
      .populate('assignedOfficer', 'name badgeNumber department phone')
      .populate('duplicateOf', 'incidentId title status');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident record not found.'
      });
    }

    // Redact private info if anonymous
    const isOfficerOrAdmin = req.user && ['police', 'emergency', 'admin'].includes(req.user.role);
    const resultObj = incident.toObject();
    if (resultObj.isAnonymous && !isOfficerOrAdmin) {
      resultObj.reportedBy = null;
    }

    res.json({
      success: true,
      data: resultObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get incident lifecycle status history
 * @route GET /api/incidents/:id/history
 * @access Public
 */
const getIncidentHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    let incidentObjectId = id;
    if (!isValidObjectId(id)) {
      const inc = await Incident.findOne({ incidentId: id }).select('_id');
      if (!inc) {
        return res.status(404).json({ success: false, message: 'Incident not found' });
      }
      incidentObjectId = inc._id;
    }

    const history = await IncidentStatusHistory.find({ incident: incidentObjectId })
      .populate('changedBy', 'name role')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Verify incident report
 * @route POST /api/incidents/:id/verify
 * @access Private (Police / Admin)
 */
const verifyIncident = async (req, res, next) => {
  try {
    const { notes, priority } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const previousStatus = incident.status;
    incident.status = 'verified';
    incident.verificationStatus = 'verified';
    if (priority) {
      incident.severity = priority;
    }

    await incident.save();

    // Record Status History
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus,
      newStatus: 'verified',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      notes: notes || 'Incident verified by traffic authority.',
      timestamp: new Date()
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:verified', incident);
    }

    // Audit Log
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'INCIDENT_VERIFIED',
      resourceType: 'Incident',
      resourceId: incident._id.toString(),
      details: { incidentId: incident.incidentId, notes, priority },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: 'Incident verified successfully.',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Reject incident report
 * @route POST /api/incidents/:id/reject
 * @access Private (Police / Admin)
 */
const rejectIncident = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const previousStatus = incident.status;
    incident.status = 'rejected';
    incident.verificationStatus = 'rejected';
    incident.resolutionNotes = `Rejected: ${reason}`;

    await incident.save();

    // Record Status History
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus,
      newStatus: 'rejected',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      notes: `Rejected: ${reason}`,
      timestamp: new Date()
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:status_changed', incident);
    }

    // Audit Log
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'INCIDENT_REJECTED',
      resourceType: 'Incident',
      resourceId: incident._id.toString(),
      details: { incidentId: incident.incidentId, reason },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: 'Incident rejected.',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Request additional information on incident
 * @route POST /api/incidents/:id/request-info
 * @access Private (Police / Admin)
 */
const requestAdditionalInfo = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const previousStatus = incident.status;
    incident.status = 'info_requested';
    incident.verificationStatus = 'info_requested';

    await incident.save();

    // Record Status History
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus,
      newStatus: 'info_requested',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      notes: notes || 'Additional information requested by officer.',
      timestamp: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:status_changed', incident);
    }

    res.json({
      success: true,
      message: 'Additional information requested from reporter.',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Assign incident to officer / patrol unit
 * @route POST /api/incidents/:id/assign
 * @access Private (Police / Admin)
 */
const assignIncident = async (req, res, next) => {
  try {
    const { officerId, notes } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const assignedOfficer = await User.findById(officerId);
    if (!assignedOfficer) {
      return res.status(404).json({ success: false, message: 'Assignee officer not found' });
    }

    const previousStatus = incident.status;
    incident.status = 'assigned';
    incident.assignedOfficer = assignedOfficer._id;

    await incident.save();

    // Create assignment entry
    await IncidentAssignment.create({
      incident: incident._id,
      assignedOfficer: assignedOfficer._id,
      assignedBy: req.user._id,
      assignedDate: new Date(),
      assignmentStatus: 'assigned',
      notes: notes || ''
    });

    // Record Status History
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus,
      newStatus: 'assigned',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      notes: `Assigned to ${assignedOfficer.name} (${assignedOfficer.badgeNumber || 'Officer'}). ${notes || ''}`,
      timestamp: new Date()
    });

    // Socket.io alerts
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:assigned', incident);
      io.to(`user:${assignedOfficer._id.toString()}`).emit('incident:duty_assigned', incident);
    }

    // Audit Log
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'INCIDENT_ASSIGNED',
      resourceType: 'Incident',
      resourceId: incident._id.toString(),
      details: {
        incidentId: incident.incidentId,
        assignedOfficerId: assignedOfficer._id,
        officerName: assignedOfficer.name,
        notes
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: `Incident assigned to ${assignedOfficer.name} successfully.`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark incident as duplicate of another incident
 * @route POST /api/incidents/:id/duplicate
 * @access Private (Police / Admin)
 */
const markDuplicate = async (req, res, next) => {
  try {
    const { duplicateOf, notes } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const targetOriginal = await Incident.findById(duplicateOf);
    if (!targetOriginal) {
      return res.status(404).json({ success: false, message: 'Original incident target not found' });
    }

    const previousStatus = incident.status;
    incident.status = 'duplicate';
    incident.duplicateOf = targetOriginal._id;
    incident.resolutionNotes = `Marked duplicate of ${targetOriginal.incidentId}. ${notes || ''}`;

    await incident.save();

    // Record Status History
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus,
      newStatus: 'duplicate',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      notes: `Linked as duplicate of ${targetOriginal.incidentId}. ${notes || ''}`,
      timestamp: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:status_changed', incident);
    }

    res.json({
      success: true,
      message: `Incident linked as duplicate of ${targetOriginal.incidentId}.`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update incident status (e.g. in_progress, resolved)
 * @route PATCH /api/incidents/:id/status
 * @access Private (Police / Emergency / Admin)
 */
const updateIncidentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const previousStatus = incident.status;

    // Validate allowed status transition
    const allowedNext = ALLOWED_TRANSITIONS[previousStatus] || [];
    if (!allowedNext.includes(status) && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${previousStatus}' to '${status}'. Allowed: ${allowedNext.join(', ')}`
      });
    }

    incident.status = status;

    if (status === 'resolved') {
      incident.resolvedAt = new Date();
      incident.resolutionNotes = notes || 'Incident resolved and roadway cleared.';

      // Mark assignment completed if one exists
      await IncidentAssignment.updateMany(
        { incident: incident._id, assignmentStatus: { $in: ['assigned', 'in_progress'] } },
        { assignmentStatus: 'completed', completionDate: new Date() }
      );
    } else if (status === 'in_progress') {
      await IncidentAssignment.updateMany(
        { incident: incident._id, assignmentStatus: 'assigned' },
        { assignmentStatus: 'in_progress' }
      );
    }

    await incident.save();

    // Record in History
    await IncidentStatusHistory.create({
      incident: incident._id,
      previousStatus,
      newStatus: status,
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      notes: notes || `Status updated from ${previousStatus} to ${status}.`,
      timestamp: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:status_changed', incident);
    }

    // Audit Log
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'INCIDENT_STATUS_UPDATED',
      resourceType: 'Incident',
      resourceId: incident._id.toString(),
      details: {
        incidentId: incident.incidentId,
        previousStatus,
        newStatus: status,
        notes
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: `Incident status updated to ${status}.`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Community voting with vote-change support
 * @route POST /api/incidents/:id/vote
 * @access Private (Authenticated Citizen)
 */
const voteIncident = async (req, res, next) => {
  try {
    const { voteType } = req.body; // 'confirm' | 'dispute'
    const incidentId = req.params.id;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Check for existing vote by this user
    let existingVote = await IncidentVote.findOne({
      incident: incidentId,
      user: req.user._id
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        return res.status(400).json({
          success: false,
          message: `You have already registered a '${voteType}' vote for this incident.`
        });
      }

      // Vote Change Support!
      const oldVoteType = existingVote.voteType;
      existingVote.voteType = voteType;
      await existingVote.save();

      if (oldVoteType === 'confirm' && voteType === 'dispute') {
        incident.confirmationsCount = Math.max(0, incident.confirmationsCount - 1);
        incident.disputesCount += 1;
      } else if (oldVoteType === 'dispute' && voteType === 'confirm') {
        incident.disputesCount = Math.max(0, incident.disputesCount - 1);
        incident.confirmationsCount += 1;
      }
    } else {
      // First-time vote
      await IncidentVote.create({
        incident: incidentId,
        user: req.user._id,
        voteType,
        voterIp: req.ip || ''
      });

      if (voteType === 'confirm') {
        incident.confirmationsCount += 1;
      } else {
        incident.disputesCount += 1;
      }
    }

    // Heuristic: If 5+ community confirmations occur while submitted, promote to under_review automatically
    if (incident.confirmationsCount >= 5 && incident.status === 'submitted') {
      incident.status = 'under_review';
      await IncidentStatusHistory.create({
        incident: incident._id,
        previousStatus: 'submitted',
        newStatus: 'under_review',
        changedBy: null,
        changedByName: 'Community Consensus Heuristic',
        actorRole: 'system',
        notes: `Promoted to under review after reaching ${incident.confirmationsCount} community confirmations.`
      });
    }

    await incident.save();

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:vote_updated', {
        id: incident._id,
        confirmationsCount: incident.confirmationsCount,
        disputesCount: incident.disputesCount,
        status: incident.status
      });
    }

    res.json({
      success: true,
      message: `Your '${voteType}' vote has been recorded.`,
      data: {
        confirmationsCount: incident.confirmationsCount,
        disputesCount: incident.disputesCount,
        status: incident.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Citizen feedback submission on resolved incident
 * @route POST /api/incidents/:id/feedback
 * @access Private (Authenticated Citizen)
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { rating, comments } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (incident.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be provided once an incident has been resolved.'
      });
    }

    incident.citizenFeedback = {
      rating: Number(rating),
      comments: comments || '',
      submittedAt: new Date()
    };

    await incident.save();

    res.json({
      success: true,
      message: 'Resolution feedback recorded successfully.',
      data: incident.citizenFeedback
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get aggregated incident statistics for Super Admin dashboard
 * @route GET /api/admin/incidents/statistics
 * @access Private (Admin)
 */
const getAdminIncidentStatistics = async (req, res, next) => {
  try {
    const [
      totalReports,
      pendingReports,
      verifiedReports,
      criticalIncidents,
      resolvedReports,
      rejectedReports,
      categoryStats,
      zoneStats
    ] = await Promise.all([
      Incident.countDocuments({ isArchived: false }),
      Incident.countDocuments({
        isArchived: false,
        status: { $in: ['submitted', 'under_review', 'info_requested'] }
      }),
      Incident.countDocuments({
        isArchived: false,
        status: { $in: ['verified', 'assigned', 'in_progress'] }
      }),
      Incident.countDocuments({
        isArchived: false,
        severity: 'critical',
        status: { $nin: ['resolved', 'rejected'] }
      }),
      Incident.countDocuments({ isArchived: false, status: 'resolved' }),
      Incident.countDocuments({ isArchived: false, status: 'rejected' }),
      Incident.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Incident.aggregate([
        { $match: { isArchived: false, zone: { $ne: null } } },
        { $group: { _id: '$zone', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'cityzones',
            localField: '_id',
            foreignField: '_id',
            as: 'zoneInfo'
          }
        },
        { $unwind: '$zoneInfo' },
        {
          $project: {
            _id: 1,
            count: 1,
            zoneName: '$zoneInfo.name',
            zoneCode: '$zoneInfo.code'
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        verifiedReports,
        criticalIncidents,
        resolvedReports,
        rejectedReports,
        categoryBreakdown: categoryStats,
        zoneBreakdown: zoneStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  checkDuplicates,
  getIncidents,
  getMyIncidents,
  getNearbyIncidents,
  getAvailableOfficers,
  getIncidentById,
  getIncidentHistory,
  verifyIncident,
  rejectIncident,
  requestAdditionalInfo,
  assignIncident,
  markDuplicate,
  updateIncidentStatus,
  voteIncident,
  submitFeedback,
  getAdminIncidentStatistics
};
