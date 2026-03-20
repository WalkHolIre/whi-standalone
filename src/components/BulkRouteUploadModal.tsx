// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const parseGPX = (gpxText) => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, 'text/xml');

  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid GPX file format');
  }

  let trkpts = xml.querySelectorAll('trkpt');
  const coordinates = [];

  trkpts.forEach(pt => {
    const lat = parseFloat(pt.getAttribute('lat'));
    const lon = parseFloat(pt.getAttribute('lon'));
    const eleNode = pt.querySelector('ele');
    const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
    coordinates.push([String(lat), String(lon), String(ele)]);
  });

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
    throw new Error('No route data found in GPX file');
  }

  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minElevation = coordinates[0][2] ? parseFloat(coordinates[0][2]) : 0;
  let maxElevation = coordinates[0][2] ? parseFloat(coordinates[0][2]) : 0;

  for (let i = 1; i < coordinates.length; i++) {
    const [lat, lon, ele] = coordinates[i];
    const [prevLat, prevLon, prevEle] = coordinates[i - 1];

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const prevLatNum = parseFloat(prevLat);
    const prevLonNum = parseFloat(prevLon);
    const eleNum = parseFloat(ele);
    const prevEleNum = parseFloat(prevEle);

    const R = 6371;
    const dLat = ((latNum - prevLatNum) * Math.PI) / 180;
    const dLon = ((lonNum - prevLonNum) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((prevLatNum * Math.PI) / 180) *
        Math.cos((latNum * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;

    const eleDiff = eleNum - prevEleNum;
    if (eleDiff > 0) elevationGain += eleDiff;
    else elevationLoss += Math.abs(eleDiff);
    
    minElevation = Math.min(minElevation, eleNum);
    maxElevation = Math.max(maxElevation, eleNum);
  }

  // Calculate difficulty
  const effortKm = totalDistance + (elevationGain / 100);
  const adjustedScore = effortKm * 1.0; // none terrain modifier
  let grade = "Easy";
  if (adjustedScore > 10) grade = "Moderate";
  if (adjustedScore > 18) grade = "Difficult";
  if (adjustedScore > 25) grade = "Challenging";

  let downsampled = coordinates;
  if (coordinates.length > 500) {
    downsampled = [coordinates[0]];
    const step = (coordinates.length - 1) / 499;
    for (let i = 1; i < 499; i++) {
      downsampled.push(coordinates[Math.round(i * step)]);
    }
    downsampled.push(coordinates[coordinates.length - 1]);
  }

  downsampled = downsampled.map(coord => [String(coord[0]), String(coord[1]), String(coord[2])]);

  return {
    distance_km: Math.round(totalDistance * 10) / 10,
    elevation_gain_m: Math.round(elevationGain),
    elevation_loss_m: Math.round(elevationLoss),
    min_elevation_m: Math.round(minElevation),
    max_elevation_m: Math.round(maxElevation),
    effort_km: Math.round(effortKm * 10) / 10,
    difficulty_score: Math.round(adjustedScore * 10) / 10,
    difficulty_grade: grade,
    coordinates: downsampled
  };
};

export default function BulkRouteUploadModal({ open, onClose, onSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const generateRouteName = (fileName) => {
    return fileName
      .replace(/\.gpx$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.gpx')
    );

    if (droppedFiles.length === 0) {
      toast.error('Please drop .gpx files only');
      return;
    }

    setFiles(prev => [...prev, ...droppedFiles]);
    setUploadProgress(prev => [
      ...prev,
      ...droppedFiles.map(f => ({
        fileName: f.name,
        status: 'pending',
        distance: null,
        elevation: null,
        error: null
      }))
    ]);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f =>
      f.name.endsWith('.gpx')
    );

    if (selectedFiles.length === 0) {
      toast.error('Please select .gpx files only');
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
    setUploadProgress(prev => [
      ...prev,
      ...selectedFiles.map(f => ({
        fileName: f.name,
        status: 'pending',
        distance: null,
        elevation: null,
        error: null
      }))
    ]);
  };

  const processFiles = async () => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Update status to parsing
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i].status = 'parsing';
          return updated;
        });

        // Parse GPX
        const reader = new FileReader();
        const parsed = await new Promise((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const gpxText = e.target.result;
              const parsed = parseGPX(gpxText);
              resolve(parsed);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        // Update with parsed data
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i].status = 'saving';
          updated[i].distance = parsed.distance_km;
          updated[i].elevation = parsed.elevation_gain_m;
          return updated;
        });

        // Upload GPX file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl: file_url } } = supabase.storage.from('images').getPublicUrl(filePath);

        // Create route
        const routeName = generateRouteName(file.name);
        const slug = routeName.toLowerCase().replace(/\s+/g, '-');

        const { data: created } = await supabase.from('routes').insert({
          name: routeName,
          route_type: 'main',
          terrain_modifier: 'none',
          route_startpoint: null,
          route_endpoint: null,
          gpx_coordinates: parsed.coordinates,
          distance_km: parsed.distance_km,
          elevation_gain_m: parsed.elevation_gain_m,
          elevation_loss_m: parsed.elevation_loss_m || 0,
          estimated_duration_hours: 0,
          min_elevation_m: parsed.min_elevation_m || 0,
          max_elevation_m: parsed.max_elevation_m || 0,
          base_effort_km: parsed.effort_km,
          effort_km: parsed.effort_km,
          difficulty_score: parsed.difficulty_score,
          difficulty_grade: parsed.difficulty_grade,
          status: 'draft'
        }).select().single();

        // Mark as done
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i].status = 'done';
          return updated;
        });
      } catch (error) {
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i].status = 'error';
          updated[i].error = error.message;
          return updated;
        });
      }
    }

    setIsProcessing(false);
  };

  const handleClose = () => {
    setFiles([]);
    setUploadProgress([]);
    onClose();
  };

  const successCount = uploadProgress.filter(p => p.status === 'done').length;
  const totalCount = uploadProgress.length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Routes</DialogTitle>
        </DialogHeader>

        {uploadProgress.length === 0 ? (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium mb-1">Drag multiple GPX files here</p>
              <p className="text-xs text-slate-500 mb-3">or click to browse</p>
              <input
                type="file"
                accept=".gpx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="bulk-file-input"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('bulk-file-input').click()}
                className="w-full"
              >
                Select Files
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
              {uploadProgress.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded border border-slate-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.fileName}</p>
                    {item.distance && (
                      <p className="text-xs text-slate-500">
                        {item.distance} km • ↑{item.elevation}m
                      </p>
                    )}
                    {item.error && (
                      <p className="text-xs text-red-600">{item.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {item.status === 'pending' && (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                    {item.status === 'parsing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {item.status === 'saving' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {item.status === 'done' && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isProcessing && uploadProgress.some(p => p.status === 'pending') && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="gap-2 flex-1"
                >
                  <Upload className="w-4 h-4" />
                  Start Upload ({uploadProgress.length} files)
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing file {uploadProgress.findIndex(p => p.status === 'parsing' || p.status === 'saving') + 1} of {totalCount}</span>
              </div>
            )}

            {!isProcessing && uploadProgress.some(p => p.status !== 'pending') && (
              <div className="p-3 rounded-lg bg-slate-100">
                <p className="text-sm font-medium text-slate-900">
                  {successCount} of {totalCount} routes uploaded successfully
                </p>
              </div>
            )}

            {!isProcessing && (
              <Button
                onClick={() => {
                  handleClose();
                  onSuccess?.();
                }}
                className="w-full"
              >
                Done
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}