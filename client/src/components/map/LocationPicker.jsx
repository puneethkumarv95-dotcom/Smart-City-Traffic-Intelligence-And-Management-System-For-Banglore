import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

// Custom SVG pin marker for Leaflet
const createPinIcon = (color = '#0284c7') => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        position: absolute;
        transform: rotate(-45deg);
        left: 50%;
        top: 50%;
        margin: -15px 0 0 -15px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        border: 2px solid white;
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
    iconSize: [30, 30],
    iconAnchor: [15, 30]
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
  pinColor = '#0ea5e9'
}) => {
  const [position, setPosition] = useState([latitude, longitude]);

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleSelectLocation = (lat, lng) => {
    setPosition([lat, lng]);
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSelectLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback to Bengaluru Central Majestic
          handleSelectLocation(12.9767, 77.5713);
        }
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
        <Marker position={position} icon={createPinIcon(pinColor)} />
      </MapContainer>

      {/* Floating GPS Location Button */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          type="button"
          onClick={handleLocateMe}
          className="px-3 py-1.5 bg-city-dark/90 hover:bg-city-card backdrop-blur-md text-white text-xs font-semibold rounded-xl border border-city-border shadow-lg flex items-center gap-1.5 transition-all"
        >
          <Navigation className="w-3.5 h-3.5 text-electric-light" />
          <span>My GPS Location</span>
        </button>
      </div>

      {/* Coordinate Display Overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-city-dark/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-city-border text-[11px] font-mono text-slate-300 shadow-md">
        <span>Lat: {position[0].toFixed(5)}, Lng: {position[1].toFixed(5)}</span>
      </div>
    </div>
  );
};

export default LocationPicker;
