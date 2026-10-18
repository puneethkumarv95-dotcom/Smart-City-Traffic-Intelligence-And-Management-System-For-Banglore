const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const OfficerShift = require('../models/OfficerShift');
const EscalationEvent = require('../models/EscalationEvent');
const User = require('../models/User');
const CityZone = require('../models/CityZone');
const AuditLog = require('../models/AuditLog');
const { calculatePriorityScore, runEscalationCheck } = require('../services/priorityService');
const logger = require('../utils/logger');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @desc Get real-time Traffic Police Command Center operational dashboard metrics & feeds
 * @route GET /api/police/command-center
 * @access Private (Traffic Police, Supervisor, Admin)
 */
const getCommandCenter = async (req, res, next) => {
  try {
    const { zoneId } = req.query;
    const now = new Date();

    const activeFilter = {
      status: { $nin: ['resolved', 'rejected', 'duplicate'] },
      isArchived: false
    };

    if (zoneId && isValidObjectId(zoneId)) {
      activeFilter.zone = zoneId;
    }

    // Run parallel aggregation metrics
    const [
      totalActive,
      criticalIncidents,
      pendingVerification,
      assignedIncidents,
      unassignedIncidents,
      roadClosures,
      activeShifts,
      activeEscalations,
      zoneBreakdown
    ] = await Promise.all([
      Incident.countDocuments(activeFilter),
      Incident.countDocuments({ ...activeFilter, severity: 'critical' }),
      Incident.countDocuments({ ...activeFilter, verificationStatus: 'pending' }),
      Incident.countDocuments({ ...activeFilter, assignedOfficer: { $ne: null } }),
      Incident.countDocuments({ ...activeFilter, assignedOfficer: null }),
      Incident.countDocuments({
        ...activeFilter,
        category: { $in: ['Road Closure', 'road_closure'] }
      }),
      OfficerShift.countDocuments({
        dutyStatus: 'active',
        shiftStart: { $lte: now },
        shiftEnd: { $gte: now }
      }),
      EscalationEvent.countDocuments({ status: 'active' }),
      Incident.aggregate([
        { $match: activeFilter },
        { $group: { _id: '$zone', count: { $sum: 1 }, criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } } } },
        { $lookup: { from: 'cityzones', localField: '_id', foreignField: '_id', as: 'zoneInfo' } },
        { $unwind: { path: '$zoneInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            zoneId: '$_id',
            zoneName: { $ifNull: ['$zoneInfo.name', 'Unassigned / Central Zone'] },
            zoneCode: { $ifNull: ['$zoneInfo.code', 'CENTRAL'] },
            count: 1,
            criticalCount: 1
          }
        }
      ])
    ]);

    // Fetch top 15 active incidents for the live command stream
    const rawIncidents = await Incident.find(activeFilter)
      .populate('assignedOfficer', 'name badgeNumber phone')
      .populate('zone', 'name code congestionLevel')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // Attach dynamic priority scores to each incident
    const prioritizedIncidents = rawIncidents.map((inc) => {
      const prio = calculatePriorityScore(inc);
      return {
        ...inc,
        priorityScore: typeof prio === 'object' ? prio.score : prio,
        priorityTier: typeof prio === 'object' ? prio.tier : 'STANDARD',
        priorityBreakdown: typeof prio === 'object' ? prio.breakdown : null
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);

    // Fetch currently on-duty officers
    const currentOnDuty = await OfficerShift.find({
      dutyStatus: { $in: ['active', 'scheduled'] },
      shiftEnd: { $gte: now }
    })
      .populate('officer', 'name badgeNumber email phone role')
      .populate('assignedZone', 'name code')
      .sort({ shiftStart: 1 })
      .limit(20)
      .lean();

    // Fetch active escalations
    const activeEscalationsList = await EscalationEvent.find({ status: 'active' })
      .populate('incident', 'incidentId title severity category address')
      .populate('zone', 'name code')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalActive,
          criticalIncidents,
          pendingVerification,
          assignedIncidents,
          unassignedIncidents,
          roadClosures,
          activeOfficersOnDuty: activeShifts,
          activeEscalations
        },
        zoneBreakdown,
        incidents: prioritizedIncidents.slice(0, 15),
        activeShifts: currentOnDuty,
        activeEscalations: activeEscalationsList,
        lastUpdated: now.toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error loading command center: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get dynamically prioritized incident queue with zone/officer filtering
 * @route GET /api/police/priority-queue
 * @access Private (Traffic Police, Admin)
 */
const getPriorityQueue = async (req, res, next) => {
  try {
    const { zoneId, severity, status, assignment, search, page = 1, limit = 20 } = req.query;
    const filter = { isArchived: false };

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $nin: ['resolved', 'rejected', 'duplicate'] };
    }

    if (severity) {
      filter.severity = severity;
    }

    if (zoneId && isValidObjectId(zoneId)) {
      filter.zone = zoneId;
    }

    if (assignment === 'unassigned') {
      filter.assignedOfficer = null;
    } else if (assignment === 'assigned') {
      filter.assignedOfficer = { $ne: null };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { incidentId: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const rawIncidents = await Incident.find(filter)
      .populate('assignedOfficer', 'name badgeNumber phone')
      .populate('zone', 'name code congestionLevel')
      .populate('reportedBy', 'name phone')
      .lean();

    // Compute dynamic scores
    const scored = rawIncidents.map((inc) => {
      const prio = calculatePriorityScore(inc);
      return {
        ...inc,
        priorityScore: typeof prio === 'object' ? prio.score : prio,
        priorityTier: typeof prio === 'object' ? prio.tier : 'STANDARD',
        priorityBreakdown: typeof prio === 'object' ? prio.breakdown : null
      };
    });

    // Sort by priorityScore descending
    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const total = scored.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = scored.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: {
        incidents: paginatedItems,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    logger.error(`Error loading priority queue: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get officer shifts with filters and conflict inspection
 * @route GET /api/police/shifts
 * @access Private (Police, Admin)
 */
const getShifts = async (req, res, next) => {
  try {
    const { officerId, zoneId, dutyStatus, shiftType, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (officerId && isValidObjectId(officerId)) {
      filter.officer = officerId;
    } else if (req.user.role === 'traffic_police' && !['admin', 'supervisor'].includes(req.user.role)) {
      // If regular traffic police without query, show their own or full zone roster
      if (req.query.myOnly === 'true') {
        filter.officer = req.user._id;
      }
    }

    if (zoneId && isValidObjectId(zoneId)) {
      filter.assignedZone = zoneId;
    }

    if (dutyStatus) {
      filter.dutyStatus = dutyStatus;
    }

    if (shiftType) {
      filter.shiftType = shiftType;
    }

    if (startDate || endDate) {
      filter.shiftStart = {};
      if (startDate) filter.shiftStart.$gte = new Date(startDate);
      if (endDate) filter.shiftStart.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [shifts, total] = await Promise.all([
      OfficerShift.find(filter)
        .populate('officer', 'name badgeNumber email phone role')
        .populate('assignedZone', 'name code')
        .populate('scheduledBy', 'name badgeNumber')
        .sort({ shiftStart: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfficerShift.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        shifts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    logger.error(`Error getting shifts: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Schedule a new officer shift with automated overlap conflict detection
 * @route POST /api/police/shifts
 * @access Private (Supervisor, Admin, Police Supervisor)
 */
const createShift = async (req, res, next) => {
  try {
    const {
      officer,
      shiftType,
      shiftStart,
      shiftEnd,
      assignedZone,
      patrolVehicle = '',
      notes = ''
    } = req.body;

    if (!isValidObjectId(officer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid officer ID format.'
      });
    }

    // Verify target officer exists
    const targetUser = await User.findById(officer);
    if (!targetUser || !['police', 'traffic_police', 'admin'].includes(targetUser.role)) {
      return res.status(400).json({
        success: false,
        message: 'Officer not found or user is not a traffic officer.'
      });
    }

    // Check for shift scheduling conflicts
    const conflict = await OfficerShift.checkConflict(officer, shiftStart, shiftEnd);
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Shift conflict detected. Officer ${targetUser.name} (${targetUser.badgeNumber || 'N/A'}) is already assigned to a shift (${conflict.shiftId}) from ${new Date(conflict.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(conflict.shiftEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        conflictShift: conflict
      });
    }

    // Validate zone if provided as ObjectId or Zone string
    let resolvedZone = null;
    if (isValidObjectId(assignedZone)) {
      resolvedZone = assignedZone;
    } else {
      const zoneDoc = await CityZone.findOne({
        $or: [{ code: assignedZone.toUpperCase() }, { name: assignedZone }]
      });
      if (zoneDoc) resolvedZone = zoneDoc._id;
    }

    const shift = await OfficerShift.create({
      officer,
      shiftType,
      shiftStart,
      shiftEnd,
      assignedZone: resolvedZone,
      patrolVehicle,
      notes,
      scheduledBy: req.user._id,
      dutyStatus: new Date(shiftStart) <= new Date() && new Date(shiftEnd) >= new Date() ? 'active' : 'scheduled'
    });

    await shift.populate('officer', 'name badgeNumber email phone');
    if (resolvedZone) await shift.populate('assignedZone', 'name code');

    // Audit log
    await AuditLog.create({
      action: 'SHIFT_SCHEDULED',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'OfficerShift',
      targetId: shift._id,
      details: {
        shiftId: shift.shiftId,
        officer: targetUser.name,
        shiftStart,
        shiftEnd
      }
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('role:police').emit('shift:created', shift);
      io.to(`user:${officer.toString()}`).emit('shift:assigned', shift);
    }

    res.status(201).json({
      success: true,
      message: 'Officer shift successfully scheduled with zero conflicts.',
      data: shift
    });
  } catch (error) {
    logger.error(`Error creating shift: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Update shift details or transition duty status
 * @route PUT /api/police/shifts/:id
 * @access Private (Supervisor, Admin, Assigned Officer for status update)
 */
const updateShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dutyStatus, shiftStart, shiftEnd, assignedZone, patrolVehicle, notes } = req.body;

    const shift = await OfficerShift.findById(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Officer shift not found.'
      });
    }

    // RBAC: regular officers can update their own duty status, admins/supervisors can edit everything
    const isOwner = shift.officer.toString() === req.user._id.toString();
    const isSupervisor = ['admin', 'supervisor'].includes(req.user.role);

    if (!isOwner && !isSupervisor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this shift record.'
      });
    }

    // If times are being changed, check conflict against other shifts
    const newStart = shiftStart || shift.shiftStart;
    const newEnd = shiftEnd || shift.shiftEnd;
    if (shiftStart || shiftEnd) {
      const conflict = await OfficerShift.checkConflict(shift.officer, newStart, newEnd, shift._id);
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Shift conflict detected with existing shift ${conflict.shiftId}.`,
          conflictShift: conflict
        });
      }
      shift.shiftStart = newStart;
      shift.shiftEnd = newEnd;
    }

    if (dutyStatus) shift.dutyStatus = dutyStatus;
    if (assignedZone && isValidObjectId(assignedZone)) shift.assignedZone = assignedZone;
    if (patrolVehicle !== undefined) shift.patrolVehicle = patrolVehicle;
    if (notes !== undefined) shift.notes = notes;

    await shift.save();
    await shift.populate('officer', 'name badgeNumber email phone');
    await shift.populate('assignedZone', 'name code');

    const io = req.app.get('io');
    if (io) {
      io.to('role:police').emit('shift:updated', shift);
    }

    res.status(200).json({
      success: true,
      message: 'Officer shift updated successfully.',
      data: shift
    });
  } catch (error) {
    logger.error(`Error updating shift: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get all SLA escalations
 * @route GET /api/police/escalations
 * @access Private (Traffic Police, Supervisor, Admin)
 */
const getEscalations = async (req, res, next) => {
  try {
    const { status, escalationLevel, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (escalationLevel) {
      filter.escalationLevel = escalationLevel;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [escalations, total] = await Promise.all([
      EscalationEvent.find(filter)
        .populate('incident', 'incidentId title severity category status address location createdAt')
        .populate('zone', 'name code')
        .populate('acknowledgedBy', 'name badgeNumber')
        .populate('resolvedBy', 'name badgeNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EscalationEvent.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        escalations,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    logger.error(`Error fetching escalations: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Acknowledge an escalation event
 * @route PATCH /api/police/escalations/:id/acknowledge
 * @access Private (Traffic Police, Supervisor, Admin)
 */
const acknowledgeEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actionTaken = 'Acknowledged by duty officer', notes = '' } = req.body;

    const escalation = await EscalationEvent.findById(id);
    if (!escalation) {
      return res.status(404).json({
        success: false,
        message: 'Escalation event not found.'
      });
    }

    escalation.status = 'acknowledged';
    escalation.acknowledgedBy = req.user._id;
    escalation.acknowledgedAt = new Date();
    escalation.actionTaken = actionTaken;
    if (notes) escalation.notes = notes;

    await escalation.save();
    await escalation.populate('incident', 'incidentId title severity status');
    await escalation.populate('acknowledgedBy', 'name badgeNumber');

    const io = req.app.get('io');
    if (io) {
      io.to('role:police').emit('escalation:acknowledged', escalation);
    }

    res.status(200).json({
      success: true,
      message: 'Escalation acknowledged.',
      data: escalation
    });
  } catch (error) {
    logger.error(`Error acknowledging escalation: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Resolve an escalation event
 * @route PATCH /api/police/escalations/:id/resolve
 * @access Private (Traffic Police, Supervisor, Admin)
 */
const resolveEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const escalation = await EscalationEvent.findById(id);
    if (!escalation) {
      return res.status(404).json({
        success: false,
        message: 'Escalation event not found.'
      });
    }

    escalation.status = 'resolved';
    escalation.resolvedBy = req.user._id;
    escalation.resolvedAt = new Date();
    escalation.resolutionNotes = resolutionNotes || 'Resolved through standard protocol';

    await escalation.save();
    await escalation.populate('incident', 'incidentId title severity status');
    await escalation.populate('resolvedBy', 'name badgeNumber');

    const io = req.app.get('io');
    if (io) {
      io.to('role:police').emit('escalation:resolved', escalation);
    }

    res.status(200).json({
      success: true,
      message: 'Escalation resolved successfully.',
      data: escalation
    });
  } catch (error) {
    logger.error(`Error resolving escalation: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Run automated SLA escalation audit sweep
 * @route POST /api/police/escalations/check
 * @access Private (Admin, Supervisor)
 */
const triggerEscalationSweep = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const result = await runEscalationCheck(io);

    res.status(200).json({
      success: true,
      message: `Escalation check complete. Created ${result.createdEscalations.length} new escalations.`,
      data: result
    });
  } catch (error) {
    logger.error(`Error triggering escalation sweep: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getCommandCenter,
  getPriorityQueue,
  getShifts,
  createShift,
  updateShift,
  getEscalations,
  acknowledgeEscalation,
  resolveEscalation,
  triggerEscalationSweep
};
