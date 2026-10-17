import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Search } from 'lucide-react';

// Custom SVG pin marker for Leaflet
const createPinIcon = (color = '#0284c7') => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        position: absolute;
        transform: rotate(-45deg);
        left: 50%;
        top: 50%;
        margin: -16px 0 0 -16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        border: 2px solid white;
        cursor: grab;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

// Map click event listener component
const MapClickHandler = ({ onLocationSelected }) => {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

// Map recenter controller
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export const LocationPicker = ({
  latitude = 12.9716,
  longitude = 77.5946,
  onLocationChange,
  onAddressDetected,
  pinColor = '#0ea5e9'
}) => {
  const [position, setPosition] = useState([latitude, longitude]);
  const [locating, setLocating] = useState(false);
  const markerRef = useRef(null);

  useEffect(() => {
    if (latitude && longitude && (latitude !== position[0] || longitude !== position[1])) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Reverse geocode coordinates to readable address using OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'SCTIMS-SmartCityTraffic/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name && onAddressDetected) {
          onAddressDetected(data.display_name);
        }
      }
    } catch (e) {
      // Ignore network errors on reverse geocoding
    }
  };

  const handleSelectLocation = (lat, lng, shouldGeocode = true) => {
    setPosition([lat, lng]);
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
    if (shouldGeocode) {
      reverseGeocode(lat, lng);
    }
  };

  // Draggable marker handlers
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          handleSelectLocation(newPos.lat, newPos.lng);
        }
      }
    }),
    []
  );

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          handleSelectLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setLocating(false);
          // Fallback to Bengaluru Central Majestic
          handleSelectLocation(12.9767, 77.5713);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-city-border shadow-inner">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={position} />
        <MapClickHandler onLocationSelected={handleSelectLocation} />
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={position}
          ref={markerRef}
          icon={createPinIcon(pinColor)}
        />
      </MapContainer>

      {/* Floating GPS Location Button */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="px-3 py-1.5 bg-city-dark/90 hover:bg-city-card backdrop-blur-md text-white text-xs font-semibold rounded-xl border border-city-border shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
          title="Click to detect your current browser GPS coordinates"
        >
          <Navigation className={`w-3.5 h-3.5 text-electric-light ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Detecting...' : 'My GPS Location'}</span>
        </button>
      </div>

      {/* Coordinate & Draggable Tip Display Overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-city-dark/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-city-border text-[11px] font-mono text-slate-300 shadow-md flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-electric-light" />
        <span>
          Lat: {position[0].toFixed(5)}, Lng: {position[1].toFixed(5)} (Drag pin to adjust)
        </span>
      </div>
    </div>
  );
};

export default LocationPicker;
