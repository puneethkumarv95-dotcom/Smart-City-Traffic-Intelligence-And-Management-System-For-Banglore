const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const RoadClosure = require('../models/RoadClosure');
const TrafficAlert = require('../models/TrafficAlert');
const CityZone = require('../models/CityZone');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { getTrafficConditions } = require('../services/trafficConditionsService');
const { calculateRoutes } = require('../services/routingService');
const logger = require('../utils/logger');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @desc Get real-time or modeled road traffic conditions
 * @route GET /api/traffic/conditions
 * @access Public
 */
const getConditions = async (req, res, next) => {
  try {
    const conditions = await getTrafficConditions();
    res.json({
      success: true,
      data: conditions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Geospatial aggregation of incident locations for heatmap visualization
 * @route GET /api/traffic/hotspots
 * @access Public
 */
const getHotspots = async (req, res, next) => {
  try {
    const { category, zone, startDate, endDate, minSeverity } = req.query;

    const matchQuery = { isArchived: false };

    if (category) matchQuery.category = category;
    if (zone && isValidObjectId(zone)) matchQuery.zone = new mongoose.Types.ObjectId(zone);

    if (minSeverity) {
      if (minSeverity === 'critical') matchQuery.severity = 'critical';
      else if (minSeverity === 'high') matchQuery.severity = { $in: ['critical', 'high'] };
      else if (minSeverity === 'medium') matchQuery.severity = { $in: ['critical', 'high', 'medium'] };
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // Severity weighting: critical: 4, high: 3, medium: 2, low: 1
    const hotspots = await Incident.aggregate([
      { $match: matchQuery },
      {
        $project: {
          location: 1,
          category: 1,
          severity: 1,
          title: 1,
          address: 1,
          // Cluster to ~300m grid by rounding coordinates to 3 decimal places
          clusterLng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 3] },
          clusterLat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 3] },
          weight: {
            $switch: {
              branches: [
                { case: { $eq: ['$severity', 'critical'] }, then: 4 },
                { case: { $eq: ['$severity', 'high'] }, then: 3 },
                { case: { $eq: ['$severity', 'medium'] }, then: 2 }
              ],
              default: 1
            }
          }
        }
      },
      {
        $group: {
          _id: { lng: '$clusterLng', lat: '$clusterLat' },
          count: { $sum: 1 },
          totalWeight: { $sum: '$weight' },
          sampleTitle: { $first: '$title' },
          sampleAddress: { $first: '$address' },
          dominantCategory: { $first: '$category' }
        }
      },
      {
        $project: {
          _id: 0,
          coordinates: ['$_id.lng', '$_id.lat'],
          count: '$count',
          intensity: {
            // Normalized intensity between 0.2 and 1.0
            $min: [1.0, { $add: [0.2, { $multiply: ['$totalWeight', 0.1] }] }]
          },
          totalWeight: '$totalWeight',
          sampleTitle: '$sampleTitle',
          sampleAddress: '$sampleAddress',
          dominantCategory: '$dominantCategory'
        }
      },
      { $sort: { totalWeight: -1 } },
      { $limit: 100 }
    ]);

    res.json({
      success: true,
      count: hotspots.length,
      data: hotspots
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get historical traffic and incident analytics by hour, category, and zone
 * @route GET /api/traffic/history
 * @access Public
 */
const getHistory = async (req, res, next) => {
  try {
    const { zone, startDate, endDate } = req.query;

    const matchQuery = { isArchived: false };
    if (zone && isValidObjectId(zone)) matchQuery.zone = new mongoose.Types.ObjectId(zone);

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const [hourlyDistribution, categoryStats, zoneStats, totalIncidents, totalClosures] = await Promise.all([
      // Hourly distribution (0 - 23)
      Incident.aggregate([
        { $match: matchQuery },
        {
          $project: {
            hour: { $hour: { date: '$createdAt', timezone: '+05:30' } }
          }
        },
        {
          $group: {
            _id: '$hour',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Category breakdown
      Incident.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Zone-based breakdown
      Incident.aggregate([
        { $match: { ...matchQuery, zone: { $ne: null } } },
        {
          $group: {
            _id: '$zone',
            count: { $sum: 1 }
          }
        },
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
            zoneName: '$zoneInfo.name',
            zoneCode: '$zoneInfo.code',
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),

      Incident.countDocuments(matchQuery),
      RoadClosure.countDocuments()
    ]);

    // Fill all 24 hours so charts always render smoothly
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const match = hourlyDistribution.find((h) => h._id === i);
      const isMorningPeak = i >= 8 && i <= 11;
      const isEveningPeak = i >= 17 && i <= 21;
      return {
        hour: `${String(i).padStart(2, '0')}:00`,
        hourNum: i,
        incidentsCount: match ? match.count : 0,
        isPeakHour: isMorningPeak || isEveningPeak
      };
    });

    res.json({
      success: true,
      data: {
        totalIncidents,
        totalClosures,
        hourlyDistribution: hourlyData,
        categoryBreakdown: categoryStats,
        zoneBreakdown: zoneStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Calculate smart navigation route with alternatives and closure conflict detection
 * @route POST /api/traffic/routes
 * @access Public
 */
const calculateRoute = async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    const result = await calculateRoutes({ origin, destination });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get road closures with optional active filtering
 * @route GET /api/traffic/closures
 * @access Public
 */
const getClosures = async (req, res, next) => {
  try {
    const { isActive, zone } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }
    if (zone && isValidObjectId(zone)) {
      query.zone = zone;
    }

    const closures = await RoadClosure.find(query)
      .populate('zone', 'name code')
      .populate('createdBy', 'name badgeNumber role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: closures.length,
      data: closures
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create road closure announcement
 * @route POST /api/traffic/closures
 * @access Private (Police / Admin)
 */
const createClosure = async (req, res, next) => {
  try {
    const {
      title,
      roadName,
      reason,
      diversionInstructions,
      latitude,
      longitude,
      address,
      startTime = new Date(),
      endTime,
      severity = 'full',
      zoneId
    } = req.body;

    let matchedZone = zoneId && isValidObjectId(zoneId) ? zoneId : null;
    if (!matchedZone) {
      const nearestZone = await CityZone.findOne({
        center: {
          $near: {
            $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
            $maxDistance: 15000
          }
        }
      });
      if (nearestZone) {
        matchedZone = nearestZone._id;
      }
    }

    const closure = await RoadClosure.create({
      title,
      roadName,
      reason,
      diversionInstructions,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)]
      },
      address,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      severity,
      zone: matchedZone,
      isActive: true,
      createdBy: req.user._id,
      createdByName: req.user.name
    });

    await closure.populate('zone', 'name code');

    // Create Notification
    await Notification.create({
      title: `Road Closure: ${closure.roadName}`,
      message: `${closure.title}. Diversion: ${closure.diversionInstructions}`,
      type: 'road_closure',
      severity: closure.severity === 'emergency' ? 'critical' : 'warning',
      location: closure.location,
      relatedClosure: closure._id,
      targetRole: 'all'
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('closure:created', closure);
      io.to('role:citizen').emit('notification:new', {
        title: `Road Closure: ${closure.roadName}`,
        message: closure.title,
        severity: closure.severity
      });
    }

    // Audit Log
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ROAD_CLOSURE_CREATED',
      resourceType: 'RoadClosure',
      resourceId: closure._id.toString(),
      details: {
        closureId: closure.closureId,
        roadName: closure.roadName,
        reason: closure.reason
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json({
      success: true,
      message: 'Road closure notice published successfully and broadcast to motorists.',
      data: closure
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update road closure details or toggle active status
 * @route PATCH /api/traffic/closures/:id
 * @access Private (Police / Admin)
 */
const updateClosure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const closure = await RoadClosure.findById(id);

    if (!closure) {
      return res.status(404).json({ success: false, message: 'Road closure notice not found' });
    }

    const { title, isActive, diversionInstructions, endTime, severity } = req.body;

    if (title !== undefined) closure.title = title;
    if (isActive !== undefined) closure.isActive = Boolean(isActive);
    if (diversionInstructions !== undefined) closure.diversionInstructions = diversionInstructions;
    if (endTime !== undefined) closure.endTime = new Date(endTime);
    if (severity !== undefined) closure.severity = severity;

    await closure.save();
    await closure.populate('zone', 'name code');

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('closure:updated', closure);
    }

    res.json({
      success: true,
      message: 'Road closure updated successfully.',
      data: closure
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete road closure notice
 * @route DELETE /api/traffic/closures/:id
 * @access Private (Police / Admin)
 */
const deleteClosure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const closure = await RoadClosure.findByIdAndDelete(id);

    if (!closure) {
      return res.status(404).json({ success: false, message: 'Road closure not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('closure:removed', { id });
    }

    res.json({
      success: true,
      message: 'Road closure notice removed.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get active traffic advisories and alerts
 * @route GET /api/traffic/alerts
 * @access Public
 */
const getAlerts = async (req, res, next) => {
  try {
    const alerts = await TrafficAlert.find({
      isActive: true,
      validUntil: { $gte: new Date() }
    })
      .populate('affectedZones', 'name code')
      .populate('issuedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Publish new traffic advisory alert
 * @route POST /api/traffic/alerts
 * @access Private (Police / Admin)
 */
const createAlert = async (req, res, next) => {
  try {
    const { title, message, severity = 'warning', affectedCorridors = [], validUntil } = req.body;

    const alert = await TrafficAlert.create({
      title,
      message,
      severity,
      affectedCorridors,
      validUntil: new Date(validUntil),
      issuedBy: req.user._id,
      issuerName: req.user.name
    });

    const io = req.app.get('io');
    if (io) {
      io.to('channel:public-traffic').emit('traffic:alert_new', alert);
    }

    res.status(201).json({
      success: true,
      message: 'Traffic advisory alert published.',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConditions,
  getHotspots,
  getHistory,
  calculateRoute,
  getClosures,
  createClosure,
  updateClosure,
  deleteClosure,
  getAlerts,
  createAlert
};

