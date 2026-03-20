// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RouteElevationProfile({ route, onHover }) {
  const elevationData = useMemo(() => {
    if (!route?.gpx_coordinates) return [];

    let distance = 0;
    return route.gpx_coordinates.map((coord, idx) => {
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
        index: idx
      };
    });
  }, [route]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      onHover?.(data.index);
      return (
        <div className="bg-slate-800 text-white p-2 rounded border border-slate-600">
          <p className="text-xs">
            {data.distance.toFixed(1)} km @ {Math.round(data.elevation)}m
          </p>
        </div>
      );
    }
    onHover?.(null);
    return null;
  };

  if (elevationData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500 text-center">No elevation data</p>
        </CardContent>
      </Card>
    );
  }

  const minEle = Math.min(...elevationData.map(d => d.elevation));
  const maxEle = Math.max(...elevationData.map(d => d.elevation));

  return (
    <Card>
      <CardContent className="pt-3">
        <div className="w-full h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={elevationData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stopColor="#210747" stopOpacity={0.8}/>
                   <stop offset="50%" stopColor="#3F0F87" stopOpacity={0.8}/>
                   <stop offset="100%" stopColor="#B58DB6" stopOpacity={0.8}/>
                 </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="distance" 
                type="number"
                label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -5 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
                domain={[Math.floor(minEle / 100) * 100, Math.ceil(maxEle / 100) * 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="elevation" 
                stroke="#1B4D3E" 
                fill="url(#colorElevation)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}