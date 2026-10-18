const mongoose = require('mongoose');
const CitizenFeedback = require('../models/CitizenFeedback');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @desc Submit post-resolution citizen feedback
 * @route POST /api/feedback
 * @access Private (Citizen, Authenticated User)
 */
const submitFeedback = async (req, res, next) => {
  try {
    const {
      incidentId: rawIncidentId,
      rating,
      responseTimeliness = 3,
      officerProfessionalism = 3,
      comment = '',
      suggestions = ''
    } = req.body;

    // Resolve incident document
    let incident = null;
    if (isValidObjectId(rawIncidentId)) {
      incident = await Incident.findById(rawIncidentId);
    } else {
      incident = await Incident.findOne({ incidentId: rawIncidentId });
    }

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    if (incident.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: `Feedback can only be submitted for resolved incidents. Current status: ${incident.status}`
      });
    }

    // Check if citizen has already submitted feedback
    const existing = await CitizenFeedback.findOne({
      incident: incident._id,
      submittedBy: req.user._id
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted feedback for this incident.'
      });
    }

    const feedback = await CitizenFeedback.create({
      incident: incident._id,
      submittedBy: req.user._id,
      assignedOfficer: incident.assignedOfficer || null,
      rating: parseInt(rating, 10),
      responseTimeliness: parseInt(responseTimeliness, 10),
      officerProfessionalism: parseInt(officerProfessionalism, 10),
      comment,
      suggestions
    });

    // Mirror onto Incident document for backward compatibility
    incident.citizenFeedback = {
      rating: parseInt(rating, 10),
      comments: comment,
      submittedAt: new Date()
    };
    await incident.save();

    // Audit Log
    await AuditLog.create({
      action: 'FEEDBACK_SUBMITTED',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'CitizenFeedback',
      targetId: feedback._id,
      details: {
        feedbackId: feedback.feedbackId,
        incidentId: incident.incidentId,
        rating
      }
    });

    // Real-time notification to police / admin
    const io = req.app.get('io');
    if (io) {
      io.to('role:police').emit('feedback:new', {
        feedbackId: feedback.feedbackId,
        incidentId: incident.incidentId,
        rating: feedback.rating,
        comment: feedback.comment
      });
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your review helps improve Bengaluru city mobility.',
      data: feedback
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Feedback already recorded for this incident.'
      });
    }
    logger.error(`Error submitting feedback: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get feedback for a specific incident
 * @route GET /api/feedback/incident/:incidentId
 * @access Private / Public
 */
const getIncidentFeedback = async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    let targetId = incidentId;

    if (!isValidObjectId(incidentId)) {
      const inc = await Incident.findOne({ incidentId });
      if (!inc) {
        return res.status(404).json({ success: false, message: 'Incident not found' });
      }
      targetId = inc._id;
    }

    const feedbacks = await CitizenFeedback.find({ incident: targetId })
      .populate('submittedBy', 'name')
      .populate('assignedOfficer', 'name badgeNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    logger.error(`Error fetching incident feedback: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get user's submitted feedback
 * @route GET /api/feedback/my
 * @access Private (Citizen)
 */
const getMyFeedback = async (req, res, next) => {
  try {
    const feedbacks = await CitizenFeedback.find({ submittedBy: req.user._id })
      .populate('incident', 'incidentId title category address resolvedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    logger.error(`Error fetching my feedback: ${error.message}`);
    next(error);
  }
};

/**
 * @desc Get overall feedback analytics and rating statistics
 * @route GET /api/feedback/statistics
 * @access Private (Traffic Police, Admin)
 */
const getFeedbackStats = async (req, res, next) => {
  try {
    const [stats, recentFeedback] = await Promise.all([
      CitizenFeedback.aggregate([
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgTimeliness: { $avg: '$responseTimeliness' },
            avgProfessionalism: { $avg: '$officerProfessionalism' },
            fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            oneStars: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
          }
        }
      ]),
      CitizenFeedback.find()
        .populate('incident', 'incidentId title')
        .populate('submittedBy', 'name')
        .populate('assignedOfficer', 'name badgeNumber')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    const aggregated = stats[0] || {
      totalCount: 0,
      avgRating: 0,
      avgTimeliness: 0,
      avgProfessionalism: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStars: 0
    };

    res.status(200).json({
      success: true,
      data: {
        metrics: aggregated,
        recentFeedback
      }
    });
  } catch (error) {
    logger.error(`Error fetching feedback statistics: ${error.message}`);
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getIncidentFeedback,
  getMyFeedback,
  getFeedbackStats
};
