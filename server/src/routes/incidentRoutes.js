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
  assignIncidentSchema,
  updateStatusSchema,
  voteIncidentSchema,
  feedbackSchema
} = require('../validators/incidentValidators');

// Optional auth middleware: extracts user if token present, but doesn't block unauthenticated reports
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

// Public / Citizen Incident Reporting & Queries
router.post(
  '/',
  optionalAuth,
  upload.array('media', 5),
  validate(createIncidentSchema),
  incidentController.createIncident
);

router.get('/', optionalAuth, incidentController.getIncidents);
router.get('/nearby', incidentController.getNearbyIncidents);
router.get('/:id', optionalAuth, incidentController.getIncidentById);

// Citizen Actions
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

// Police & Administrator Operational Actions
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
  '/:id/assign',
  authenticate,
  authorize('police', 'admin'),
  validate(assignIncidentSchema),
  incidentController.assignIncident
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('police', 'emergency', 'admin'),
  validate(updateStatusSchema),
  incidentController.updateIncidentStatus
);

module.exports = router;
