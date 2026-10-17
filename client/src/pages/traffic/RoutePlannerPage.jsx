import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import trafficService from '../../services/trafficService';
import Badge from '../../components/ui/Badge';
import {
  Navigation,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Bookmark,
  CheckCircle,
  RefreshCw,
  Search,
  Shuffle,
  Info
} from 'lucide-react';

// Marker pin icons
const createPin = (color, text) =>
  L.divIcon({
    className: 'custom-route-pin',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${color};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        border: 2px solid white;
      ">
        ${text}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

// Recenter Map Helper
const MapRecenter = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

export const RoutePlannerPage = () => {
  const [originAddr, setOriginAddr] = useState('Majestic Central Hub');
  const [originCoords, setOriginCoords] = useState([77.5713, 12.9767]); // [lng, lat]

  const [destAddr, setDestAddr] = useState('Hebbal Flyover Junction');
  const [destCoords, setDestCoords] = useState([77.597, 13.0358]); // [lng, lat]

  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('route-1');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [routeNameInput, setRouteNameInput] = useState('');

  // Popular commuter presets in Bengaluru
  const routePresets = [
    {
      name: 'Majestic to Hebbal Flyover (Airport Corridor)',
      orig: { addr: 'Kempegowda Station, Majestic', coords: [77.5713, 12.9767] },
      dest: { addr: 'Hebbal Flyover Junction, ORR', coords: [77.597, 13.0358] }
    },
    {
      name: 'Silk Board to Electronic City Tollway',
      orig: { addr: 'Central Silk Board Junction', coords: [77.6238, 12.9177] },
      dest: { addr: 'Electronic City Tollgate Phase 1', coords: [77.6602, 12.8452] }
    },
    {
      name: 'Hebbal to Whitefield (IT Corridor)',
      orig: { addr: 'Hebbal Flyover Junction', coords: [77.597, 13.0358] },
      dest: { addr: 'ITPL Main Gate, Whitefield', coords: [77.75, 12.9698] }
    },
    {
      name: 'Majestic to Silk Board',
      orig: { addr: 'Majestic City Hub', coords: [77.5713, 12.9767] },
      dest: { addr: 'Silk Board Confluence', coords: [77.6238, 12.9177] }
    }
  ];

  const handleCalculateRoute = async (oCoords = originCoords, dCoords = destCoords) => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      const res = await trafficService.calculateRoute(oCoords, dCoords);
      setRouteResult(res.data);
      if (res.data?.routes?.length > 0) {
        setSelectedRouteId(res.data.routes[0].id);
        setRouteNameInput(`${originAddr.split(',')[0]} to ${destAddr.split(',')[0]}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to calculate route navigation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCalculateRoute();
  }, []);

  const handleApplyPreset = (preset) => {
    setOriginAddr(preset.orig.addr);
    setOriginCoords(preset.orig.coords);
    setDestAddr(preset.dest.addr);
    setDestCoords(preset.dest.coords);
    handleCalculateRoute(preset.orig.coords, preset.dest.coords);
  };

  const handleSaveCurrentRoute = async () => {
    if (!selectedRoute) return;
    setSaving(true);
    try {
      await trafficService.saveRoute({
        name: routeNameInput || `${originAddr} to ${destAddr}`,
        origin: { address: originAddr, coordinates: originCoords },
        destination: { address: destAddr, coordinates: destCoords },
        distanceKm: selectedRoute.distanceKm,
        estimatedDurationMin: selectedRoute.estimatedDurationMin,
        routeGeometry: selectedRoute.geometry,
        notes: `Saved via smart route navigator (${selectedRoute.name})`
      });
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaving(false);
      alert(err.response?.data?.message || 'Failed to save route. Please ensure you are logged in.');
    }
  };

  const selectedRoute = routeResult?.routes?.find((r) => r.id === selectedRouteId) || routeResult?.routes?.[0];

  // Map bounding box from route coordinates
  const routeBounds = selectedRoute?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [
    [originCoords[1], originCoords[0]],
    [destCoords[1], destCoords[0]]
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-city-card border border-city-border rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">SMART URBAN MOBILITY</Badge>
            <span className="text-xs font-mono text-slate-400">OSRM Road Geometry & Hazard Intersections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Smart Route Planner & Navigation
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Compare alternative paths, inspect distance and estimated travel times, detect active road closures along your corridor, and save frequent commute routes.
          </p>
        </div>
      </div>

      {/* Preset Route Selectors */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Commuter Corridors:</span>
        {routePresets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleApplyPreset(preset)}
            className="px-3 py-1.5 rounded-xl bg-city-card hover:bg-city-surface border border-city-border text-slate-300 hover:text-white whitespace-nowrap transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main Grid: Left Controls & Comparisons, Right Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Panel & Route Comparison Cards */}
        <div className="lg:col-span-5 space-y-4">
          {/* Waypoints Input Card */}
          <div className="bg-city-card border border-city-border rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-electric-light" />
              <span>Waypoints Configuration</span>
            </h3>

            {/* Origin Input */}
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Origin (Start Point)</label>
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-emerald-500 absolute left-3 top-1/2 -translate-y-1/2"></span>
                <input
                  type="text"
                  value={originAddr}
                  onChange={(e) => setOriginAddr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-electric"
                />
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1 pl-1">
                Coordinates: [{originCoords[0].toFixed(4)}, {originCoords[1].toFixed(4)}]
              </p>
            </div>

            {/* Destination Input */}
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Destination</label>
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-rose-500 absolute left-3 top-1/2 -translate-y-1/2"></span>
                <input
                  type="text"
                  value={destAddr}
                  onChange={(e) => setDestAddr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-city-surface border border-city-border rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-electric"
                />
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1 pl-1">
                Coordinates: [{destCoords[0].toFixed(4)}, {destCoords[1].toFixed(4)}]
              </p>
            </div>

            <button
              onClick={() => handleCalculateRoute()}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-electric-dark to-electric hover:from-electric to-electric-light text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-electric/20 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Calculating Paths...' : 'Calculate Routes'}</span>
            </button>
          </div>

          {/* Route Options Comparison Cards */}
          {routeResult && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
                <Shuffle className="w-3.5 h-3.5 text-electric-light" />
                <span>Available Route Options ({routeResult.routes.length})</span>
              </h3>

              {routeResult.routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-city-card border-electric shadow-lg shadow-electric/10 ring-1 ring-electric/50'
                        : 'bg-city-card/60 hover:bg-city-card border-city-border hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{route.name}</span>
                        {route.isPrimary && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-electric-light">
                          {route.estimatedDurationMin} mins
                        </span>
                        <span className="text-xs text-slate-400 font-mono block">
                          {route.distanceKm} km
                        </span>
                      </div>
                    </div>

                    {/* Closure or Incident Warnings */}
                    {route.hasClosures && (
                      <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[11px]">Active Road Closure on Corridor</p>
                          <p className="text-[10px] text-rose-400">
                            {route.closureWarnings[0].title} ({route.closureWarnings[0].roadName})
                          </p>
                        </div>
                      </div>
                    )}

                    {route.hasIncidents && !route.hasClosures && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="text-[10px]">
                          {route.incidentWarnings.length} active hazard reported along path.
                        </span>
                      </div>
                    )}

                    <p className="text-[10px] font-mono text-slate-400 mt-2 italic">
                      {route.etaDisclaimer}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Route Action */}
          {selectedRoute && (
            <div className="bg-city-card border border-city-border rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-electric-light" />
                <span>Bookmark Commuter Corridor</span>
              </h4>
              <input
                type="text"
                value={routeNameInput}
                onChange={(e) => setRouteNameInput(e.target.value)}
                placeholder="Route Nickname (e.g., Morning Office Commute)"
                className="w-full px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
              />
              <button
                onClick={handleSaveCurrentRoute}
                disabled={saving}
                className="w-full py-2 bg-city-surface hover:bg-city-hover border border-city-border hover:border-electric rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Route Saved to Your Profile!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 text-electric-light" />
                    <span>{saving ? 'Saving...' : 'Save to My Routes'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Route Map Visualization */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl overflow-hidden border border-city-border shadow-2xl h-[580px] lg:h-[700px] bg-city-dark relative">
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={12}
              style={{ height: '100%', width: '100%', background: '#070b14' }}
            >
              <MapRecenter bounds={routeBounds} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />

              {/* Origin Marker */}
              <Marker
                position={[originCoords[1], originCoords[0]]}
                icon={createPin('#10b981', 'A')}
              >
                <Popup className="city-popup">
                  <div className="p-1">
                    <p className="font-bold text-xs text-slate-900">Origin (Start Point)</p>
                    <p className="text-[11px] text-slate-600">{originAddr}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker
                position={[destCoords[1], destCoords[0]]}
                icon={createPin('#ef4444', 'B')}
              >
                <Popup className="city-popup">
                  <div className="p-1">
                    <p className="font-bold text-xs text-slate-900">Destination</p>
                    <p className="text-[11px] text-slate-600">{destAddr}</p>
                  </div>
                </Popup>
              </Marker>

              {/* All Alternative Routes (dimmed) */}
              {routeResult?.routes
                ?.filter((r) => r.id !== selectedRouteId)
                .map((alt) => (
                  <Polyline
                    key={alt.id}
                    positions={alt.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
                    pathOptions={{ color: '#64748b', weight: 4, opacity: 0.5, dashArray: '6, 8' }}
                  />
                ))}

              {/* Selected Primary Polyline */}
              {selectedRoute?.geometry?.coordinates && (
                <Polyline
                  positions={selectedRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
                  pathOptions={{
                    color: selectedRoute.hasClosures ? '#f43f5e' : '#0ea5e9',
                    weight: 6,
                    opacity: 0.9
                  }}
                />
              )}

              {/* Conflict Closure Markers */}
              {selectedRoute?.closureWarnings?.map((cls, i) => (
                <Marker
                  key={i}
                  position={[cls.coordinates[1], cls.coordinates[0]]}
                  icon={createPin('#dc2626', '🚧')}
                >
                  <Popup className="city-popup">
                    <div className="p-1 text-slate-900">
                      <p className="font-bold text-xs text-rose-700">Road Closure Intersected</p>
                      <p className="text-xs font-semibold">{cls.title}</p>
                      <p className="text-[11px] text-slate-600">Diversion: {cls.diversion}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Provider info overlay badge */}
            <div className="absolute top-4 right-4 z-[400] bg-city-card/90 backdrop-blur-md border border-city-border rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300 shadow-xl">
              Engine: {routeResult?.provider || 'OSRM Public Router'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlannerPage;

