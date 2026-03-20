// @ts-nocheck
"use client";

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPOITypeBadgeClass } from './POITypeConfig';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Day colors palette
const DAY_COLORS = [
  '#1B4D3E', '#E46A25', '#8B4789', '#2E7D32', '#D32F2F',
  '#1976D2', '#F57C00', '#7B1FA2', '#388E3C', '#C62828',
  '#0288D1', '#EF6C00', '#6A1B9A', '#43A047', '#B71C1C'
];

function MapController({ selectedDayIndex, itinerary, routes }) {
  const map = useMap();

  useEffect(() => {
    if (selectedDayIndex !== null && itinerary[selectedDayIndex]) {
      const day = itinerary[selectedDayIndex];
      const primaryRouteId = day.route_ids?.[0];
      const route = routes.find(r => r.id === primaryRouteId);
      
      if (route?.gpx_coordinates && route.gpx_coordinates.length > 0) {
        const bounds = L.latLngBounds(route.gpx_coordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [selectedDayIndex, itinerary, routes, map]);

  return null;
}

export default function ItineraryMapPanel({ itinerary, selectedDayIndex, routes }) {
  const getLocationIcon = (type) => {
    const iconMap = {
      scenic: '🎨',
      historic: '🏛️',
      pre_historic: '🗿',
      viewpoint: '👁️',
      village: '🏘️',
      landmark: '📍',
      nature: '🌿',
      summit: '⛰️'
    };
    return iconMap[type] || '📍';
  };

  return (
    <Card className="bg-white sticky top-6">
      <CardHeader>
        <CardTitle>Route Map</CardTitle>
        <CardDescription>Visual overview of all routes and locations</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '500px', marginBottom: '1rem' }}>
          <MapContainer
            center={[53.0, -8.0]}
            zoom={7}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            <MapController 
              selectedDayIndex={selectedDayIndex} 
              itinerary={itinerary}
              routes={routes}
            />

            {/* Render routes for each day */}
            {itinerary.map((day, idx) => {
              const primaryRouteId = day.route_ids?.[0];
              const route = routes.find(r => r.id === primaryRouteId);
              const dayColor = DAY_COLORS[idx % DAY_COLORS.length];
              const isSelected = selectedDayIndex === idx;

              if (!route?.gpx_coordinates || route.gpx_coordinates.length === 0) return null;

              return (
                <React.Fragment key={idx}>
                  <Polyline
                    positions={route.gpx_coordinates}
                    color={dayColor}
                    weight={isSelected ? 5 : 3}
                    opacity={isSelected ? 1 : 0.6}
                  />

                  {/* Start point */}
                  {route.start_location?.lat && (
                    <Marker position={[route.start_location.lat, route.start_location.lng]}>
                      <Popup>
                        <div className="text-sm">
                          <strong>Day {day.day} Start</strong><br />
                          {route.start_location.name}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* End point / Overnight */}
                  {day.overnight_location?.lat && (
                    <Marker position={[day.overnight_location.lat, day.overnight_location.lng]}>
                      <Popup>
                        <div className="text-sm">
                          <strong>Day {day.day} Overnight</strong><br />
                          {day.overnight_location.name}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Daily locations */}
                  {day.daily_locations?.map((loc, locIdx) => {
                    if (!loc.lat) return null;
                    return (
                      <Marker key={locIdx} position={[loc.lat, loc.lng]}>
                        <Popup>
                          <div className="text-sm">
                            <strong>{getLocationIcon(loc.type)} {loc.name}</strong><br />
                            <span className="text-xs text-slate-500 capitalize">{loc.type?.replace('_', ' ')}</span>
                            {loc.description && <p className="mt-1 text-xs">{loc.description}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-600">Day Colors</h4>
          <div className="flex flex-wrap gap-2">
            {itinerary.slice(0, 10).map((day, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] }}
                />
                <span className="text-xs text-slate-600">Day {day.day}</span>
              </div>
            ))}
            {itinerary.length > 10 && (
              <span className="text-xs text-slate-500">+{itinerary.length - 10} more</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}