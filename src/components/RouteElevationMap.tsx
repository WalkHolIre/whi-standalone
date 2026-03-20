// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function getWaypointIcon(waypointType) {
  // SVG icons for waypoint types based on provided designs
  const icons = {
    overnight: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNMTkgNEg1Yy0xLjEgMC0yIC45LTIgMnYxMGMwIDEuMS45IDIgMiAyaDE0YzEuMSAwIDItLjkgMi0yVjZjMC0xLjEtLjktMi0yLTJ6bTAgMTJINVY2aDE0djEweiIvPjwvc3ZnPg==',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    campsite: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNMTIgNEw2IDE2aDEybC02LTEyem0wIDZsLTIgNGg0bC0yLTR6Ii8+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    summit: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNMTMgMTlIMTFWOWgtMlY3aDZWOWgtMnYxMHptLTEtMTJjLTEuMSAwLTIgLjktMiAyczEuOCAyIDIgMjBjLjIgMCAxLjgtLjkgMS44LTJ6Ii8+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    lake: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNNSAxN2MwIDAgNi04IDE0LThzMyA4IDMgOEg1eiIvPjwvc3ZnPg==',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    river: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNNiA1YzIgMiA2IDIgNiAyczIgMiA2IDJ2M2MtNiAwLTEwLTMtMTItNXYtMXpNNiAxNWM0IDIgOCAyIDEyIDB2LTJjLTQgMS04IDEtMTItMXYzeiIvPjwvc3ZnPg==',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    waterfall: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNOCAxMFY0aDJ2NmgySFZ0aDJWMTBoMmMwLTEtMi00LTQtNHMtNCAzLTQgNHptLTIgNXYyaDF2LTJ6bTQgMHYyaDF2LTJ6Ii8+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    mountain_hut: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cGF0aCBkPSJNMTAgNEw0IDE0aDE2TDEwIDR6bS0yIDEwSDB2Mkg4VjE0em0xMCAwdjJoOHYtMmgtOHoiLz48L3N2Zz4=',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    parking: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHJ4PSIyIi8+PHRleHQgeD0iMTIiIHk9IjE2IiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlA8L3RleHQ+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    restaurant: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iNiIvPjxwYXRoIGQ9Ijk1IDE1czQgOCA0IDgiLz48cGF0aCBkPSJNMTUgNXMtNCA0LTQgOCIvPjwvc3ZnPg==',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    information_point: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHRleHQgeD0iMTIiIHk9IjE2IiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPmk8L3RleHQ+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    picnic: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48cmVjdCB4PSI3IiB5PSI5IiB3aWR0aD0iMTAiIGhlaWdodD0iMSIvPjxyZWN0IHg9IjYiIHk9IjEwIiB3aWR0aD0iMiIgaGVpZ2h0PSI2Ii8+PHJlY3QgeD0iMTYiIHk9IjEwIiB3aWR0aD0iMiIgaGVpZ2h0PSI2Ii8+PHJlY3QgeD0iOCIgeT0iNiIgd2lkdGg9IjgiIGhlaWdodD0iMyIgZmlsbD0iIzJCQjU1MCIvPjwvc3ZnPg==',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    default: {
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjMzMzMzIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4Ii8+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    }
  };

  return icons[waypointType] || icons.default;
}

function MapController({ coordinates, hoveredIndex }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates?.length > 1) {
      const lats = coordinates.map(c => c[0]);
      const lngs = coordinates.map(c => c[1]);
      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export default function RouteElevationMap({ route, hoveredIndex, onHover, onMapClick }) {
  const [currentMarker, setCurrentMarker] = useState(null);

  const coordinates = route?.gpx_coordinates || [];

  // Create single solid polyline
  const polylineSegments = coordinates.length > 1 ? [
    <Polyline
      key="route"
      positions={coordinates.map(c => [c[0], c[1]])}
      color="#3a5a40"
      weight={4}
      opacity={0.85}
      interactive={false}
    />
  ] : [];

  const mapCenter = route?.start_point ? [route.start_point.lat, route.start_point.lng] : [53, -8];

  // Update hover marker
  useEffect(() => {
    if (hoveredIndex !== null && coordinates[hoveredIndex]) {
      setCurrentMarker({
        lat: coordinates[hoveredIndex][0],
        lng: coordinates[hoveredIndex][1],
        ele: coordinates[hoveredIndex][2]
      });
    } else {
      setCurrentMarker(null);
    }
  }, [hoveredIndex, coordinates]);

  return (
    <MapContainer 
      center={mapCenter} 
      zoom={10} 
      className="w-full h-full rounded-lg"
      style={{ background: '#f0f9ff' }}
    >
      <TileLayer
        url="https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=e917d105f5cc4d22af2b818a5ae7f6b0"
        attribution='&copy; Thunderforest, &copy; OpenStreetMap contributors'
      />

      <MapController coordinates={coordinates} hoveredIndex={hoveredIndex} />
      <MapClickHandler onMapClick={onMapClick} />

      {/* Elevation-colored route */}
      {polylineSegments}

      {/* Start marker */}
      {route?.start_point && route.start_point.lat !== undefined && route.start_point.lng !== undefined && (
        <Marker 
          position={[route.start_point.lat, route.start_point.lng]}
          icon={greenIcon}
        >
          <Popup>Start: {route.start_point.name}</Popup>
        </Marker>
      )}

      {/* End marker */}
      {route?.end_point && route.end_point.lat !== undefined && route.end_point.lng !== undefined && (
        <Marker 
          position={[route.end_point.lat, route.end_point.lng]}
          icon={redIcon}
        >
          <Popup>End: {route.end_point.name}</Popup>
        </Marker>
      )}

      {/* Waypoints */}
      {route?.waypoints?.map((wp, idx) => {
        const iconConfig = getWaypointIcon(wp.type);
        const markerIcon = new L.Icon({
          iconUrl: iconConfig.url,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: iconConfig.iconSize,
          iconAnchor: iconConfig.iconAnchor,
          popupAnchor: iconConfig.popupAnchor,
          shadowSize: [41, 41]
        });
        
        return wp.lat !== undefined && wp.lng !== undefined ? (
          <Marker 
            key={idx}
            position={[wp.lat, wp.lng]}
            icon={markerIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{wp.name}</p>
                {wp.type && <p className="text-xs text-slate-500 capitalize">{wp.type.replace(/_/g, ' ')}</p>}
                {wp.description && <p className="text-xs text-slate-600">{wp.description}</p>}
              </div>
            </Popup>
          </Marker>
        ) : null;
      })}

      {/* Hover marker */}
      {currentMarker && (
        <Marker 
          position={[currentMarker.lat, currentMarker.lng]}
          icon={L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0IiBmaWxsPSIjMzY5NEU2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })}
        />
      )}
    </MapContainer>
  );
}