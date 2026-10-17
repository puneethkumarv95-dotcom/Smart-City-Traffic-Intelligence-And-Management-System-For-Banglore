import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import trafficService from '../../services/trafficService';
import Badge from '../../components/ui/Badge';
import {
  Bookmark,
  Navigation,
  Clock,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Edit,
  RefreshCw,
  Plus,
  CheckCircle,
  MapPin,
  ExternalLink
} from 'lucide-react';

export const SavedRoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [hazardResults, setHazardResults] = useState({});

  const fetchSavedRoutes = async () => {
    setLoading(true);
    try {
      const res = await trafficService.getSavedRoutes();
      setRoutes(res.data || []);
    } catch (err) {
      console.error('Failed to load saved routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedRoutes();
  }, []);

  const handleCheckHazards = async (routeId) => {
    setCheckingId(routeId);
    try {
      const res = await trafficService.checkSavedRouteHazards(routeId);
      setHazardResults((prev) => ({
        ...prev,
        [routeId]: res.data
      }));
    } catch (err) {
      alert('Failed to check hazards along route.');
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (routeId) => {
    if (!window.confirm('Delete this saved commute route?')) return;
    try {
      await trafficService.deleteSavedRoute(routeId);
      setRoutes((prev) => prev.filter((r) => r._id !== routeId));
    } catch (err) {
      alert('Failed to delete route.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">CITIZEN COMMUTE MONITOR</Badge>
            <span className="text-xs font-mono text-slate-400">Personalized Corridor Watch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Saved Commuter Routes
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Bookmark frequent journeys to receive real-time hazard notifications, check for newly reported potholes or road closures, and compute optimal departure timings.
          </p>
        </div>

        <button
          onClick={() => navigate('/citizen/routes')}
          className="px-4 py-2.5 bg-gradient-to-r from-electric-dark to-electric hover:from-electric to-electric-light text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-electric/20 self-start lg:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Plan & Save New Route</span>
        </button>
      </div>

      {/* Routes List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400">
          Loading saved commuter corridors...
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-city-card border border-city-border rounded-3xl p-12 text-center space-y-4">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Commuter Routes Saved Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You haven't bookmarked any frequent travel routes. Use the Smart Route Planner to calculate a route and save it to your profile for automated hazard alerts.
          </p>
          <button
            onClick={() => navigate('/citizen/routes')}
            className="px-4 py-2 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-electric-light inline-flex items-center gap-2 transition-all"
          >
            <span>Open Route Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {routes.map((route) => {
            const hazard = hazardResults[route._id];
            const isChecking = checkingId === route._id;

            return (
              <div
                key={route._id}
                className="bg-city-card border border-city-border hover:border-slate-600 rounded-3xl p-6 space-y-4 shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-electric-light flex-shrink-0" />
                      <span>{route.name}</span>
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Monitored Buffer: {route.alertRadiusKm || 1.5} km corridor
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(route._id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Route"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Origin to Destination Stepper */}
                <div className="space-y-2 py-2 border-y border-city-border/60 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                    <span className="text-slate-300 font-medium truncate">{route.origin.address}</span>
                  </div>
                  <div className="pl-1 border-l-2 border-dashed border-city-border ml-1 h-3"></div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                    <span className="text-slate-300 font-medium truncate">{route.destination.address}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    Distance: <strong className="text-white">{route.distanceKm} km</strong>
                  </span>
                  <span className="text-slate-400">
                    Baseline ETA: <strong className="text-electric-light">{route.estimatedDurationMin} mins</strong>
                  </span>
                </div>

                {/* Real-time Hazard Check Status Box */}
                {hazard && (
                  <div className="p-3.5 rounded-2xl bg-city-surface border border-city-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        Corridor Hazard Scan
                      </span>
                      {hazard.hasClosures ? (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          ⚠️ {hazard.closureWarnings.length} Closure Alert
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          ✓ No Closures Reported
                        </span>
                      )}
                    </div>

                    {hazard.hasClosures && (
                      <p className="text-[11px] text-rose-300">
                        <strong>Closure:</strong> {hazard.closureWarnings[0].title} (
                        {hazard.closureWarnings[0].roadName})
                      </p>
                    )}

                    {hazard.hasIncidents && (
                      <p className="text-[11px] text-amber-300">
                        <strong>Hazard:</strong> {hazard.incidentWarnings.length} active road incident(s) detected.
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleCheckHazards(route._id)}
                    disabled={isChecking}
                    className="flex-1 py-2 bg-city-surface hover:bg-city-hover border border-city-border hover:border-electric rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? 'Checking...' : 'Check Live Hazards'}</span>
                  </button>

                  <button
                    onClick={() => navigate('/citizen/routes')}
                    className="p-2 rounded-xl bg-city-surface hover:bg-city-hover border border-city-border text-slate-300 hover:text-white transition-colors"
                    title="Open in Route Planner"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedRoutesPage;

