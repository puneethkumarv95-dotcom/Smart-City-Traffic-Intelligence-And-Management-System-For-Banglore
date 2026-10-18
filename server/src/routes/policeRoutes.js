const express = require('express');
const router = express.Router();
const policeController = require('../controllers/policeController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createShiftSchema,
  updateShiftSchema,
  acknowledgeEscalationSchema,
  resolveEscalationSchema
} = require('../validators/policeValidators');

// All police routes require authentication
router.use(authenticate);

// -------------------------------------------------------------
// 1. COMMAND CENTER & PRIORITY QUEUE
// -------------------------------------------------------------
router.get(
  '/command-center',
  authorize('police', 'traffic_police', 'admin'),
  policeController.getCommandCenter
);

router.get(
  '/priority-queue',
  authorize('police', 'traffic_police', 'admin'),
  policeController.getPriorityQueue
);

// -------------------------------------------------------------
// 2. SHIFT ROSTER & MANAGEMENT
// -------------------------------------------------------------
router.get(
  '/shifts',
  authorize('police', 'traffic_police', 'admin'),
  policeController.getShifts
);

router.post(
  '/shifts',
  authorize('admin'), // In production, supervisors / admins schedule rosters
  validate(createShiftSchema),
  policeController.createShift
);

router.put(
  '/shifts/:id',
  authorize('police', 'traffic_police', 'admin'),
  validate(updateShiftSchema),
  policeController.updateShift
);

// -------------------------------------------------------------
// 3. SLA ESCALATIONS
// -------------------------------------------------------------
router.get(
  '/escalations',
  authorize('police', 'traffic_police', 'admin'),
  policeController.getEscalations
);

router.patch(
  '/escalations/:id/acknowledge',
  authorize('police', 'traffic_police', 'admin'),
  validate(acknowledgeEscalationSchema),
  policeController.acknowledgeEscalation
);

router.patch(
  '/escalations/:id/resolve',
  authorize('police', 'traffic_police', 'admin'),
  validate(resolveEscalationSchema),
  policeController.resolveEscalation
);

router.post(
  '/escalations/check',
  authorize('admin'),
  policeController.triggerEscalationSweep
);

module.exports = router;
