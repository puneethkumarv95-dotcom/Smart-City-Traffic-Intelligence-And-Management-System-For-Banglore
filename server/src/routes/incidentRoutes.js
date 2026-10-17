const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  createIncidentSchema,
  verifyIncidentSchema,
  rejectIncidentSchema,
  requestInfoSchema,
  assignIncidentSchema,
  markDuplicateSchema,
  updateStatusSchema,
  voteIncidentSchema,
  feedbackSchema,
  checkDuplicatesSchema
} = require('../validators/incidentValidators');

// Optional auth middleware: extracts user if token present
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

// -------------------------------------------------------------
// 1. SPECIFIC STATIC ROUTES (MUST BE BEFORE DYNAMIC /:id ROUTES)
// -------------------------------------------------------------

// Duplicate detection check
router.post(
  '/check-duplicates',
  validate(checkDuplicatesSchema),
  incidentController.checkDuplicates
);

// Citizen's own incident history
router.get(
  '/my',
  authenticate,
  incidentController.getMyIncidents
);

// Geospatial nearby search
router.get(
  '/nearby',
  incidentController.getNearbyIncidents
);

// Available officers with active assignment workload count
router.get(
  '/officers',
  authenticate,
  authorize('police', 'admin'),
  incidentController.getAvailableOfficers
);

// Admin aggregated statistics
router.get(
  '/admin/statistics',
  authenticate,
  authorize('admin'),
  incidentController.getAdminIncidentStatistics
);

// -------------------------------------------------------------
// 2. ROOT INCIDENT ROUTES
// -------------------------------------------------------------

router.post(
  '/',
  optionalAuth,
  upload.array('media', 5),
  validate(createIncidentSchema),
  incidentController.createIncident
);

router.get(
  '/',
  optionalAuth,
  incidentController.getIncidents
);

// -------------------------------------------------------------
// 3. DYNAMIC /:id INCIDENT ROUTES
// -------------------------------------------------------------

router.get(
  '/:id',
  optionalAuth,
  incidentController.getIncidentById
);

router.get(
  '/:id/history',
  optionalAuth,
  incidentController.getIncidentHistory
);

// Citizen Voting & Feedback
router.post(
  '/:id/vote',
  authenticate,
  validate(voteIncidentSchema),
  incidentController.voteIncident
);

router.post(
  '/:id/feedback',
  authenticate,
  validate(feedbackSchema),
  incidentController.submitFeedback
);

// Police & Admin Operational Actions
router.post(
  '/:id/verify',
  authenticate,
  authorize('police', 'admin'),
  validate(verifyIncidentSchema),
  incidentController.verifyIncident
);

router.post(
  '/:id/reject',
  authenticate,
  authorize('police', 'admin'),
  validate(rejectIncidentSchema),
  incidentController.rejectIncident
);

router.post(
  '/:id/request-info',
  authenticate,
  authorize('police', 'admin'),
  validate(requestInfoSchema),
  incidentController.requestAdditionalInfo
);

router.post(
  '/:id/assign',
  authenticate,
  authorize('police', 'admin'),
  validate(assignIncidentSchema),
  incidentController.assignIncident
);

router.post(
  '/:id/duplicate',
  authenticate,
  authorize('police', 'admin'),
  validate(markDuplicateSchema),
  incidentController.markDuplicate
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('police', 'emergency', 'admin'),
  validate(updateStatusSchema),
  incidentController.updateIncidentStatus
);

module.exports = router;
