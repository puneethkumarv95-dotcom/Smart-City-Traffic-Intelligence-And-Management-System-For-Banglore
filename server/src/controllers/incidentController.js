const Incident = require('../models/Incident');
const IncidentVote = require('../models/IncidentVote');
const CityZone = require('../models/CityZone');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

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
      zoneId,
      isAnonymous = false
    } = req.body;

    // Process uploaded media files
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const isVideo = file.mimetype.startsWith('video/');
        media.push({
          url: `/uploads/${file.filename}`,
          mediaType: isVideo ? 'video' : 'image',
          publicId: file.filename,
          caption: file.originalname
        });
      });
    }

    // Determine Zone automatically if not provided
    let matchedZone = zoneId || null;
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

    const reporterUser = !isAnonymous && req.user ? req.user._id : null;
    const reporterName = !isAnonymous && req.user ? req.user.name : 'Anonymous Citizen';

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
      zone: matchedZone,
      reportedBy: reporterUser,
      isAnonymous: Boolean(isAnonymous),
      reporterIp: req.ip || '',
      status: 'submitted',
      media,
      expiresAt,
      statusHistory: [
        {
          status: 'submitted',
          changedBy: reporterUser,
          changedByName: reporterName,
          actorRole: req.user ? req.user.role : 'citizen',
          timestamp: new Date(),
          notes: 'Incident initially reported.'
        }
      ]
    });

    // Populate zone for rich client response
    await incident.populate('zone');

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:new', incident);
      io.to('role:police').emit('incident:police_alert', {
        id: incident._id,
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
      actorRole: req.user ? req.user.role : 'citizen',
      action: 'INCIDENT_REPORTED',
      resourceType: 'Incident',
      resourceId: incident._id.toString(),
      details: {
        title: incident.title,
        category: incident.category,
        severity: incident.severity,
        isAnonymous: incident.isAnonymous
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully and logged in transit queue.',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all incidents with filtering & pagination
 * @route GET /api/incidents
 * @access Public / Private
 */
const getIncidents = async (req, res, next) => {
  try {
    const {
      status,
      severity,
      category,
      zone,
      myReports,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isArchived: false };

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (category) query.category = category;
    if (zone) query.zone = zone;

    if (myReports === 'true' && req.user) {
      query.reportedBy = req.user._id;
    }

    if (search) {
      query.$or = [
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
        .populate('assignedTo.officer', 'name badgeNumber department')
        .sort(sortOption)
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
 * @desc Get incident by ID
 * @route GET /api/incidents/:id
 * @access Public / Private
 */
const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('zone')
      .populate('reportedBy', 'name email role phone')
      .populate('assignedTo.officer', 'name badgeNumber department')
      .populate('verifiedBy.officer', 'name badgeNumber department')
      .populate('statusHistory.changedBy', 'name role');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Verify incident
 * @route POST /api/incidents/:id/verify
 * @access Private (Police / Admin)
 */
const verifyIncident = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.status = 'verified';
    incident.verifiedBy = {
      officer: req.user._id,
      officerName: req.user.name,
      verifiedAt: new Date(),
      notes: notes || ''
    };

    incident.statusHistory.push({
      status: 'verified',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      timestamp: new Date(),
      notes: notes || 'Verified by authorized officer.'
    });

    await incident.save();

    // Broadcast update
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
      details: { notes },
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
 * @desc Reject incident
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

    incident.status = 'rejected';
    incident.rejectedBy = {
      officer: req.user._id,
      officerName: req.user.name,
      rejectedAt: new Date(),
      reason
    };

    incident.statusHistory.push({
      status: 'rejected',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      timestamp: new Date(),
      notes: `Rejected: ${reason}`
    });

    await incident.save();

    // Broadcast update
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
      details: { reason },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: 'Incident marked as rejected.',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Assign incident to officer / response unit
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

    incident.status = 'assigned';
    incident.assignedTo = {
      officer: assignedOfficer._id,
      officerName: assignedOfficer.name,
      department: assignedOfficer.department,
      assignedAt: new Date(),
      notes: notes || ''
    };

    incident.statusHistory.push({
      status: 'assigned',
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      timestamp: new Date(),
      notes: `Assigned to ${assignedOfficer.name} (${assignedOfficer.badgeNumber || 'Officer'}). ${notes || ''}`
    });

    await incident.save();

    // Broadcast update
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
      details: { assignedToOfficerId: assignedOfficer._id, notes },
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
 * @desc Update incident status (in_progress, resolved)
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

    incident.status = status;

    if (status === 'resolved') {
      incident.resolutionDetails = {
        notes: notes || 'Resolved by operational dispatch unit.',
        resolvedAt: new Date(),
        resolvedBy: req.user._id
      };
    }

    incident.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedByName: req.user.name,
      actorRole: req.user.role,
      timestamp: new Date(),
      notes: notes || `Status updated to ${status}`
    });

    await incident.save();

    // Broadcast update
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
      details: { newStatus: status, notes },
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
 * @desc Community vote (confirm or dispute incident)
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

    // Check if user has already voted
    const existingVote = await IncidentVote.findOne({
      incident: incidentId,
      user: req.user._id
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a verification vote for this incident.'
      });
    }

    // Create vote record
    await IncidentVote.create({
      incident: incidentId,
      user: req.user._id,
      voteType,
      voterIp: req.ip || ''
    });

    // Update vote counts
    if (voteType === 'confirm') {
      incident.confirmVotesCount += 1;
    } else {
      incident.disputeVotesCount += 1;
    }

    // Heuristic: If 5+ community confirmations occur while submitted, promote to under_review automatically
    if (incident.confirmVotesCount >= 5 && incident.status === 'submitted') {
      incident.status = 'under_review';
      incident.statusHistory.push({
        status: 'under_review',
        changedBy: null,
        changedByName: 'Community Consensus Heuristic',
        actorRole: 'system',
        timestamp: new Date(),
        notes: `Promoted to review after reaching ${incident.confirmVotesCount} community confirmations.`
      });
    }

    await incident.save();

    // Broadcast vote update
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('incident:vote_updated', {
        id: incident._id,
        confirmVotesCount: incident.confirmVotesCount,
        disputeVotesCount: incident.disputeVotesCount,
        status: incident.status
      });
    }

    res.json({
      success: true,
      message: `Vote (${voteType}) recorded successfully.`,
      data: {
        confirmVotesCount: incident.confirmVotesCount,
        disputeVotesCount: incident.disputeVotesCount,
        status: incident.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Citizen submit resolution feedback
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
        message: 'Feedback can only be provided for resolved incidents.'
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
      message: 'Thank you for your feedback! It helps improve Bengaluru city transit operations.',
      data: incident.citizenFeedback
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  getIncidents,
  getNearbyIncidents,
  getIncidentById,
  verifyIncident,
  rejectIncident,
  assignIncident,
  updateIncidentStatus,
  voteIncident,
  submitFeedback
};
