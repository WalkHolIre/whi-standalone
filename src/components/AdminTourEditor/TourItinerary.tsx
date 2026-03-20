// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import WHIRichEditor from '../WHIRichEditor';
import RouteAssignment from '../RouteAssignment';
import { POI_TYPE_OPTIONS } from '../POITypeConfig';
import { getFieldKey, getParsedArrayField } from '../LanguageAwareInput';

export default function TourItinerary({
  itinerary,
  selectedLanguage,
  formData,
  routes,
  saveMutation,
  selectedDayOnMap,
  expandedDay,
  totals,
  handleInputChange,
  addDay,
  updateDay,
  deleteDay,
  moveDayUp,
  moveDayDown,
  handleAssignRoute,
  handleRemoveRoute,
  handleReorderRoutes,
  addLocation,
  updateLocation,
  removeLocation,
  setExpandedDay,
  setSelectedDayOnMap,
  isTranslating,
  onSave
}) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="w-full">
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900">Daily Itinerary</CardTitle>
                <CardDescription>Assign routes from library and manage locations</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={onSave} disabled={saveMutation.isPending} className="bg-slate-500 text-white px-3 text-xs font-medium rounded-[10px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-whi-hover" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button onClick={addDay} className="bg-slate-500 text-white px-4 py-2 text-sm font-medium rounded-[10px] inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 gap-2 hover:bg-whi-hover" disabled={isTranslating}>
                  <Plus className="w-4 h-4" />Add Day
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {itinerary.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No days added yet. Click "Add Day" to start building your itinerary.</p>
            ) : (
              <>
                {itinerary.map((day, idx) => {
                  const primaryRouteId = day.route_ids?.[0];
                  const primaryRoute = routes.find((r) => r.id === primaryRouteId);
                  const numRoutes = day.route_ids?.length || 0;
                  const gradeColor = {
                    'Easy': 'bg-[#DCFCE7] text-[#166534]',
                    'Moderate': 'bg-[#FEF3C7] text-[#92400E]',
                    'Challenging': 'bg-[#FFF7ED] text-[#9A3412]',
                    'Challenging+': 'bg-[#FEE2E2] text-[#991B1B]'
                  };

                  return (
                    <div key={idx} className={`border rounded-lg p-4 ${selectedDayOnMap === idx ? 'border-whi-dark' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => {
                          setExpandedDay(expandedDay === idx ? null : idx);
                          setSelectedDayOnMap(idx);
                        }}>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); moveDayUp(idx); }} disabled={idx === 0} className="bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-50 border-slate-300">
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); moveDayDown(idx); }} disabled={idx === itinerary.length - 1} className="bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-50 border-slate-300">
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <h3 className="font-semibold text-lg">Day {day.day}: {day.title || 'Untitled'}</h3>
                          {primaryRoute ? (
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-blue-50">{primaryRoute.distance_km} km</Badge>
                              <Badge variant="outline" className="bg-amber-50">↑ {primaryRoute.elevation_gain_m || 0}m</Badge>
                              {primaryRoute.estimated_duration_hours && (
                                <Badge variant="outline" className="bg-purple-50">~{Math.floor(primaryRoute.estimated_duration_hours)}h {Math.round(primaryRoute.estimated_duration_hours % 1 * 60)}m</Badge>
                              )}
                              {primaryRoute.effort_km && <Badge variant="outline" className={gradeColor[primaryRoute.difficulty_grade]}>{primaryRoute.effort_km.toFixed(1)} EK</Badge>}
                              {primaryRoute.difficulty_grade && <Badge className={gradeColor[primaryRoute.difficulty_grade]}>{primaryRoute.difficulty_grade}</Badge>}
                              {numRoutes > 1 && <Badge className="bg-whi-dark text-white">{numRoutes} routes</Badge>}
                            </div>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">⚠️ No route</Badge>
                          )}
                        </div>
                        <Button size="icon" onClick={() => deleteDay(idx)} className="bg-red-600 text-white hover:bg-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {expandedDay === idx && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          <div className="space-y-2">
                            <Label>Day Title</Label>
                            <Input value={day.title} onChange={(e) => updateDay(idx, 'title', e.target.value)} placeholder="e.g., Killarney to Black Valley" disabled={isTranslating} />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <WHIRichEditor value={day.description || ''} onChange={(html) => updateDay(idx, 'description', html)} minHeight="120px" disabled={isTranslating} />
                          </div>
                          <RouteAssignment dayIndex={idx} day={day} onAssignRoute={handleAssignRoute} onRemoveRoute={handleRemoveRoute} onReorderRoutes={handleReorderRoutes} destinationId={formData.destination_id} />
                          <div className="space-y-2">
                            <Label>Overnight Location</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <Input placeholder="Location name" value={day.overnight_location?.name || ''} onChange={(e) => updateDay(idx, 'overnight_location', { ...day.overnight_location, name: e.target.value })} disabled={isTranslating} />
                              <Input type="number" step="0.000001" placeholder="Latitude" value={day.overnight_location?.lat || ''} onChange={(e) => updateDay(idx, 'overnight_location', { ...day.overnight_location, lat: parseFloat(e.target.value) || 0 })} disabled={isTranslating} />
                              <Input type="number" step="0.000001" placeholder="Longitude" value={day.overnight_location?.lng || ''} onChange={(e) => updateDay(idx, 'overnight_location', { ...day.overnight_location, lng: parseFloat(e.target.value) || 0 })} disabled={isTranslating} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Points of Interest</Label>
                              <Button size="sm" variant="outline" onClick={() => addLocation(idx)} className="gap-2" disabled={isTranslating}>
                                <Plus className="w-3 h-3" />Add Location
                              </Button>
                            </div>
                            {day.daily_locations && day.daily_locations.map((loc, locIdx) => (
                              <div key={locIdx} className="grid grid-cols-7 gap-2 p-2 rounded bg-slate-50">
                                <Input placeholder="Name" value={loc.name} onChange={(e) => updateLocation(idx, locIdx, 'name', e.target.value)} disabled={isTranslating} />
                                <Select value={loc.type} onValueChange={(value) => updateLocation(idx, locIdx, 'type', value)} disabled={isTranslating}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {POI_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Input placeholder="Description" value={loc.description} onChange={(e) => updateLocation(idx, locIdx, 'description', e.target.value)} disabled={isTranslating} />
                                <Input type="number" step="0.000001" placeholder="Lat" value={loc.lat} onChange={(e) => updateLocation(idx, locIdx, 'lat', parseFloat(e.target.value) || 0)} disabled={isTranslating} />
                                <Input type="number" step="0.000001" placeholder="Lng" value={loc.lng} onChange={(e) => updateLocation(idx, locIdx, 'lng', parseFloat(e.target.value) || 0)} disabled={isTranslating} />
                                <Button size="icon" onClick={() => removeLocation(idx, locIdx)} className="bg-red-600 text-white hover:bg-red-700">
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Totals */}
                <div className="mt-6 p-4 rounded-lg bg-slate-100 border border-slate-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Calculated Totals (Primary Routes)</h3>
                    <Button size="sm" className="text-white bg-whi hover:bg-whi-hover gap-2" disabled={isTranslating}>
                      <Save className="w-4 h-4" />Save to Tour
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-slate-800">Total Distance</Label>
                      <p className="text-2xl font-bold text-slate-900">{totals.totalDistance} km</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-800">Total Elevation</Label>
                      <p className="text-2xl font-bold text-slate-900">{totals.totalElevation} m</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-800">Walking Days</Label>
                      <p className="text-2xl font-bold text-slate-900">{totals.walkingDays}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-800">Avg Daily Distance</Label>
                      <p className="text-2xl font-bold text-slate-900">{totals.avgDistance} km</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mt-3">Calculated from primary routes • Min: {totals.minDistance}km • Max: {totals.maxDistance}km</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}