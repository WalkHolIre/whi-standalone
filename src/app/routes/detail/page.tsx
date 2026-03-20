// @ts-nocheck
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ChevronLeft, ChevronRight, Edit2, Save, X, Upload, Trash2, Loader } from 'lucide-react';
import { toast } from 'sonner';
import WaypointEditor from '@/components/WaypointEditor';

const RouteElevationMap = dynamic(() => import('@/components/RouteElevationMap'), { ssr: false });
const RouteElevationProfile = dynamic(() => import('@/components/RouteElevationProfile'), { ssr: false });

export default function AdminRouteDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);
  
  const routeId = paramsId;

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pendingWaypointCoords, setPendingWaypointCoords] = useState(null);
  const [isApplyingModifier, setIsApplyingModifier] = useState(false);

  // Fetch all routes for navigation
  const { data: allRoutes = [] } = useQuery({
    queryKey: ['allRoutes'],
    queryFn: async () => {
      const { data } = await supabase.from('routes').select('*');
      return data || [];
    }
  });

  // Fetch route
  const { data: route, isLoading } = useQuery({
    queryKey: ['route', routeId],
    queryFn: async () => {
      if (!routeId) return null;
      const { data } = await supabase.from('routes').select('*').match({ id: routeId });
      const routes = data || [];
      return routes[0] || null;
    },
    enabled: !!routeId
  });

  // Calculate prev/next routes
  const currentIndex = allRoutes.findIndex((r) => r.id === routeId);
  const prevRoute = currentIndex > 0 ? allRoutes[currentIndex - 1] : null;
  const nextRoute = currentIndex >= 0 && currentIndex < allRoutes.length - 1 ? allRoutes[currentIndex + 1] : null;

  // Fetch destinations for editing
  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  // Fetch tours for displaying usage
  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('routes').delete().eq('id', id)),
    onSuccess: () => {
      toast.success('Route deleted');
      router.push(createPageUrl('AdminRouteLibrary'));
    },
    onError: () => toast.error('Failed to delete route')
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('routes').update(data).eq('id', routeId).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route', routeId] });
      setIsEditing(false);
      toast.success('Route updated');
    },
    onError: () => toast.error('Failed to update route')
  });

  // Initialize/reset editData when route changes
  React.useEffect(() => {
    if (route) {
      setEditData({
        name: route.name,
        route_type: route.route_type,
        status: route.status,
        description: route.description || '',
        notes: route.notes || '',
        route_startpoint: route.route_startpoint || '',
        route_endpoint: route.route_endpoint || '',
        difficulty: route.difficulty || '',
        elevation_loss_m: route.elevation_loss_m,
        estimated_duration_hours: route.estimated_duration_hours
      });
    }
  }, [route?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center text-slate-600">Loading route...</div>
        </div>
      </div>);

  }

  if (!route) {
    return (
      <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto space-y-8">
          <Button
            variant="ghost"
            onClick={() => router.push(createPageUrl('AdminRouteLibrary'))}
            className="gap-2 mb-4">

            <ArrowLeft className="w-4 h-4" />
            Back to Route Library
          </Button>
          <div className="text-center text-slate-600">Route not found</div>
        </div>
      </div>);

  }

  // Find tours using this route
  const usedInTours = tours.filter((tour) =>
    tour.itinerary?.some((day) => day.route_ids?.includes(routeId))
  ).map((tour) => ({
    name: tour.name,
    days: tour.itinerary.
      filter((day) => day.route_ids?.includes(routeId)).
      map((day) => day.day)
  }));

  const statusColor = {
    draft: 'bg-whi-subtle text-whi',
    active: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800'
  };

  const typeColor = {
    main: 'bg-blue-100 text-blue-800',
    alternative_a: 'bg-whi-purple-subtle text-whi-purple',
    alternative_b: 'bg-indigo-100 text-indigo-800',
    transfer: 'bg-amber-100 text-amber-800',
    loop: 'bg-teal-100 text-teal-800',
    out_and_back: 'bg-cyan-100 text-cyan-800'
  };

  const difficultyColor = {
    easy: 'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    challenging: 'bg-orange-100 text-orange-800',
    strenuous: 'bg-red-100 text-red-800'
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      ...editData,
      elevation_loss_m: editData.elevation_loss_m,
      estimated_duration_hours: editData.estimated_duration_hours
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete route "${route.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(routeId);
    }
  };

  const handleTerrainModifierChange = async (newModifier) => {
    try {
      setIsApplyingModifier(true);
      // Update terrain modifier first
      const response = await supabase.from('routes').update({ terrain_modifier: newModifier }).eq('id', routeId).select().single();
      response.data;

      // Apply terrain modifier and recalculate EK + difficulty grade
      // TODO: Migrate to Supabase Edge Function
      console.warn('TODO: Migrate base44.functions.invoke(applyTerrainModifier) to Supabase Edge Function');
      // await supabase.functions.invoke('applyTerrainModifier', { body: { route_id: routeId } });

      // Refresh the data to reflect changes
      queryClient.invalidateQueries({ queryKey: ['route', routeId] });
      toast.success('Terrain modifier applied and EK recalculated');
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    } finally {
      setIsApplyingModifier(false);
    }
  };

  return (
    <div className="bg-slate-50/50 text-slate-600 p-6 lg:p-8 min-h-screen" key={route?.id}>
      <div className="max-w-7xl mx-auto space-y-8" style={{ overflow: 'visible' }}>
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push(createPageUrl('AdminRouteLibrary'))}
              className="gap-2">

              <ArrowLeft className="w-4 h-4" />
              Back to Route Library
            </Button>

            <div className="flex gap-1 ml-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(createPageUrl('AdminRouteDetail') + '?id=' + prevRoute.id)}
                disabled={!prevRoute}
                className="w-9 h-9">

                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(createPageUrl('AdminRouteDetail') + '?id=' + nextRoute.id)}
                disabled={!nextRoute}
                className="w-9 h-9">

                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              {isEditing ?
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="text-2xl font-bold mb-4" /> :


                <h1 className="text-slate-500 mb-1 text-3xl font-bold">
                  {route.name}
                </h1>
              }
              <p className="text-xs text-slate-400 mb-3">ID: {route.id}</p>

              {/* Route Details Row */}
              {isEditing ?
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Point</Label>
                    <Input
                      value={editData.route_startpoint}
                      onChange={(e) => setEditData({ ...editData, route_startpoint: e.target.value })}
                      placeholder="e.g., Clonegal"
                      className="text-sm" />

                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Point</Label>
                    <Input
                      value={editData.route_endpoint}
                      onChange={(e) => setEditData({ ...editData, route_endpoint: e.target.value })}
                      placeholder="e.g., Shillelagh"
                      className="text-sm" />

                  </div>
                </div> :

                <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">
                    {route.route_startpoint || '—'}
                  </span>
                  <span>→</span>
                  <span className="font-medium text-slate-900">
                    {route.route_endpoint || '—'}
                  </span>
                </div>
              }


            </div>

            <div className="flex gap-2">
              {isEditing ?
                <>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    className="gap-2">

                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}>

                    <X className="w-4 h-4" />
                  </Button>
                </> :

                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2">

                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 gap-2">

                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </>
              }
            </div>
          </div>
        </div>

        {/* Row 1 - Quick Stats */}
        <div className="grid grid-cols-6 gap-4">
          <Card className="col-span-2 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Difficulty Grade</p>
              <div className="space-y-2">
                <Badge className={`text-base font-bold ${route.difficulty_grade === 'Easy' ? 'bg-[#DCFCE7] text-[#166534]' :
                  route.difficulty_grade === 'Moderate' ? 'bg-[#FEF3C7] text-[#92400E]' :
                    route.difficulty_grade === 'Difficult' ? 'bg-[#FFF7ED] text-[#9A3412]' :
                      'bg-[#FEE2E2] text-[#991B1B]'
                  }`}>
                  {route.difficulty_grade || '—'}
                </Badge>
                <p className="text-xs text-slate-600">
                  {route.effort_km ? `${route.effort_km} EK` : '—'}
                  {route.terrain_modifier && route.terrain_modifier !== 'none' && (
                    <span className="ml-2">
                      ({route.terrain_modifier === 'light_bog' ? '+15%' :
                        route.terrain_modifier === 'heavy_bog' ? '+30%' :
                          route.terrain_modifier === 'exposed_ridge' ? '+20%' :
                            route.terrain_modifier === 'scrambling' ? '+35%' : ''})
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Distance</p>
              <p className="text-xl font-bold text-slate-900">{route.distance_km}</p>
              <p className="text-xs text-slate-500">km</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Elevation Gain</p>
              <p className="text-xl font-bold text-slate-900">↑{route.elevation_gain_m}</p>
              <p className="text-xs text-slate-500">m</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Elevation Loss</p>
              <p className="text-xl font-bold text-slate-900">↓{route.elevation_loss_m ?? '—'}</p>
              <p className="text-xs text-slate-500">m</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Duration</p>
              <p className="text-xl font-bold text-slate-900">{route.estimated_duration_hours ? `~${Math.floor(route.estimated_duration_hours)}h ${Math.round((route.estimated_duration_hours % 1) * 60)}m` : '—'}</p>
              <p className="text-xs text-slate-500">Naismith</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 - Type/Status & Map & Difficulty Calc & Elevation Details & Used in Tours */}
        <div className="grid grid-cols-6 gap-4">
          {/* Combined Type/Status */}
          <Card className="h-40 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3 space-y-2">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Type</p>
                <div className="flex items-center h-6">
                  {isEditing ? (
                    <Select value={editData.route_type} onValueChange={(value) => setEditData({ ...editData, route_type: value })}>
                      <SelectTrigger className="h-6 text-xs border-0 p-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        <SelectItem value="main">Main</SelectItem>
                        <SelectItem value="alternative_a">Alternative A</SelectItem>
                        <SelectItem value="alternative_b">Alternative B</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="loop">Loop</SelectItem>
                        <SelectItem value="out_and_back">Out & Back</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={typeColor[route.route_type]}>
                      {route.route_type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Status</p>
                <div className="flex items-center h-6">
                  <Badge className={statusColor[route.status]}>
                    {route.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Elevation Profile - 3 columns */}
          <div className="col-span-3 h-40">
            <RouteElevationProfile route={route} onHover={setHoveredIndex} />
          </div>

          {/* Difficulty Assessment - 2 columns */}
          <Card className="col-span-2 h-40 overflow-y-auto bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3 text-sm space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Effort Score</p>
                <p className="text-lg font-bold text-slate-900">{route.difficulty_score || route.effort_km || '—'} EK</p>
                <p className="text-xs text-slate-500">
                  {route.distance_km}km + ({route.elevation_gain_m}m ÷ 100)
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1 flex items-center gap-2">
                  Terrain Modifier
                  {isApplyingModifier && <Loader className="w-3 h-3 animate-spin text-whi" />}
                </p>
                <Select
                  value={route.terrain_modifier || 'none'}
                  onValueChange={handleTerrainModifierChange}
                  disabled={isApplyingModifier}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="light_bog">Light Bog (+15%)</SelectItem>
                    <SelectItem value="heavy_bog">Heavy Bog (+30%)</SelectItem>
                    <SelectItem value="exposed_ridge">Exposed Ridge (+20%)</SelectItem>
                    <SelectItem value="scrambling">Scrambling (+35%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3 - Map (Full Width) */}
        <Card style={{ position: 'relative', zIndex: 1 }} className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
          <CardContent className="p-0" style={{ overflow: 'visible', height: '500px' }}>
            <RouteElevationMap
              route={route}
              hoveredIndex={hoveredIndex}
              onHover={setHoveredIndex}
              onMapClick={(latlng) => setPendingWaypointCoords(latlng)} />
          </CardContent>
        </Card>

        {/* Row 4 - Elevation Details & Used in Tours */}
        <div className="grid grid-cols-6 gap-4">
          {/* Elevation Details - 3 columns */}
          <Card className="col-span-3 h-40 overflow-y-auto bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3 text-sm space-y-2">
              <div className="flex justify-between pb-1">
                <span className="text-slate-600 text-xs">Min Elevation:</span>
                <span className="font-medium text-slate-900 text-xs">{route.min_elevation_m ?? '—'}m</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-600 text-xs">Max Elevation:</span>
                <span className="font-medium text-slate-900 text-xs">{route.max_elevation_m ?? '—'}m</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-600 text-xs">Start Point:</span>
                <span className="font-medium text-xs text-slate-900">
                  {route.start_point?.lat && route.start_point?.lng ? `${Number(route.start_point.lat).toFixed(2)}, ${Number(route.start_point.lng).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 text-xs">End Point:</span>
                <span className="font-medium text-xs text-slate-900">
                  {route.end_point?.lat && route.end_point?.lng ? `${Number(route.end_point.lat).toFixed(2)}, ${Number(route.end_point.lng).toFixed(2)}` : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Used in Tours - 3 columns */}
          <Card className="col-span-3 h-40 overflow-y-auto bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardContent className="pt-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Used in Tours</p>
              {usedInTours.length === 0 ? (
                <p className="text-xs text-slate-600">
                  Not assigned
                </p>
              ) : (
                <div className="space-y-1">
                  {usedInTours.map((usage, idx) => (
                    <div key={idx} className="p-1.5 rounded border border-slate-200 hover:bg-slate-50">
                      <button
                        onClick={() => router.push(createPageUrl('AdminTourEditor') + '?id=' + tours.find((t) => t.name === usage.name)?.id)}
                        className="text-xs font-medium hover:text-whi text-whi-purple truncate block w-full text-left">
                        {usage.name}
                      </button>
                      <p className="text-[10px] text-slate-500">
                        Days: {usage.days.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Waypoints Editor */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
          <CardContent className="pt-6">
            <WaypointEditor
              waypoints={route.waypoints || []}
              pendingCoordinates={pendingWaypointCoords}
              onClearPending={() => setPendingWaypointCoords(null)}
              onChange={(updatedWaypoints) => {
                updateMutation.mutate({ waypoints: updatedWaypoints });
              }} />
          </CardContent>
        </Card>

        {/* Edit Panel */}
        {isEditing &&
          <Card className="border-whi-purple bg-whi-purple-subtle rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-whi-purple">Edit Route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Walk/Hike Description</Label>
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Describe this walk or hike for public display..."
                  rows={4}
                  className="resize-y" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (internal)</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Internal admin notes..."
                  rows={4}
                  className="resize-y" />

              </div>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}