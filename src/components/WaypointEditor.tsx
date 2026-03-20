// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X } from 'lucide-react';

export default function WaypointEditor({ waypoints = [], onChange, pendingCoordinates, onClearPending }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingWaypoint, setEditingWaypoint] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newWaypoint, setNewWaypoint] = useState({
    name: '',
    type: 'waypoint',
    lat: '',
    lng: '',
    description: ''
  });

  // Auto-open form with coordinates from map click
  React.useEffect(() => {
    if (pendingCoordinates) {
      setNewWaypoint({
        name: '',
        type: 'waypoint',
        lat: pendingCoordinates.lat.toFixed(6),
        lng: pendingCoordinates.lng.toFixed(6),
        description: ''
      });
      setIsAdding(true);
    }
  }, [pendingCoordinates]);

  const handleAdd = () => {
    if (!newWaypoint.name || !newWaypoint.lat || !newWaypoint.lng) {
      return;
    }

    const wp = {
      ...newWaypoint,
      lat: parseFloat(newWaypoint.lat),
      lng: parseFloat(newWaypoint.lng)
    };

    onChange([...waypoints, wp]);
    setNewWaypoint({ name: '', type: 'waypoint', lat: '', lng: '', description: '' });
    setIsAdding(false);
    if (onClearPending) onClearPending();
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewWaypoint({ name: '', type: 'waypoint', lat: '', lng: '', description: '' });
    if (onClearPending) onClearPending();
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditingWaypoint({ ...waypoints[index] });
  };

  const handleSaveEdit = () => {
    const updated = [...waypoints];
    updated[editingIndex] = {
      ...editingWaypoint,
      lat: parseFloat(editingWaypoint.lat),
      lng: parseFloat(editingWaypoint.lng)
    };
    onChange(updated);
    setEditingIndex(null);
    setEditingWaypoint(null);
  };

  const handleDelete = (index) => {
    if (confirm('Delete this waypoint?')) {
      onChange(waypoints.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-700">Waypoints & POIs ({waypoints.length})</h3>
        <Button
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="gap-2">
          <Plus className="w-4 h-4" />
          Add Waypoint
        </Button>
      </div>

      {isAdding && (
        <div className="p-4 bg-slate-50 rounded-lg border-2 border-whi-purple space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
              value={newWaypoint.name}
              onChange={(e) => setNewWaypoint({ ...newWaypoint, name: e.target.value })}
              placeholder="e.g., Viewpoint"
              className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newWaypoint.type} onValueChange={(value) => setNewWaypoint({ ...newWaypoint, type: value })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waypoint">Waypoint</SelectItem>
                  <SelectItem value="viewpoint">Viewpoint</SelectItem>
                  <SelectItem value="summit">Summit/Peak</SelectItem>
                  <SelectItem value="waterfall">Waterfall</SelectItem>
                  <SelectItem value="forest">Forest/Woodland</SelectItem>
                  <SelectItem value="river_lake">River/Lake</SelectItem>
                  <SelectItem value="cave">Cave/Arch</SelectItem>
                  <SelectItem value="castle">Castle/Ruin</SelectItem>
                  <SelectItem value="bridge">Bridge</SelectItem>
                  <SelectItem value="church">Church/Monastery</SelectItem>
                  <SelectItem value="monument">Monument</SelectItem>
                  <SelectItem value="water_source">Water Source</SelectItem>
                  <SelectItem value="shelter">Shelter</SelectItem>
                  <SelectItem value="public_transport">Public Transport</SelectItem>
                  <SelectItem value="toilet">Toilet</SelectItem>
                  <SelectItem value="information">Information</SelectItem>
                  <SelectItem value="junction">Junction</SelectItem>
                  <SelectItem value="start_end">Start/End</SelectItem>
                  <SelectItem value="danger">Danger</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
              type="number"
              step="0.000001"
              value={newWaypoint.lat}
              onChange={(e) => setNewWaypoint({ ...newWaypoint, lat: e.target.value })}
              placeholder="e.g., 52.1234"
              className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
              type="number"
              step="0.000001"
              value={newWaypoint.lng}
              onChange={(e) => setNewWaypoint({ ...newWaypoint, lng: e.target.value })}
              placeholder="e.g., -6.5678"
              className="text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
            value={newWaypoint.description}
            onChange={(e) => setNewWaypoint({ ...newWaypoint, description: e.target.value })}
            placeholder="Additional details..."
            className="text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <Save className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      )}

      {waypoints.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow className="bg-whi-dark">
              <TableHead className="text-white font-semibold text-xs uppercase">Name</TableHead>
              <TableHead className="text-white font-semibold text-xs uppercase">Type</TableHead>
              <TableHead className="text-white font-semibold text-xs uppercase">Coordinates</TableHead>
              <TableHead className="text-white font-semibold text-xs uppercase">Description</TableHead>
              <TableHead className="text-white font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waypoints.map((wp, idx) => (
              <TableRow key={idx}>
                {editingIndex === idx ? (
                  <>
                    <TableCell>
                      <Input
                  value={editingWaypoint.name}
                  onChange={(e) => setEditingWaypoint({ ...editingWaypoint, name: e.target.value })}
                  className="text-sm" />
                    </TableCell>
                    <TableCell>
                      <Select value={editingWaypoint.type} onValueChange={(value) => setEditingWaypoint({ ...editingWaypoint, type: value })}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="waypoint">Waypoint</SelectItem>
                          <SelectItem value="viewpoint">Viewpoint</SelectItem>
                          <SelectItem value="summit">Summit/Peak</SelectItem>
                          <SelectItem value="waterfall">Waterfall</SelectItem>
                          <SelectItem value="forest">Forest/Woodland</SelectItem>
                          <SelectItem value="river_lake">River/Lake</SelectItem>
                          <SelectItem value="cave">Cave/Arch</SelectItem>
                          <SelectItem value="castle">Castle/Ruin</SelectItem>
                          <SelectItem value="bridge">Bridge</SelectItem>
                          <SelectItem value="church">Church/Monastery</SelectItem>
                          <SelectItem value="monument">Monument</SelectItem>
                          <SelectItem value="water_source">Water Source</SelectItem>
                          <SelectItem value="shelter">Shelter</SelectItem>
                          <SelectItem value="public_transport">Public Transport</SelectItem>
                          <SelectItem value="toilet">Toilet</SelectItem>
                          <SelectItem value="information">Information</SelectItem>
                          <SelectItem value="junction">Junction</SelectItem>
                          <SelectItem value="start_end">Start/End</SelectItem>
                          <SelectItem value="danger">Danger</SelectItem>
                          <SelectItem value="parking">Parking</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                    type="number"
                    step="0.000001"
                    value={editingWaypoint.lat}
                    onChange={(e) => setEditingWaypoint({ ...editingWaypoint, lat: e.target.value })}
                    className="text-xs w-24" />
                        <Input
                    type="number"
                    step="0.000001"
                    value={editingWaypoint.lng}
                    onChange={(e) => setEditingWaypoint({ ...editingWaypoint, lng: e.target.value })}
                    className="text-xs w-24" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                  value={editingWaypoint.description || ''}
                  onChange={(e) => setEditingWaypoint({ ...editingWaypoint, description: e.target.value })}
                  className="text-sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8">
                          <Save className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingIndex(null)} className="h-8 w-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{wp.name}</TableCell>
                    <TableCell className="text-sm capitalize">{wp.type}</TableCell>
                    <TableCell className="text-xs">
                      {parseFloat(wp.lat).toFixed(5)}, {parseFloat(wp.lng).toFixed(5)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{wp.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(idx)} className="h-8 w-8">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(idx)} className="h-8 w-8 text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {waypoints.length === 0 && !isAdding && (
        <div className="text-center py-8 text-sm text-slate-500">
          No waypoints or POIs yet. Click "Add Waypoint" to get started.
        </div>
      )}
    </div>
  );
}