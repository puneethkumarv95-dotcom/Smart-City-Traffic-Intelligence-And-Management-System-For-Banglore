const express = require('express');
const router = express.Router();
const savedRouteController = require('../controllers/savedRouteController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { savedRouteSchema } = require('../validators/trafficValidators');

// All saved routes endpoints are private to authenticated commuters
router.use(authenticate);

router.get('/', savedRouteController.getSavedRoutes);
router.post('/', validate(savedRouteSchema), savedRouteController.saveRoute);
router.patch('/:id', savedRouteController.updateSavedRoute);
router.delete('/:id', savedRouteController.deleteSavedRoute);
router.get('/:id/check', savedRouteController.checkRouteHazards);

module.exports = router;

