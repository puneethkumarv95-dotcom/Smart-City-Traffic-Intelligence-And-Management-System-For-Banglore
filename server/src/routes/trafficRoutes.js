const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/trafficController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  routeRequestSchema,
  createClosureSchema,
  updateClosureSchema,
  createAlertSchema
} = require('../validators/trafficValidators');

// 1. Traffic Observations & Conditions
router.get('/conditions', trafficController.getConditions);

// 2. Incident Concentration Hotspots Heatmap
router.get('/hotspots', trafficController.getHotspots);

// 3. Historical Analytics & Peak-Hour Data
router.get('/history', trafficController.getHistory);

// 4. Smart Navigation Routing
router.post('/routes', validate(routeRequestSchema), trafficController.calculateRoute);

// 5. Road Closures
router.get('/closures', trafficController.getClosures);
router.post(
  '/closures',
  authenticate,
  authorize('police', 'admin'),
  validate(createClosureSchema),
  trafficController.createClosure
);
router.patch(
  '/closures/:id',
  authenticate,
  authorize('police', 'admin'),
  validate(updateClosureSchema),
  trafficController.updateClosure
);
router.delete(
  '/closures/:id',
  authenticate,
  authorize('police', 'admin'),
  trafficController.deleteClosure
);

// 6. Traffic Alerts / Advisories
router.get('/alerts', trafficController.getAlerts);
router.post(
  '/alerts',
  authenticate,
  authorize('police', 'admin'),
  validate(createAlertSchema),
  trafficController.createAlert
);

module.exports = router;
