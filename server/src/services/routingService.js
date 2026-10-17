const Incident = require('../models/Incident');
const RoadClosure = require('../models/RoadClosure');
const logger = require('../utils/logger');

/**
 * Haversine distance in meters between two lat/lng pairs
 */
const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate route between origin and destination coordinates
 * Coordinates format: [lng, lat]
 */
const calculateRoutes = async ({ origin, destination }) => {
  const [origLng, origLat] = origin;
  const [destLng, destLat] = destination;

  let osrmData = null;
  let isLiveOSRM = false;

  try {
    // 1. Fetch real-world turn-by-turn road geometry from OpenStreetMap OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    const response = await fetch(osrmUrl, {
      signal: AbortSignal.timeout(2500),
      headers: { 'User-Agent': 'SCTIMS-TrafficSystem/1.0' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        osrmData = data.routes;
        isLiveOSRM = true;
      }
    }
  } catch (err) {
    logger.warn(`OSRM external router unavailable or timed out: ${err.message}. Using synthetic road calculation fallback.`);
  }

  // 2. Fetch active road closures and active critical incidents in the bounding area
  const minLng = Math.min(origLng, destLng) - 0.05;
  const maxLng = Math.max(origLng, destLng) + 0.05;
  const minLat = Math.min(origLat, destLat) - 0.05;
  const maxLat = Math.max(origLat, destLat) + 0.05;

  const [activeClosures, activeIncidents] = await Promise.all([
    RoadClosure.find({
      isActive: true,
      'location.coordinates.0': { $gte: minLng, $lte: maxLng },
      'location.coordinates.1': { $gte: minLat, $lte: maxLat }
    }).select('closureId title roadName reason diversionInstructions severity location address'),
    Incident.find({
      status: { $in: ['submitted', 'verified', 'assigned', 'in_progress'] },
      severity: { $in: ['critical', 'high'] },
      'location.coordinates.0': { $gte: minLng, $lte: maxLng },
      'location.coordinates.1': { $gte: minLat, $lte: maxLat }
    }).select('incidentId title category severity location address')
  ]);

  // Helper to cross-reference route waypoints with closures and incidents
  const checkIntersections = (coordinates) => {
    const closureWarnings = [];
    const incidentWarnings = [];

    // Sample waypoints every 5th point to keep check fast
    const samplePoints = coordinates.filter((_, idx) => idx % 4 === 0 || idx === coordinates.length - 1);

    activeClosures.forEach((closure) => {
      const [cLng, cLat] = closure.location.coordinates;
      const isNearby = samplePoints.some(([ptLng, ptLat]) => {
        return haversineMeters(ptLat, ptLng, cLat, cLng) <= 800; // 800 meters corridor buffer
      });
      if (isNearby) {
        closureWarnings.push({
          closureId: closure.closureId,
          title: closure.title,
          roadName: closure.roadName,
          reason: closure.reason,
          diversion: closure.diversionInstructions,
          severity: closure.severity,
          address: closure.address,
          coordinates: [cLng, cLat]
        });
      }
    });

    activeIncidents.forEach((inc) => {
      const [iLng, iLat] = inc.location.coordinates;
      const isNearby = samplePoints.some(([ptLng, ptLat]) => {
        return haversineMeters(ptLat, ptLng, iLat, iLng) <= 600;
      });
      if (isNearby) {
        incidentWarnings.push({
          incidentId: inc.incidentId,
          title: inc.title,
          category: inc.category,
          severity: inc.severity,
          address: inc.address,
          coordinates: [iLng, iLat]
        });
      }
    });

    return { closureWarnings, incidentWarnings };
  };

  // Build Route Options (Primary + Alternative)
  let routeResults = [];

  if (isLiveOSRM && osrmData) {
    routeResults = osrmData.map((r, index) => {
      const distanceKm = +(r.distance / 1000).toFixed(2);
      const durationMin = Math.round(r.duration / 60);
      const coords = r.geometry.coordinates; // [[lng, lat], ...]
      const { closureWarnings, incidentWarnings } = checkIntersections(coords);

      return {
        id: `route-${index + 1}`,
        name: index === 0 ? 'Primary Recommended Route' : `Alternative Route ${index}`,
        isPrimary: index === 0,
        distanceKm,
        estimatedDurationMin: durationMin,
        etaDisclaimer: 'Non-traffic-aware ETA (OSRM standard road speed baseline). Live traffic delays may add 15-30%.',
        geometry: {
          type: 'LineString',
          coordinates: coords
        },
        closureWarnings,
        incidentWarnings,
        hasClosures: closureWarnings.length > 0,
        hasIncidents: incidentWarnings.length > 0
      };
    });
  } else {
    // Synthetic Geometric Fallback (e.g. if offline or network restricted)
    const directDistanceMeters = haversineMeters(origLat, origLng, destLat, destLng);
    const roadDistanceKm = +( (directDistanceMeters * 1.35) / 1000 ).toFixed(2); // 35% road winding factor
    const roadDurationMin = Math.round((roadDistanceKm / 32) * 60); // 32 km/h avg urban speed

    // Generate 5 interpolated intermediate waypoints
    const coords = [];
    for (let i = 0; i <= 6; i++) {
      const ratio = i / 6;
      const lng = +(origLng + (destLng - origLng) * ratio).toFixed(6);
      const lat = +(origLat + (destLat - origLat) * ratio).toFixed(6);
      coords.push([lng, lat]);
    }

    const { closureWarnings, incidentWarnings } = checkIntersections(coords);

    routeResults.push({
      id: 'route-1',
      name: 'Primary Estimated Route',
      isPrimary: true,
      distanceKm: roadDistanceKm,
      estimatedDurationMin: roadDurationMin,
      etaDisclaimer: 'Demonstration Mode: Estimated geometric route. OSRM router offline.',
      geometry: {
        type: 'LineString',
        coordinates: coords
      },
      closureWarnings,
      incidentWarnings,
      hasClosures: closureWarnings.length > 0,
      hasIncidents: incidentWarnings.length > 0
    });
  }

  return {
    origin: { coordinates: [origLng, origLat] },
    destination: { coordinates: [destLng, destLat] },
    routesCount: routeResults.length,
    routes: routeResults,
    provider: isLiveOSRM ? 'OpenStreetMap OSRM Routing Engine' : 'SCTIMS Transit Geometric Fallback'
  };
};

module.exports = {
  calculateRoutes,
  haversineMeters
};

