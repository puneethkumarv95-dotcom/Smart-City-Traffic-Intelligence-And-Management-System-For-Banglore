const SavedRoute = require('../models/SavedRoute');
const { calculateRoutes } = require('../services/routingService');

/**
 * @desc Get authenticated user's saved routes
 * @route GET /api/routes/saved
 * @access Private (Authenticated)
 */
const getSavedRoutes = async (req, res, next) => {
  try {
    const routes = await SavedRoute.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Save a commuter route
 * @route POST /api/routes/saved
 * @access Private (Authenticated)
 */
const saveRoute = async (req, res, next) => {
  try {
    const { name, origin, destination, distanceKm, estimatedDurationMin, routeGeometry, alertRadiusKm, notes } = req.body;

    const saved = await SavedRoute.create({
      name,
      user: req.user._id,
      origin,
      destination,
      distanceKm,
      estimatedDurationMin,
      routeGeometry: routeGeometry || { type: 'LineString', coordinates: [] },
      alertRadiusKm: alertRadiusKm || 1.5,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Commuter route saved successfully.',
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update saved route details (e.g. name, notes, alert monitoring)
 * @route PATCH /api/routes/saved/:id
 * @access Private (Authenticated)
 */
const updateSavedRoute = async (req, res, next) => {
  try {
    const route = await SavedRoute.findOne({ _id: req.params.id, user: req.user._id });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Saved route not found' });
    }

    const { name, notes, isMonitored, alertRadiusKm } = req.body;
    if (name) route.name = name;
    if (notes !== undefined) route.notes = notes;
    if (isMonitored !== undefined) route.isMonitored = Boolean(isMonitored);
    if (alertRadiusKm !== undefined) route.alertRadiusKm = Number(alertRadiusKm);

    await route.save();

    res.json({
      success: true,
      message: 'Saved route updated.',
      data: route
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete a saved route
 * @route DELETE /api/routes/saved/:id
 * @access Private (Authenticated)
 */
const deleteSavedRoute = async (req, res, next) => {
  try {
    const route = await SavedRoute.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Saved route not found' });
    }

    res.json({
      success: true,
      message: 'Saved route removed from commuter bookmarks.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Recalculate route and check for live road hazards or closures along corridor
 * @route GET /api/routes/saved/:id/check
 * @access Private (Authenticated)
 */
const checkRouteHazards = async (req, res, next) => {
  try {
    const route = await SavedRoute.findOne({ _id: req.params.id, user: req.user._id });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Saved route not found' });
    }

    const recalculated = await calculateRoutes({
      origin: route.origin.coordinates,
      destination: route.destination.coordinates
    });

    const primaryOption = recalculated.routes[0];

    res.json({
      success: true,
      data: {
        savedRouteId: route._id,
        name: route.name,
        latestDistanceKm: primaryOption.distanceKm,
        latestDurationMin: primaryOption.estimatedDurationMin,
        hasClosures: primaryOption.hasClosures,
        hasIncidents: primaryOption.hasIncidents,
        closureWarnings: primaryOption.closureWarnings,
        incidentWarnings: primaryOption.incidentWarnings,
        geometry: primaryOption.geometry
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSavedRoutes,
  saveRoute,
  updateSavedRoute,
  deleteSavedRoute,
  checkRouteHazards
};
