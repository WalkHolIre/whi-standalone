// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Copy, Trash2, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { generateTourCode } from '@/components/TourCodeGenerator';
import { LoadingState } from '@/components/LoadingState';

export default function AdminTourManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [editMode, setEditMode] = useState(false);
  const [editedTours, setEditedTours] = useState({});

  // Fetch tours
  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  // Fetch destinations for filter
  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  // Fetch regions for tour code generation
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    /** @param {any} tour */
    mutationFn: async (tour) => {
      const tourCopy = {
        ...tour,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        created_by: undefined,
        name: `${tour.name} (Copy)`,
        slug: `${tour.slug}-copy`,
        status: 'draft'
      };
      const response = await supabase.from('tours').insert(tourCopy).select().single();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour duplicated successfully');
    },
    onError: () => {
      toast.error('Failed to duplicate tour');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    /** @param {string} tourId */
    mutationFn: async (tourId) => {
      return await supabase.from('tours').delete().eq('id', tourId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour deleted');
    },
    onError: () => {
      toast.error('Failed to delete tour');
    }
  });

  // Save edits mutation
  const saveEditsMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedTours).map(async ([tourId, changes]) => {
        const originalTour = tours.find(t => t.id === tourId);
        let updatedChanges = { ...changes };

        // If destination_id changed, regenerate the tour code
        if (changes.destination_id !== undefined && originalTour) {
          const destination = destinationMap[changes.destination_id];
          const region = destination ? regionMap[destination.region_id] : null;
          const newCode = generateTourCode(originalTour, destination, region);
          updatedChanges.code = newCode;
        }

        const { data } = await supabase.from('tours').update(updatedChanges).eq('id', tourId).select().single();
        return data;
      });
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tours updated successfully');
      setEditMode(false);
      setEditedTours({});
    },
    onError: () => {
      toast.error('Failed to update tours');
    }
  });

  // Create destination and region lookups
  const destinationMap = useMemo(() => {
    const map = {};
    destinations.forEach((dest) => {
      map[dest.id] = dest;
    });
    return map;
  }, [destinations]);

  const regionMap = useMemo(() => {
    const map = {};
    regions.forEach((region) => {
      map[region.id] = region;
    });
    return map;
  }, [regions]);

  // Display the stored code if available, otherwise generate a preview
  const getTourCode = (tour) => {
    if (tour.code) return tour.code;
    const destination = destinationMap[tour.destination_id];
    const region = destination ? regionMap[destination.region_id] : null;
    return generateTourCode(tour, destination, region);
  };

  // Filter and sort tours
  const filteredAndSortedTours = useMemo(() => {
    let filtered = tours.filter((tour) => {
      const matchesSearch =
        tour.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tour.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || tour.status === statusFilter;
      const matchesDifficulty = difficultyFilter === 'all' || tour.difficulty_level === difficultyFilter;
      const matchesDestination = destinationFilter === 'all' || tour.destination_id === destinationFilter;

      return matchesSearch && matchesStatus && matchesDifficulty && matchesDestination;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [tours, searchTerm, statusFilter, difficultyFilter, destinationFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTours.length / itemsPerPage);
  const paginatedTours = filteredAndSortedTours.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (tour) => {
    if (confirm(`Are you sure you want to delete "${tour.name}"?`)) {
      deleteMutation.mutate(tour.id);
    }
  };

  const handleDestinationChange = (tourId, destinationId) => {
    setEditedTours((prev) => ({
      ...prev,
      [tourId]: {
        ...prev[tourId],
        destination_id: destinationId
      }
    }));
  };

  const getEditedValue = (tour, field) => {
    return editedTours[tour.id]?.[field] ?? tour[field];
  };

  const getStatusBadge = (status) => {
    const variants = {
      published: { className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50', label: 'Published' },
      draft: { className: 'bg-amber-100/80 text-amber-700 border-amber-200/50', label: 'Draft' },
      archived: { className: 'bg-slate-100/80 text-slate-700 border-slate-200/50', label: 'Archived' }
    };
    const variant = variants[status?.toLowerCase()] || variants.draft;
    return <Badge variant="outline" className={`font-medium px-2.5 py-0.5 rounded-full border ${variant.className}`}>{variant.label}</Badge>;
  };

  const getDifficultyBadge = (difficulty) => {
    const variants = {
      easy: { className: 'bg-sky-100/80 text-sky-700 border-sky-200/50', label: 'Easy' },
      moderate: { className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50', label: 'Moderate' },
      challenging: { className: 'bg-orange-100/80 text-orange-700 border-orange-200/50', label: 'Challenging' },
      strenuous: { className: 'bg-red-100/80 text-red-700 border-red-200/50', label: 'Strenuous' }
    };
    const variant = variants[difficulty?.toLowerCase()] || variants.moderate;
    return <Badge variant="outline" className={`font-medium px-2.5 py-0.5 rounded-full border ${variant.className}`}>{variant.label}</Badge>;
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-[2rem] p-8 lg:p-10 mb-8 border border-white/10 shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl mix-blend-screen pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-sm font-medium mb-4 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                {filteredAndSortedTours.length} tours actively managed
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">Tour Catalog</h1>
              <p className="text-indigo-200 text-lg max-w-xl leading-relaxed">Design and manage your walking tour itineraries and packages.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {editMode ? (
                <>
                  <Button
                    onClick={() => saveEditsMutation.mutate()}
                    disabled={saveEditsMutation.isPending || Object.keys(editedTours).length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all h-11 px-6 rounded-xl font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes ({Object.keys(editedTours).length})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setEditedTours({});
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all h-11 px-6 rounded-xl font-semibold"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all h-11 px-6 rounded-xl font-semibold backdrop-blur-md"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Quick Edit
                  </Button>
                  <Button
                    onClick={() => router.push(createPageUrl('AdminTourEditor'))}
                    className="bg-white text-indigo-900 hover:bg-slate-50 gap-2 h-11 px-6 rounded-xl shadow-sm transition-all font-bold group"
                  >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    Create Tour
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters Box */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search tours or codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-slate-200 rounded-xl bg-white/70 focus-visible:ring-indigo-500 shadow-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="challenging">Challenging</SelectItem>
                <SelectItem value="strenuous">Strenuous</SelectItem>
              </SelectContent>
            </Select>
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-80">
                <SelectItem value="all">All Destinations</SelectItem>
                {[...destinations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((dest) => (
                    <SelectItem key={dest.id} value={dest.id}>
                      {dest.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Main Table Card */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100 hover:bg-slate-50/80">
                  <TableHead
                    className="cursor-pointer hover:text-slate-900 transition-colors font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      Tour Name
                      {sortField === 'name' && (
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-slate-900 transition-colors font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1.5">
                      Code
                      {sortField === 'code' && (
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider">Region</TableHead>
                  <TableHead className="font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider">Location</TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-slate-900 transition-colors font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider"
                    onClick={() => handleSort('duration_days')}
                  >
                    <div className="flex items-center gap-1.5">
                      Duration
                      {sortField === 'duration_days' && (
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-slate-900 transition-colors font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider"
                    onClick={() => handleSort('price_per_person_eur')}
                  >
                    <div className="flex items-center gap-1.5">
                      Price
                      {sortField === 'price_per_person_eur' && (
                        <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider">Status</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 h-14 uppercase text-[10px] tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <LoadingState message="Loading your tours..." />
                    </TableCell>
                  </TableRow>
                ) : paginatedTours.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500 font-medium">
                      No tours match your current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTours.map((tour) => (
                    <TableRow
                      key={tour.id}
                      className="group transition-colors hover:bg-slate-50/80 border-b border-slate-100 last:border-0"
                    >
                      <TableCell
                        className="py-4 font-semibold text-slate-900 cursor-pointer hover:text-emerald-700 transition-colors max-w-[200px] truncate"
                        onClick={() => router.push(createPageUrl('AdminTourEditor') + '?id=' + tour.id)}
                      >
                        {tour.name}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {getTourCode(tour) || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        {(() => {
                          const currentDestId = getEditedValue(tour, 'destination_id');
                          const destination = destinationMap[currentDestId];
                          const region = destination ? regionMap[destination.region_id] : null;
                          return region ? (
                            <div className="flex items-center gap-1.5" title={region.name}>
                              <span className="font-medium text-slate-700">{region.code}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="py-4">
                        {editMode ? (
                          <Select
                            value={getEditedValue(tour, 'destination_id') || 'none'}
                            onValueChange={(value) => handleDestinationChange(tour.id, value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-36 h-9 bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="none">None</SelectItem>
                              {[...destinations]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((dest) => (
                                  <SelectItem key={dest.id} value={dest.id}>
                                    {dest.code} - {dest.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          (() => {
                            const currentDestId = getEditedValue(tour, 'destination_id');
                            const destination = destinationMap[currentDestId];
                            return destination ? (
                              <span className="text-sm font-medium text-slate-600" title={destination.name}>
                                {destination.name}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            );
                          })()
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-slate-600">
                        {tour.duration_days ? `${tour.duration_days} days` : '-'}
                      </TableCell>
                      <TableCell className="py-4 font-medium text-slate-900">
                        {tour.price_per_person_eur ? `€${tour.price_per_person_eur}` : '-'}
                      </TableCell>
                      <TableCell className="py-4">
                        {getStatusBadge(tour.status)}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        {!editMode && (
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(createPageUrl('AdminTourEditor') + '?id=' + tour.id)}
                              title="Edit"
                              className="h-8 w-8 hover:bg-slate-100 hover:text-emerald-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateMutation.mutate(tour)}
                              title="Duplicate"
                              disabled={duplicateMutation.isPending}
                              className="h-8 w-8 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(tour)}
                              title="Delete"
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm font-medium text-slate-500">
                Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-white hover:bg-slate-50 shadow-sm rounded-xl h-9 px-4 font-semibold text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-white hover:bg-slate-50 shadow-sm rounded-xl h-9 px-4 font-semibold text-slate-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}