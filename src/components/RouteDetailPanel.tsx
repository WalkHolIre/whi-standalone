// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download } from 'lucide-react';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const startIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'brightness-100'
});

const endIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-90'
});

export default function RouteDetailPanel({ route, onBack, routes = [] }) {
  const [elevationData, setElevationData] = useState([]);

  useEffect(() => {
    if (route?.gpx_coordinates) {
      let distance = 0;
      const data = route.gpx_coordinates.map((coord, idx) => {
        if (idx > 0) {
          const [lat1, lng1] = route.gpx_coordinates[idx - 1];
          const [lat2, lng2] = coord;
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance += R * c;
        }
        return {
          distance: Math.round(distance * 100) / 100,
          elevation: coord[2] || 0,
          lat: coord[0],
          lng: coord[1]
        };
      });
      setElevationData(data);
    }
  }, [route]);

  if (!route) return null;

  const statusColor = {
    draft: 'bg-orange-100 text-orange-800',
    active: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800'
  };

  const routeTypeColor = {
    main: 'bg-blue-100 text-blue-800',
    alternative_a: 'bg-purple-100 text-purple-800',
    alternative_b: 'bg-indigo-100 text-indigo-800',
    transfer: 'bg-amber-100 text-amber-800',
    loop: 'bg-teal-100 text-teal-800',
    out_and_back: 'bg-cyan-100 text-cyan-800'
  };

  const mapCenter = route.start_point ? [route.start_point.lat, route.start_point.lng] : [53, -8];
  const coords = route.gpx_coordinates?.map(c => [c[0], c[1]]) || [];

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{route.name}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge className={routeTypeColor[route.route_type]}>
                  {route.route_type.replace(/_/g, ' ')}
                </Badge>
                <Badge className={statusColor[route.status]}>
                  {route.status}
                </Badge>
                {route.difficulty && (
                  <Badge variant="outline">
                    {route.difficulty}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Download GPX
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0 h-96">
          <MapContainer center={mapCenter} zoom={10} className="w-full h-full rounded-lg" style={{ borderRadius: '0.5rem' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {coords.length > 0 && <Polyline positions={coords} color="#1B4D3E" weight={3} />}
            {route.start_point && (
              <Marker position={[route.start_point.lat, route.start_point.lng]} icon={startIcon}>
                <Popup>Start</Popup>
              </Marker>
            )}
            {route.end_point && (
              <Marker position={[route.end_point.lat, route.end_point.lng]} icon={endIcon}>
                <Popup>End</Popup>
              </Marker>
            )}
            {route.waypoints?.map((wp, idx) => (
              <Marker key={idx} position={[wp.lat, wp.lng]}>
                <Popup>{wp.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Distance</p>
            <p className="text-2xl font-bold text-slate-900">{route.distance_km} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Elevation Gain</p>
            <p className="text-2xl font-bold text-slate-900">+{route.elevation_gain_m} m</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Duration</p>
            <p className="text-2xl font-bold text-slate-900">~{route.estimated_duration_hours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Elevation Loss</p>
            <p className="text-2xl font-bold text-slate-900">-{route.elevation_loss_m} m</p>
          </CardContent>
        </Card>
      </div>

      {/* Elevation Profile */}
      {elevationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Elevation Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={elevationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="distance"
                  label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="elevation"
                  stroke="#1B4D3E"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Elevation Range</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Min:</span>
              <span className="font-medium">{route.min_elevation_m} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Max:</span>
              <span className="font-medium">{route.max_elevation_m} m</span>
            </div>
          </CardContent>
        </Card>

        {route.waypoints?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Waypoints ({route.waypoints.length})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {route.waypoints.slice(0, 3).map((wp, idx) => (
                <div key={idx} className="text-slate-600">
                  {wp.name}
                </div>
              ))}
              {route.waypoints.length > 3 && (
                <div className="text-xs text-slate-500">
                  +{route.waypoints.length - 3} more
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {route.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {route.notes}
          </CardContent>
        </Card>
      )}
    </div>
  );
}