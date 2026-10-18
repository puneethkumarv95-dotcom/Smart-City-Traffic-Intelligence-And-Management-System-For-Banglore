import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import incidentService from '../../services/incidentService';
import trafficService from '../../services/trafficService';
import { getSocket } from '../../services/socket';
import Badge from '../../components/ui/Badge';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Shield,
  Clock,
  Radio,
  Flame,
  Construction,
  Info,
  Compass,
  X
} from 'lucide-react';

// Custom Marker Generator for Leaflet
const createCustomMarker = (type, severity = 'medium') => {
  const colorMap = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#0ea5e9',
    closure: '#dc2626'
  };

  const bg = colorMap[severity] || '#0ea5e9';
  const iconSymbol = type === 'closure' ? '🚧' : severity === 'critical' ? '🚨' : '⚠️';

  return L.divIcon({
    className: 'custom-traffic-pin',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        background: ${bg};
        position: absolute;
        transform: rotate(-45deg);
        left: 50%;
        top: 50%;
        margin: -16px 0 0 -16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
        border: 2px solid white;
        cursor: pointer;
      ">
        <span style="transform: rotate(45deg); font-size: 13px; line-height: 1;">${iconSymbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Recenter Map Helper
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

export const LiveTrafficMapPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [closures, setClosures] = useState([]);
  const [trafficConditions, setTrafficConditions] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map state
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Bengaluru
  const [mapZoom, setMapZoom] = useState(12);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  // Layer Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showCongestion, setShowCongestion] = useState(true);
  const [showClosures, setShowClosures] = useState(true);
  const [showHotspots, setShowHotspots] = useState(false);

  // Filtering
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Bengaluru hubs quick jump
  const cityPresets = [
    { name: 'Majestic Hub', center: [12.9767, 77.5713], zoom: 14 },
    { name: 'Hebbal Flyover', center: [13.0358, 77.597], zoom: 14 },
    { name: 'Silk Board', center: [12.9177, 77.6238], zoom: 14 },
    { name: 'Whitefield', center: [12.9698, 77.75], zoom: 13 },
    { name: 'Electronic City', center: [12.8452, 77.6602], zoom: 13 },
    { name: 'Yelahanka', center: [13.1007, 77.5963], zoom: 13 }
  ];

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const [incRes, closeRes, condRes, hotRes] = await Promise.all([
        incidentService.getIncidents({ limit: 100 }),
        trafficService.getClosures({ isActive: true }),
        trafficService.getConditions(),
        trafficService.getHotspots()
      ]);

      setIncidents(incRes.data || []);
      setClosures(closeRes.data || []);
      setTrafficConditions(condRes.data || null);
      setHotspots(hotRes.data || []);
    } catch (err) {
      console.error('Failed to load live map layers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();

    // Listen to real-time events via Socket.IO
    const socket = getSocket();

    const handleIncidentUpdate = (data) => {
      fetchMapData();
    };

    const handleClosureCreated = (newClosure) => {
      setClosures((prev) => [newClosure, ...prev]);
    };

    const handleClosureUpdated = (updated) => {
      setClosures((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    };

    const handleClosureRemoved = ({ id }) => {
      setClosures((prev) => prev.filter((c) => c._id !== id));
    };

    socket.on('incident:new', handleIncidentUpdate);
    socket.on('incident:verified', handleIncidentUpdate);
    socket.on('incident:status_changed', handleIncidentUpdate);
    socket.on('closure:created', handleClosureCreated);
    socket.on('closure:updated', handleClosureUpdated);
    socket.on('closure:removed', handleClosureRemoved);

    return () => {
      socket.off('incident:new', handleIncidentUpdate);
      socket.off('incident:verified', handleIncidentUpdate);
      socket.off('incident:status_changed', handleIncidentUpdate);
      socket.off('closure:created', handleClosureCreated);
      socket.off('closure:updated', handleClosureUpdated);
      socket.off('closure:removed', handleClosureRemoved);
    };
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(14);
        setLocating(false);
      },
      (err) => {
        alert('Location permission denied or unavailable.');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Must be public/verified (not rejected or duplicate)
      if (['rejected', 'duplicate'].includes(inc.status)) return false;
      if (categoryFilter && inc.category !== categoryFilter) return false;
      if (severityFilter && inc.severity !== severityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = inc.title?.toLowerCase().includes(q);
        const matchesAddr = inc.address?.toLowerCase().includes(q);
        const matchesId = inc.incidentId?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAddr && !matchesId) return false;
      }
      return true;
    });
  }, [incidents, categoryFilter, severityFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Telemetry Header */}
      <div className="bg-city-card border border-city-border rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="cyan" size="sm">BENGALURU GIS TRAFFIC GRID</Badge>
            {trafficConditions && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  trafficConditions.isLiveProvider
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                ● {trafficConditions.isLiveProvider ? 'LIVE TELEMETRY ACTIVE' : 'DEMONSTRATION MODE (SIMULATED OBSERVATIONS)'}
              </span>
            )}
            <span className="text-xs font-mono text-slate-400">
              Updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Interactive Traffic Intelligence Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5">
            Real-time geospatial observation of verified road incidents, official diversions, arterial congestion overlays, and historical density clusters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            onClick={handleGetCurrentLocation}
            disabled={locating}
            className="px-3 py-2 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-electric-light flex items-center gap-1.5 transition-all"
            title="Locate my position"
          >
            <Compass className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Locating...' : 'My Location'}</span>
          </button>

          <button
            onClick={fetchMapData}
            disabled={loading}
            className="px-3.5 py-2 bg-city-surface hover:bg-city-hover border border-city-border rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
            title="Refresh Map Layers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Map Control Toolbar */}
      <div className="bg-city-card border border-city-border rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-electric-light" />
            <span>Layers:</span>
          </span>

          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              showIncidents
                ? 'bg-electric/20 text-electric-light border-electric/40'
                : 'bg-city-surface text-slate-400 border-city-border hover:text-slate-200'
            }`}
          >
            🚨 Incidents ({filteredIncidents.length})
          </button>

          <button
            onClick={() => setShowCongestion(!showCongestion)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              showCongestion
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-city-surface text-slate-400 border-city-border hover:text-slate-200'
            }`}
          >
            🚗 Congestion Corridors
          </button>

          <button
            onClick={() => setShowClosures(!showClosures)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              showClosures
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-city-surface text-slate-400 border-city-border hover:text-slate-200'
            }`}
          >
            🚧 Road Closures ({closures.length})
          </button>

          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              showHotspots
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-city-surface text-slate-400 border-city-border hover:text-slate-200'
            }`}
          >
            🔥 Density Heatmap
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
          >
            <option value="">All Incident Types</option>
            <option value="Road Accident">Road Accident</option>
            <option value="Pothole">Pothole / Crater</option>
            <option value="Traffic Congestion">Traffic Congestion</option>
            <option value="Road Flooding">Road Flooding</option>
            <option value="Broken Traffic Signal">Broken Traffic Signal</option>
            <option value="Road Closure">Road Closure</option>
            <option value="Illegal Parking">Illegal Parking</option>
            <option value="Other">Other Hazard</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white focus:outline-none focus:border-electric"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter location or ID..."
              className="pl-8 pr-3 py-1.5 bg-city-surface border border-city-border rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-electric w-full sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Preset Quick Jump Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Focus Corridor:</span>
        {cityPresets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              setMapCenter(preset.center);
              setMapZoom(preset.zoom);
            }}
            className="px-2.5 py-1 rounded-lg bg-city-card hover:bg-city-surface border border-city-border text-slate-300 hover:text-white whitespace-nowrap transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main Interactive Leaflet Map */}
      <div className="relative rounded-3xl overflow-hidden border border-city-border shadow-2xl h-[620px] sm:h-[680px] bg-city-dark">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#070b14' }}
        >
          <MapRecenter center={mapCenter} zoom={mapZoom} />

          {/* Official Free OpenStreetMap Layer (Styled via .leaflet-tile in index.css) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User's Current Location Marker */}
          {userLocation && (
            <Circle
              center={userLocation}
              radius={350}
              pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.25, weight: 2 }}
            >
              <Popup className="city-popup">
                <div className="p-1">
                  <p className="font-bold text-xs text-slate-900">Your Current GPS Location</p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Circle>
          )}

          {/* 1. Traffic Congestion Polylines (Step 3) */}
          {showCongestion &&
            trafficConditions?.corridors?.map((corridor) => (
              <Polyline
                key={corridor.corridorId}
                positions={corridor.coordinates.map(([lng, lat]) => [lat, lng])}
                pathOptions={{
                  color: corridor.color,
                  weight: 6,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              >
                <Popup className="city-popup">
                  <div className="p-2 space-y-1 text-slate-900">
                    <p className="font-bold text-xs">{corridor.name}</p>
                    <p className="text-[11px] font-mono">
                      Speed: <strong>{corridor.currentSpeedKmH} km/h</strong> (Normal: {corridor.freeFlowSpeedKmH} km/h)
                    </p>
                    <span
                      style={{ background: corridor.color }}
                      className="inline-block px-2 py-0.5 rounded text-[10px] text-white font-bold"
                    >
                      {corridor.statusLabel}
                    </span>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* 2. Road Closures (Step 6) */}
          {showClosures &&
            closures.map((closure) => {
              const [cLng, cLat] = closure.location?.coordinates || [77.5946, 12.9716];
              return (
                <Marker
                  key={closure._id}
                  position={[cLat, cLng]}
                  icon={createCustomMarker('closure', 'closure')}
                >
                  <Popup className="city-popup">
                    <div className="p-2 space-y-1.5 max-w-xs text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-100 text-red-700 font-bold">
                          {closure.closureId}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          {closure.severity} closure
                        </span>
                      </div>
                      <h4 className="font-bold text-xs">{closure.title}</h4>
                      <p className="text-[11px] text-slate-600 font-mono">{closure.roadName}</p>
                      <p className="text-xs text-slate-700">
                        <strong>Reason:</strong> {closure.reason}
                      </p>
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Diversion:</strong> {closure.diversionInstructions}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Valid Until: {new Date(closure.endTime).toLocaleDateString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* 3. Verified Incident Markers (Step 2) */}
          {showIncidents &&
            filteredIncidents.map((inc) => {
              const [lng, lat] = inc.location?.coordinates || [77.5946, 12.9716];
              return (
                <Marker
                  key={inc._id}
                  position={[lat, lng]}
                  icon={createCustomMarker('incident', inc.severity)}
                >
                  <Popup className="city-popup">
                    <div className="p-2 space-y-1.5 max-w-xs text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-sky-700">
                          {inc.incidentId}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                          {inc.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">{inc.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{inc.description}</p>
                      <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-sky-600 flex-shrink-0" />
                        <span>{inc.address}</span>
                      </p>

                      {/* Evidence image preview */}
                      {inc.images && inc.images.length > 0 && (
                        <div className="pt-1">
                          <img
                            src={inc.images[0].url}
                            alt="Incident Evidence"
                            className="w-full h-24 object-cover rounded border border-slate-200"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                        <span>Status: <strong>{inc.status?.replace('_', ' ')}</strong></span>
                        <a
                          href="/citizen/complaints"
                          className="text-sky-600 hover:text-sky-800 font-bold underline"
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* 4. Hotspot Density Clusters (Step 4) */}
          {showHotspots &&
            hotspots.map((spot, idx) => (
              <Circle
                key={idx}
                center={[spot.coordinates[1], spot.coordinates[0]]}
                radius={Math.max(200, spot.count * 150)}
                pathOptions={{
                  color: '#a855f7',
                  fillColor: '#c084fc',
                  fillOpacity: Math.min(0.65, spot.intensity),
                  weight: 1
                }}
              >
                <Popup className="city-popup">
                  <div className="p-2 space-y-1 text-slate-900">
                    <p className="font-bold text-xs text-purple-900">Incident Density Cluster</p>
                    <p className="text-xs">
                      Total Hazards Logged: <strong>{spot.count}</strong>
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Dominant Category: {spot.dominantCategory}
                    </p>
                    <p className="text-[10px] text-slate-500">{spot.sampleAddress}</p>
                  </div>
                </Popup>
              </Circle>
            ))}
        </MapContainer>

        {/* Legend Overlay Card */}
        <div className="absolute bottom-4 left-4 z-[400] bg-city-card/90 backdrop-blur-md border border-city-border rounded-2xl p-3.5 shadow-2xl max-w-xs hidden sm:block">
          <p className="text-xs font-bold text-white mb-2 font-mono flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-electric-light animate-pulse" />
            <span>Map Legend & Status</span>
          </p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Free Flowing (&ge; 45 km/h)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-slate-300">Moderate Delay (25-44 km/h)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-slate-300">Heavy Congestion (15-24 km/h)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-300">Severe Gridlock / Hazard (&lt; 15 km/h)</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-city-border/60">
              <span className="w-3 h-3 rounded bg-red-600 text-[9px] text-white flex items-center justify-center font-bold">🚧</span>
              <span className="text-slate-300">Official Road Closure Diversion</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrafficMapPage;

