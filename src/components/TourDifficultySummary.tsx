// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TourDifficultySummary({ itinerary = [], routes = [] }) {
  // Get walking day routes
  const walkingDays = itinerary
    .filter(day => day.route_ids && day.route_ids.length > 0)
    .map((day, idx) => {
      const primaryRouteId = day.route_ids[0];
      const route = routes.find(r => r.id === primaryRouteId);
      return {
        dayNumber: day.day,
        route,
        effortKm: route?.effort_km || 0,
        difficultyScore: route?.difficulty_score || route?.effort_km || 0,
        grade: route?.difficulty_grade || 'Unknown'
      };
    })
    .filter(d => d.route);

  if (walkingDays.length === 0) {
    return (
      <Card className="bg-slate-50">
        <CardContent className="pt-6 text-center text-slate-500">
          <p>No routes assigned yet. Assign routes to calculate tour difficulty.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalDistance = walkingDays.reduce((sum, d) => sum + (d.route.distance_km || 0), 0);
  const totalElevation = walkingDays.reduce((sum, d) => sum + (d.route.elevation_gain_m || 0), 0);
  const totalEffort = walkingDays.reduce((sum, d) => sum + d.effortKm, 0);
  
  const avgEffort = totalEffort / walkingDays.length;
  const avgDifficultyScore = walkingDays.reduce((sum, d) => sum + d.difficultyScore, 0) / walkingDays.length;
  
  const hardestDay = walkingDays.reduce((max, d) => d.effortKm > max.effortKm ? d : max, walkingDays[0]);
  
  // Determine overall grade
  let overallGrade;
  if (avgDifficultyScore < 18) overallGrade = 'Easy';
  else if (avgDifficultyScore < 25) overallGrade = 'Moderate';
  else if (avgDifficultyScore < 30) overallGrade = 'Challenging';
  else overallGrade = 'Challenging+';

  const gradeColor = {
    'Easy': 'bg-[#DCFCE7] text-[#166534]',
    'Moderate': 'bg-[#FEF3C7] text-[#92400E]',
    'Challenging': 'bg-[#FFF7ED] text-[#9A3412]',
    'Challenging+': 'bg-[#FEE2E2] text-[#991B1B]'
  };

  const barColor = {
    'Easy': '#22C55E',
    'Moderate': '#F59E0B',
    'Challenging': '#F17E00',
    'Challenging+': '#DC2626'
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-slate-900">Tour Difficulty Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Grade */}
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-2">Overall Grade</p>
          <Badge className={`text-lg px-4 py-2 font-bold ${gradeColor[overallGrade]}`}>
            {overallGrade}
          </Badge>
          <p className="text-xs text-slate-500 mt-2">Auto-calculated from route averages</p>
        </div>

        {/* Average vs Hardest */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-slate-50">
            <p className="text-xs text-slate-600 font-semibold uppercase mb-2">Average per day</p>
            <p className="text-2xl font-bold text-slate-900">{avgEffort.toFixed(1)} EK</p>
            <Badge className={`mt-2 ${gradeColor[overallGrade]}`}>{overallGrade}</Badge>
          </div>
          <div className="border rounded-lg p-4 bg-slate-50">
            <p className="text-xs text-slate-600 font-semibold uppercase mb-2">Hardest day</p>
            <p className="text-2xl font-bold text-slate-900">{hardestDay.effortKm.toFixed(1)} EK</p>
            <Badge className={`mt-2 ${gradeColor[hardestDay.grade]}`}>{hardestDay.grade}</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Total distance:</span>
            <span className="font-semibold text-slate-900">{totalDistance.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Total elevation:</span>
            <span className="font-semibold text-slate-900">{totalElevation.toLocaleString()}m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Total effort:</span>
            <span className="font-semibold text-slate-900">{totalEffort.toFixed(1)} EK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Walking days:</span>
            <span className="font-semibold text-slate-900">{walkingDays.length} of {itinerary.length} days</span>
          </div>
        </div>

        {/* Day-by-day bar chart */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Day-by-day difficulty:</p>
          {itinerary.map((day, idx) => {
            const walkingDay = walkingDays.find(d => d.dayNumber === day.day);
            
            if (!walkingDay) {
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 w-16">Day {day.day}:</span>
                  <span className="text-slate-500 italic">REST DAY</span>
                </div>
              );
            }

            const barWidth = (walkingDay.effortKm / 35) * 100; // Scale to 35 EK max
            const isHardest = walkingDay.dayNumber === hardestDay.dayNumber;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs w-16">Day {day.day}:</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(barWidth, 100)}%`,
                        backgroundColor: barColor[walkingDay.grade]
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 w-20">
                    {walkingDay.effortKm.toFixed(1)} EK
                  </span>
                  {isHardest && (
                    <span className="text-xs text-whi font-semibold">← Hardest</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 ml-[4.5rem]">
                  {walkingDay.route.name}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 italic">
          Scale: 0–35 EK • Bars coloured by grade: Easy (green), Moderate (amber), Challenging (orange), Challenging+ (red)
        </p>
      </CardContent>
    </Card>
  );
}