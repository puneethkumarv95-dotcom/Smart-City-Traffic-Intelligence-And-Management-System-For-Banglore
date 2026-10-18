const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { submitFeedbackSchema } = require('../validators/feedbackValidators');

// -------------------------------------------------------------
// CITIZEN INCIDENT FEEDBACK ENDPOINTS
// -------------------------------------------------------------

// Submit feedback for a resolved incident
router.post(
  '/',
  authenticate,
  validate(submitFeedbackSchema),
  feedbackController.submitFeedback
);

// View feedback submitted by current user
router.get(
  '/my',
  authenticate,
  feedbackController.getMyFeedback
);

// View overall feedback statistics (police / admin)
router.get(
  '/statistics',
  authenticate,
  authorize('police', 'traffic_police', 'admin'),
  feedbackController.getFeedbackStats
);

// Get feedback for a specific incident
router.get(
  '/incident/:incidentId',
  feedbackController.getIncidentFeedback
);

module.exports = router;
