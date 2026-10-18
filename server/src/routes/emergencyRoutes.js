const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createEmergencyRequestSchema,
  createDispatchSchema,
  updateDispatchStatusSchema
} = require('../validators/emergencyValidators');

// Optional auth helper: identifies user if token provided, but doesn't block unauthenticated SOS
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

// -------------------------------------------------------------
// 1. CITIZEN EMERGENCY SOS REQUESTS
// -------------------------------------------------------------
router.post(
  '/requests',
  optionalAuth,
  validate(createEmergencyRequestSchema),
  emergencyController.createEmergencyRequest
);

router.get(
  '/requests',
  authenticate,
  authorize('emergency', 'emergency_responder', 'police', 'traffic_police', 'admin'),
  emergencyController.getEmergencyRequests
);

router.get(
  '/requests/:id',
  optionalAuth,
  emergencyController.getEmergencyRequestById
);

// -------------------------------------------------------------
// 2. DISPATCH & RESPONDER MANAGEMENT
// -------------------------------------------------------------
router.get(
  '/dispatches',
  authenticate,
  authorize('emergency', 'emergency_responder', 'police', 'traffic_police', 'admin'),
  emergencyController.getDispatches
);

router.post(
  '/dispatches',
  authenticate,
  authorize('emergency', 'emergency_responder', 'police', 'traffic_police', 'admin'),
  validate(createDispatchSchema),
  emergencyController.createDispatch
);

router.patch(
  '/dispatches/:id/status',
  authenticate,
  authorize('emergency', 'emergency_responder', 'police', 'traffic_police', 'admin'),
  validate(updateDispatchStatusSchema),
  emergencyController.updateDispatchStatus
);

// -------------------------------------------------------------
// 3. GREEN CORRIDOR & SIREN PREEMPTION SIMULATION
// -------------------------------------------------------------
router.post(
  '/simulate-route',
  emergencyController.simulateEmergencyRoute
);

module.exports = router;
