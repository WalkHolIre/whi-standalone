// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RouteUploadModal({ open, onClose, destinations = [], tours = [], onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    route_type: 'main',
    terrain_modifier: 'none',
    route_startpoint: '',
    route_endpoint: '',
    destination_id: '',
    tour_id: '',
    notes: ''
  });

  const [gpxFile, setGpxFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [forceUpload, setForceUpload] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const parseGPX = (gpxText) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(gpxText, 'text/xml');

    // Check for parsing errors
    if (xml.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid GPX file format');
    }

    // Get all track points
    let trkpts = xml.querySelectorAll('trkpt');
    const coordinates = [];

    trkpts.forEach(pt => {
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      const eleNode = pt.querySelector('ele');
      const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
      coordinates.push([String(lat), String(lon), String(ele)]);
    });

    // If no track points, try route points
    if (coordinates.length === 0) {
      const rtepts = xml.querySelectorAll('rtept');
      rtepts.forEach(pt => {
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        const eleNode = pt.querySelector('ele');
        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
        coordinates.push([String(lat), String(lon), String(ele)]);
      });
    }

    if (coordinates.length === 0) {
      throw new Error('No route data found in this GPX file. Make sure it contains track points (<trkpt> elements).');
    }

    // Extract waypoints
    const wptElements = xml.querySelectorAll('wpt');
    const waypoints = [];
    wptElements.forEach(wpt => {
      const lat = parseFloat(wpt.getAttribute('lat'));
      const lon = parseFloat(wpt.getAttribute('lon'));
      const nameNode = wpt.querySelector('name');
      const descNode = wpt.querySelector('desc');
      waypoints.push({
        lat,
        lng: lon,
        name: nameNode ? nameNode.textContent : '',
        description: descNode ? descNode.textContent : ''
      });
    });

    // Calculate stats
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let i = 0; i < coordinates.length; i++) {
      const [lat, lon, ele] = coordinates[i];
      if (ele < minElevation) minElevation = ele;
      if (ele > maxElevation) maxElevation = ele;

      if (i > 0) {
        const [prevLat, prevLon, prevEle] = coordinates[i - 1];

        // Haversine distance
        const R = 6371;
        const dLat = ((lat - prevLat) * Math.PI) / 180;
        const dLon = ((lon - prevLon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((prevLat * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;

        // Elevation changes
        const eleDiff = ele - prevEle;
        if (eleDiff > 0) elevationGain += eleDiff;
        if (eleDiff < 0) elevationLoss += Math.abs(eleDiff);
      }
    }

    // Naismith's rule: 5km/hr + 1hr per 600m ascent
    const duration = totalDistance / 5 + elevationGain / 600;

    // Calculate difficulty
    const effortKm = totalDistance + (elevationGain / 100);
    const terrainMultipliers = { "none": 1.0, "light_bog": 1.15, "heavy_bog": 1.3, "exposed_ridge": 1.2, "scrambling": 1.35 };
    const adjustedScore = effortKm * (terrainMultipliers['none'] || 1.0);
    let grade = "Easy";
    if (adjustedScore > 10) grade = "Moderate";
    if (adjustedScore > 18) grade = "Difficult";
    if (adjustedScore > 25) grade = "Challenging";

    // Downsample to max 500 points
    let downsampled = coordinates;
    if (coordinates.length > 500) {
      downsampled = [coordinates[0]];
      const step = (coordinates.length - 1) / 499;
      for (let i = 1; i < 499; i++) {
        downsampled.push(coordinates[Math.round(i * step)]);
      }
      downsampled.push(coordinates[coordinates.length - 1]);
    }

    // Ensure all coordinate values are strings
    downsampled = downsampled.map(coord => [String(coord[0]), String(coord[1]), String(coord[2])]);

    return {
      coordinates: downsampled,
      waypoints,
      distance_km: Math.round(totalDistance * 10) / 10,
      elevation_gain_m: Math.round(elevationGain),
      elevation_loss_m: Math.round(elevationLoss),
      min_elevation_m: Math.round(minElevation),
      max_elevation_m: Math.round(maxElevation),
      estimated_duration_hours: Math.round(duration * 10) / 10,
      effort_km: Math.round(effortKm * 10) / 10,
      difficulty_score: Math.round(adjustedScore * 10) / 10,
      difficulty_grade: grade,
      start_point:
        coordinates.length > 0
          ? { lat: String(coordinates[0][0]), lng: String(coordinates[0][1]) }
          : null,
      end_point:
        coordinates.length > 0
          ? {
              lat: String(coordinates[coordinates.length - 1][0]),
              lng: String(coordinates[coordinates.length - 1][1])
            }
          : null
    };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]?.name.endsWith('.gpx')) {
      readGPXFile(files[0]);
    } else {
      toast.error('Please upload a .gpx file');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]?.name.endsWith('.gpx')) {
      readGPXFile(e.target.files[0]);
    } else {
      toast.error('Please select a .gpx file');
    }
  };

  const readGPXFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gpxText = e.target.result;
        const parsed = parseGPX(gpxText);
        setParsedData(parsed);
        setGpxFile(file);
      } catch (error) {
        toast.error(error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Route name is required');
      return;
    }

    if (!gpxFile || !parsedData) {
      toast.error('GPX file is required');
      return;
    }

    // Check for duplicates if not forcing upload
    if (!forceUpload) {
      const fingerprint = generateFingerprint(parsedData, parsedData.coordinates.length);
      const duplicate = await checkForDuplicates(fingerprint);

      if (duplicate) {
        setDuplicateWarning({
          fingerprint,
          existingRouteName: duplicate.name
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Upload GPX file to Supabase Storage
      const fileExt = gpxFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, gpxFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl: file_url } } = supabase.storage.from('images').getPublicUrl(filePath);

      // Generate fingerprint
      const fingerprint = generateFingerprint(parsedData, parsedData.coordinates.length);

      // Auto-generate slug
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Create route with parsed data
      const { data: created } = await supabase.from('routes').insert({
        name: formData.name,
        route_type: formData.route_type,
        terrain_modifier: formData.terrain_modifier || 'none',
        route_startpoint: formData.route_startpoint || null,
        route_endpoint: formData.route_endpoint || null,
        gpx_coordinates: parsedData.coordinates,
        distance_km: parsedData.distance_km,
        elevation_gain_m: parsedData.elevation_gain_m,
        elevation_loss_m: parsedData.elevation_loss_m,
        estimated_duration_hours: parsedData.estimated_duration_hours,
        min_elevation_m: parsedData.min_elevation_m,
        max_elevation_m: parsedData.max_elevation_m,
        base_effort_km: parsedData.effort_km,
        effort_km: parsedData.effort_km,
        difficulty_score: parsedData.difficulty_score,
        difficulty_grade: parsedData.difficulty_grade,
        waypoints: parsedData.waypoints,
        destination_id: formData.destination_id || null,
        notes: formData.notes,
        status: 'draft'
      }).select().single();

      toast.success(
        `Route saved: ${parsedData.distance_km} km, ↑ ${parsedData.elevation_gain_m}m, ~${parsedData.estimated_duration_hours} hrs`
      );
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
      setForceUpload(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', route_type: 'main', terrain_modifier: 'none', route_startpoint: '', route_endpoint: '', destination_id: '', tour_id: '', notes: '' });
    setGpxFile(null);
    setParsedData(null);
    setDuplicateWarning(null);
    setForceUpload(false);
    onClose();
  };

  const generateFingerprint = (parsedRouteData, totalPoints) => {
    const firstCoord = parsedRouteData.coordinates[0];
    const lastCoord = parsedRouteData.coordinates[parsedRouteData.coordinates.length - 1];
    const distance = (Math.round(parsedRouteData.distance_km * 10) / 10).toFixed(1);
    
    return `${firstCoord[0]}-${firstCoord[1]}-${lastCoord[0]}-${lastCoord[1]}-${totalPoints}-${distance}`;
  };

  const checkForDuplicates = async (fingerprint) => {
    const { data } = await supabase.from('routes').select('*');
    const existingRoutes = data || [];
    return existingRoutes.find(route => route.gpx_fingerprint === fingerprint);
  };

  return (
    <>
      <Dialog open={duplicateWarning ? true : open} onOpenChange={(isOpen) => {
        if (!isOpen && duplicateWarning) {
          setDuplicateWarning(null);
        } else if (!isOpen) {
          handleClose();
        }
      }}>
        {duplicateWarning ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-whi-dark">Duplicate GPX File Detected</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-slate-600 mb-2">
                This GPX file appears to match an existing route:
              </p>
              <p className="font-semibold text-slate-900 mb-4">
                {duplicateWarning.existingRouteName}
              </p>
              <p className="text-sm text-slate-600">
                Do you want to upload it anyway?
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDuplicateWarning(null)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setForceUpload(true);
                  setDuplicateWarning(null);
                  handleSubmit();
                }}
                className="bg-whi text-white hover:bg-whi-hover"
              >
                Upload Anyway
              </Button>
            </div>
          </DialogContent>
        ) : (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload New Route</DialogTitle>
            </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Route Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Kerry Way Stage 3 Main"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route_type">Route Type</Label>
              <Select value={formData.route_type} onValueChange={(value) => handleInputChange('route_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="alternative_a">Alternative A</SelectItem>
                  <SelectItem value="alternative_b">Alternative B</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="loop">Loop</SelectItem>
                  <SelectItem value="out_and_back">Out & Back</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terrain_modifier">Terrain Modifier</Label>
              <Select value={formData.terrain_modifier} onValueChange={(value) => handleInputChange('terrain_modifier', value)}>
                <SelectTrigger>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="route_startpoint">Start Point (Optional)</Label>
                  <Input
                  id="route_startpoint"
                  value={formData.route_startpoint}
                  onChange={(e) => handleInputChange('route_startpoint', e.target.value)}
                  placeholder="e.g., Clonegal"
                  />
                  </div>

                  <div className="space-y-2">
                  <Label htmlFor="route_endpoint">End Point (Optional)</Label>
                  <Input
                  id="route_endpoint"
                  value={formData.route_endpoint}
                  onChange={(e) => handleInputChange('route_endpoint', e.target.value)}
                  placeholder="e.g., Shillelagh"
                  />
                  </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="destination">Destination (Optional)</Label>
              <Select value={formData.destination_id} onValueChange={(value) => handleInputChange('destination_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="__none__">— None —</SelectItem>
                   {destinations.map(dest => (
                     <SelectItem key={dest.id} value={dest.id}>
                       {dest.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
                </Select>
                </div>

                <div className="space-y-2">
                <Label htmlFor="tour">Tour (Optional)</Label>
                <Select value={formData.tour_id} onValueChange={(value) => handleInputChange('tour_id', value === '__none__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {tours.map(tour => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
                </div>
                </div>

          <div className="space-y-2">
            <Label>GPX File *</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
              }`}
            >
              {gpxFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-600">{gpxFile.name}</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium mb-1">Drag and drop your GPX file here</p>
                  <p className="text-xs text-slate-500 mb-3">or click to browse</p>
                  <input
                    type="file"
                    accept=".gpx"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <input
                    type="file"
                    accept=".gpx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Internal admin notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name.trim() || !gpxFile}
            className="gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Uploading...' : 'Upload & Parse'}
          </Button>
        </div>
          </DialogContent>
        )}
        </Dialog>
        </>
        );
        }