// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Trash2, AlertCircle, Upload, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import RouteUploadModal from '@/components/RouteUploadModal';
import BulkRouteUploadModal from '@/components/BulkRouteUploadModal';

export default function AdminRouteLibrary() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Fetch routes
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data } = await supabase.from('routes').select('*');
      return data || [];
    }
  });

  // Fetch destinations for modal
  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  // Fetch tours for modal
  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    /** @param {string} routeId */
    mutationFn: async (routeId) => (await supabase.from('routes').delete().eq('id', routeId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route deleted');
    },
    onError: () => {
      toast.error('Failed to delete route');
    }
  });

  const handleDelete = (routeId, routeName) => {
    if (confirm(`Delete route "${routeName}"?`)) {
      deleteMutation.mutate(routeId);
    }
  };

  // Detect duplicates by GPX fingerprint
  const duplicateFingerprints = React.useMemo(() => {
    const fingerprintCounts = {};
    routes.forEach(route => {
      if (route.gpx_fingerprint) {
        fingerprintCounts[route.gpx_fingerprint] = (fingerprintCounts[route.gpx_fingerprint] || 0) + 1;
      }
    });
    return new Set(Object.keys(fingerprintCounts).filter(fp => fingerprintCounts[fp] > 1));
  }, [routes]);

  const isDuplicate = (route) => route.gpx_fingerprint && duplicateFingerprints.has(route.gpx_fingerprint);

  // Filter routes
  const filteredRoutes = routes.filter((route) => {
    const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || route.route_type === filterType;
    const matchesStatus = filterStatus === 'all' || route.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort routes
  const sortedRoutes = [...filteredRoutes].sort((a, b) => {
    let valueA, valueB;

    switch (sortColumn) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'startpoint':
        valueA = (a.route_startpoint || '').toLowerCase();
        valueB = (b.route_startpoint || '').toLowerCase();
        break;
      case 'endpoint':
        valueA = (a.route_endpoint || '').toLowerCase();
        valueB = (b.route_endpoint || '').toLowerCase();
        break;
      case 'status':
        valueA = a.status || '';
        valueB = b.status || '';
        break;
      default:
        return 0;
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({ column, label }) =>
    <div
      onClick={() => handleSort(column)}
      className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors select-none font-bold text-slate-700 uppercase tracking-wider text-[10px]">
      {label}
      {sortColumn === column && (
        <span className="text-sky-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>)
      }
    </div>;




  const statusColor = {
    draft: 'bg-amber-100/80 text-amber-700 border-amber-200/50',
    active: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50',
    archived: 'bg-slate-100/80 text-slate-700 border-slate-200/50'
  };

  const typeColor = {
    main: 'bg-indigo-100/80 text-indigo-700 border-indigo-200/50',
    alternative_a: 'bg-purple-100/80 text-purple-700 border-purple-200/50',
    alternative_b: 'bg-fuchsia-100/80 text-fuchsia-700 border-fuchsia-200/50',
    transfer: 'bg-sky-100/80 text-sky-700 border-sky-200/50',
    loop: 'bg-teal-100/80 text-teal-700 border-teal-200/50',
    out_and_back: 'bg-cyan-100/80 text-cyan-700 border-cyan-200/50'
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-900 to-slate-900 rounded-[2rem] p-8 lg:p-10 mb-8 border border-white/10 shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sky-200 text-sm font-medium mb-4 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
                Route Management
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight flex items-center gap-3">
                Route Library
                <Badge variant="secondary" className="bg-sky-500/20 text-sky-100 border border-sky-400/30 rounded-full px-3">{routes.length}</Badge>
              </h1>
              <p className="text-sky-200 text-lg max-w-xl leading-relaxed">Manage and upload GPX files for all route variants.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full sm:w-auto">
              <Button
                onClick={() => setShowBulkUploadModal(true)}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-semibold h-11 px-6 rounded-xl backdrop-blur-md transition-all">
                <Upload className="w-4 h-4 mr-2 opacity-80" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-sky-500 hover:bg-sky-600 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-bold">
                <Plus className="w-4 h-4 mr-2" />
                Upload New Route
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 rounded-xl bg-white/70 focus-visible:ring-sky-500 shadow-sm" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Route Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="main">Main</SelectItem>
                <SelectItem value="alternative_a">Alternative A</SelectItem>
                <SelectItem value="alternative_b">Alternative B</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="loop">Loop</SelectItem>
                <SelectItem value="out_and_back">Out & Back</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Routes Table */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm overflow-hidden flex flex-col mb-8">
          <div className="p-0 overflow-x-auto">
            {isLoading ?
              <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
                Loading routes...
              </div> :
              filteredRoutes.length === 0 ?
                <div className="p-16 text-center text-slate-500">
                  <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-lg text-slate-700">No routes found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or upload a new route.</p>
                </div> :

                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-left py-4 px-6"><SortHeader column="name" label="Route Name" /></th>
                      <th className="text-left py-4 px-4"><SortHeader column="startpoint" label="Start Point" /></th>
                      <th className="text-left py-4 px-4"><SortHeader column="endpoint" label="End Point" /></th>
                      <th className="text-left py-4 px-4 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Type</th>
                      <th className="text-left py-4 px-4 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Details</th>
                      <th className="text-left py-4 px-4"><SortHeader column="status" label="Status" /></th>
                      <th className="text-right py-4 px-6 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRoutes.map((route) =>
                      <tr key={route.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-6 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {isDuplicate(route) && (
                              <Copy className="w-4 h-4 flex-shrink-0 text-amber-500" title="Duplicate route detected" />
                            )}
                            <span className="group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => router.push(createPageUrl('AdminRouteDetail') + '?id=' + route.id)}>
                              {route.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{route.route_startpoint || '—'}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{route.route_endpoint || '—'}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={`font-medium px-2 py-0.5 rounded border ${typeColor[route.route_type]}`}>
                            {route.route_type.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium whitespace-nowrap">{route.distance_km} km / +{route.elevation_gain_m}m</span>
                            {route.difficulty_grade ? (
                              <Badge variant="outline" className={`mt-1 font-medium px-2 py-0.5 rounded border ${route.difficulty_grade.toLowerCase() === 'easy' ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50' :
                                route.difficulty_grade.toLowerCase() === 'moderate' ? 'bg-amber-100/80 text-amber-700 border-amber-200/50' :
                                  route.difficulty_grade.toLowerCase() === 'challenging' ? 'bg-orange-100/80 text-orange-700 border-orange-200/50' :
                                    'bg-red-100/80 text-red-700 border-red-200/50'
                                }`}>
                                {route.difficulty_grade}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={`font-medium px-2 py-0.5 rounded border capitalize ${statusColor[route.status]}`}>
                            {route.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-slate-200 hover:text-slate-900"
                              onClick={() => router.push(createPageUrl('AdminRouteDetail') + '?id=' + route.id)}
                              title="View route">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(route.id, route.name)}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={deleteMutation.isPending}
                              title="Delete route">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            }
          </div>
        </Card>

        <p className="text-sm text-slate-500 mt-4">
          Showing {sortedRoutes.length} of {routes.length} routes
        </p>
      </div>

      {/* Upload Modal */}
      <RouteUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        destinations={destinations}
        tours={tours}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['routes'] });
        }} />


      {/* Bulk Upload Modal */}
      <BulkRouteUploadModal
        open={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['routes'] });
        }} />

    </div>);

}