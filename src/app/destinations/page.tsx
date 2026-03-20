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
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LoadingState } from '@/components/LoadingState';

export default function DestinationManager() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const itemsPerPage = 20;

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    }
  });

  const { data: tours = [] } = useQuery({
    queryKey: ['tours-for-dest-count'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('id, destination_id').eq('status', 'published');
      return data || [];
    }
  });

  const tourCountByDest = useMemo(() => {
    const counts = {};
    tours.forEach(t => {
      if (t.destination_id) counts[t.destination_id] = (counts[t.destination_id] || 0) + 1;
    });
    return counts;
  }, [tours]);

  const regionById = useMemo(() => {
    return Object.fromEntries(regions.map(r => [r.id, r]));
  }, [regions]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => await supabase.from('destinations').delete().eq('id', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      toast.success('Destination deleted');
      setSelectedIds([]);
    },
    onError: () => toast.error('Failed to delete destination')
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }) => {
      await Promise.all(ids.map(async (id) => {
        const { data } = await supabase.from('destinations').update(updates).eq('id', id).select().single();
        return data;
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      toast.success('Destinations updated');
      setSelectedIds([]);
    },
    onError: () => toast.error('Failed to update destinations')
  });

  const filteredAndSortedDestinations = useMemo(() => {
    let filtered = destinations.filter((dest) => {
      const matchesSearch =
        dest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dest.country?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || dest.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

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
  }, [destinations, searchTerm, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedDestinations.length / itemsPerPage);
  const paginatedDestinations = filteredAndSortedDestinations.slice(
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

  const handleDelete = (destination) => {
    if (confirm(`Are you sure you want to delete "${destination.name}"?`)) {
      deleteMutation.mutate(destination.id);
    }
  };

  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;

    if (action === 'delete') {
      if (confirm(`Delete ${selectedIds.length} destination(s)?`)) {
        Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id))).
          then(() => setSelectedIds([]));
      }
    } else if (action === 'publish') {
      bulkUpdateMutation.mutate({ ids: selectedIds, updates: { status: 'published' } });
    } else if (action === 'archive') {
      bulkUpdateMutation.mutate({ ids: selectedIds, updates: { status: 'archived' } });
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedDestinations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedDestinations.map((d) => d.id));
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      published: { className: 'bg-emerald-100/80 text-emerald-800 border bg-emerald-100 rounded-md font-medium', label: 'Published' },
      draft: { className: 'bg-amber-100/80 text-amber-800 border bg-amber-100 rounded-md font-medium', label: 'Draft' },
      archived: { className: 'bg-slate-100/80 text-slate-800 border bg-slate-100 rounded-md font-medium', label: 'Archived' }
    };
    const variant = variants[status] || variants.draft;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const LANGUAGES = [
    { code: 'de', flag: '🇩🇪', label: 'German' },
    { code: 'nl', flag: '🇳🇱', label: 'Dutch' },
    { code: 'es', flag: '🇪🇸', label: 'Spanish' },
    { code: 'fr', flag: '🇫🇷', label: 'French' },
  ];

  const TRANSLATION_FIELDS = ['name', 'overview', 'description', 'cultural_highlights', 'best_time_to_visit', 'meta_title', 'meta_description'];

  const isFieldFilled = (val) => {
    if (!val) return false;
    const s = String(val).trim();
    return s.length > 0 && s !== '<p></p>' && s !== '<br>';
  };

  const getTranslationCount = (dest, langCode) =>
    TRANSLATION_FIELDS.filter(f => isFieldFilled(dest[`${f}_${langCode}`])).length;

  const TranslationFlags = ({ dest }) => (
    <div className="flex gap-0.5">
      {LANGUAGES.map(({ code, flag, label }) => {
        const count = getTranslationCount(dest, code);
        const total = TRANSLATION_FIELDS.length;
        const bgClass = count === total ? 'bg-green-100 border-green-600' : count > 0 ? 'bg-orange-50 border-orange-400' : 'bg-slate-100 border-slate-300';
        return (
          <span
            key={code}
            title={`${label}: ${count}/${total} fields complete`}
            className={`inline-flex items-center justify-center rounded-full border text-sm cursor-default ${bgClass}`}
            style={{ width: 28, height: 28, fontSize: 14 }}
          >
            {flag}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Destinations</h1>
            <p className="text-slate-500 mt-1">
              {filteredAndSortedDestinations.length} destination{filteredAndSortedDestinations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => router.push(createPageUrl('DestinationEditor') + '?mode=new')} className="bg-emerald-600 text-white px-4 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center whitespace-nowrap transition-all shadow-md hover:shadow-lg hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 gap-2 h-11 border-0">
            <Plus className="w-4 h-4" />
            Add New Destination
          </Button>
        </div>

        <Card className="mb-8 bg-white/70 backdrop-blur-md border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search destinations by name or country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl transition-colors shadow-sm w-full"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-emerald-500/20 rounded-xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {selectedIds.length > 0 &&
                <Select onValueChange={handleBulkAction}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={`Bulk Actions (${selectedIds.length})`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publish">Publish Selected</SelectItem>
                    <SelectItem value="archive">Archive Selected</SelectItem>
                    <SelectItem value="delete">Delete Selected</SelectItem>
                  </SelectContent>
                </Select>
              }
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 px-4 py-3 font-medium text-slate-500">
                    <Checkbox
                      checked={selectedIds.length === paginatedDestinations.length && paginatedDestinations.length > 0}
                      onCheckedChange={toggleSelectAll} />

                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('name')}>

                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('country')}>

                    Country {sortField === 'country' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-center">Tours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Translations</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('updated_at')}>

                    Updated {sortField === 'updated_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ?
                  <TableRow>
                    <TableCell colSpan={9}>
                      <LoadingState message="Loading destinations..." />
                    </TableCell>
                  </TableRow> :
                  paginatedDestinations.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No destinations found
                      </TableCell>
                    </TableRow> :

                    paginatedDestinations.map((dest) =>
                      <TableRow key={dest.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(dest.id)}
                            onCheckedChange={() => toggleSelection(dest.id)} />

                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {dest.name}
                        </TableCell>
                        <TableCell className="text-slate-600">{dest.country || '-'}</TableCell>
                        <TableCell>
                          {dest.region_id && regionById[dest.region_id]
                            ? <span className="text-xs font-medium bg-slate-100/80 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">{regionById[dest.region_id].code || regionById[dest.region_id].name}</span>
                            : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-semibold ${tourCountByDest[dest.id] ? 'text-whi-purple' : 'text-slate-300'}`}>
                            {tourCountByDest[dest.id] || 0}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(dest.status)}</TableCell>
                        <TableCell><TranslationFlags dest={dest} /></TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {dest.updated_at ? format(new Date(dest.updated_at), 'dd/MM/yy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 px-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(createPageUrl('DestinationEditor') + '?id=' + dest.id)}
                              className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Edit">

                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(dest)}
                              title="Delete"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              disabled={deleteMutation.isPending}>

                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 &&
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}>

                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}>

                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        }
      </div>
    </div>);

}