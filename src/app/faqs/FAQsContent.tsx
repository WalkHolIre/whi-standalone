// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, ChevronDown, Edit, Copy, Trash2, GripVertical, X, Code, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/RichTextEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { sanitizeHtml } from '@/components/sanitize';

const SECTION_COLORS = {
  general: 'bg-slate-100 text-slate-800',
  destinations: 'bg-green-100 text-green-800',
  tours: 'bg-blue-100 text-blue-800',
  booking: 'bg-purple-100 text-purple-800',
  payment: 'bg-yellow-100 text-yellow-800',
  accommodation: 'bg-orange-100 text-orange-800',
  transport: 'bg-cyan-100 text-cyan-800',
  equipment: 'bg-indigo-100 text-indigo-800',
  weather: 'bg-sky-100 text-sky-800',
  safety: 'bg-red-100 text-red-800',
  insurance: 'bg-pink-100 text-pink-800',
  custom: 'bg-gray-100 text-gray-800'
};

const LANGUAGE_NAMES = { en: 'English', de: 'German', nl: 'Dutch' };

export default function FAQManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingFaq, setEditingFaq] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showShortcodeHelp, setShowShortcodeHelp] = useState(false);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data } = await supabase.from('faqs').select('*');
      return data || [];
    }
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('faqs').insert(data).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ created');
      setShowEditor(false);
      setEditingFaq(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => (await supabase.from('faqs').update(data).eq('id', id).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ updated');
      setShowEditor(false);
      setEditingFaq(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('faqs').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ deleted');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }) => {
      await Promise.all(ids.map(async (id) => {
        const response = await supabase.from('faqs').update(data).eq('id', id).select().single();
        return response.data;
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQs updated');
      setSelectedIds(new Set());
    }
  });

  const allTags = useMemo(() => {
    const tagSet = new Set();
    faqs.forEach(faq => {
      if (faq.tags) faq.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [faqs]);

  const sectionCounts = useMemo(() => {
    const counts = {};
    faqs.forEach(faq => {
      counts[faq.section] = (counts[faq.section] || 0) + 1;
    });
    return counts;
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      if (search && !faq.question.toLowerCase().includes(search.toLowerCase()) &&
        !faq.answer.toLowerCase().includes(search.toLowerCase())) return false;
      if (sectionFilter !== 'all' && faq.section !== sectionFilter) return false;
      if (tagFilter && (!faq.tags || !faq.tags.includes(tagFilter))) return false;
      if (destinationFilter !== 'all' && (!faq.destination_ids || !faq.destination_ids.includes(destinationFilter))) return false;
      if (tourFilter !== 'all' && (!faq.tour_ids || !faq.tour_ids.includes(tourFilter))) return false;
      if (statusFilter !== 'all' && faq.status !== statusFilter) return false;
      if (languageFilter !== 'all' && faq.language !== languageFilter) return false;
      return true;
    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [faqs, search, sectionFilter, tagFilter, destinationFilter, tourFilter, statusFilter, languageFilter]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredFaqs);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    items.forEach((item, index) => {
      updateMutation.mutate({ id: item.id, data: { sort_order: index } });
    });
  };

  const handleAddNew = () => {
    setEditingFaq({
      question: '',
      answer: '',
      section: 'general',
      tags: [],
      destination_ids: [],
      tour_ids: [],
      page_ids: [],
      language: 'en',
      sort_order: faqs.length,
      status: 'published'
    });
    setShowEditor(true);
  };

  const handleEdit = (faq) => {
    setEditingFaq({ ...faq });
    setShowEditor(true);
  };

  const handleDuplicate = (faq) => {
    createMutation.mutate({
      ...faq,
      question: `${faq.question} (copy)`,
      id: undefined
    });
  };

  const handleDelete = (id) => {
    if (confirm('Delete this FAQ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkAction = (action, value) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('No FAQs selected');
      return;
    }

    if (action === 'delete') {
      if (confirm(`Delete ${ids.length} FAQ(s)?`)) {
        ids.forEach(id => deleteMutation.mutate(id));
        setSelectedIds(new Set());
      }
    } else if (action === 'section' || action === 'status') {
      bulkUpdateMutation.mutate({ ids, data: { [action]: value } });
    }
  };

  const handleSave = (saveAndAddAnother = false) => {
    if (!editingFaq.question || !editingFaq.answer) {
      toast.error('Question and answer are required');
      return;
    }

    if (editingFaq.id) {
      updateMutation.mutate({ id: editingFaq.id, data: editingFaq });
    } else {
      createMutation.mutate(editingFaq);
      if (saveAndAddAnother) {
        setTimeout(() => handleAddNew(), 500);
      }
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              FAQ Manager
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Create, organize, and publish FAQs</p>
          </div>

          <div className="flex gap-3 relative z-10 w-full md:w-auto">
            <Button variant="outline" onClick={() => setShowShortcodeHelp(true)} className="rounded-xl shadow-sm h-11 border-slate-200 text-slate-700 bg-white/50 backdrop-blur-sm">
              <Code className="w-4 h-4 mr-2" />
              Shortcode Reference
            </Button>
            <Button onClick={handleAddNew} className="rounded-xl shadow-sm h-11 text-white bg-indigo-600 hover:bg-indigo-700 font-semibold px-6 border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add New FAQ
            </Button>
          </div>
        </div>

        {/* Summary */}
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 overflow-hidden relative">
          <CardContent className="pt-6 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-indigo-900/60 uppercase tracking-widest">Database Overview</p>
                <p className="text-4xl font-black text-indigo-900 mt-1">{faqs.length}</p>
                <p className="text-base font-medium text-indigo-900/70">Total active FAQs</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {Object.entries(sectionCounts).map(([section, count]) => (
                  <Badge
                    key={section}
                    className={`${SECTION_COLORS[section]} rounded-xl px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-black/5 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all ${sectionFilter === section ? 'ring-2 ring-indigo-500 shadow-md scale-105' : ''}`}
                    onClick={() => setSectionFilter(sectionFilter === section ? 'all' : section)}
                  >
                    <span className="capitalize">{section}</span>: <span className="font-bold ml-1">{count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-visible relative">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search questions and answers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-colors shadow-sm w-full"
                  />
                </div>
              </div>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {Object.keys(SECTION_COLORS).map(section => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={(val) => setTagFilter(val === '__none__' ? '' : val)}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="All Destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {destinations.map(dest => (
                    <SelectItem key={dest.id} value={dest.id}>{dest.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tourFilter} onValueChange={setTourFilter}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="All Tours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tours</SelectItem>
                  {tours.map(tour => (
                    <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Active Filter Chips */}
        {(tagFilter || sectionFilter !== 'all' || destinationFilter !== 'all' || tourFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-sm font-medium text-slate-500">Active filters:</span>
            {sectionFilter !== 'all' && (
              <Badge className={`${SECTION_COLORS[sectionFilter]} cursor-pointer pl-2.5 pr-1.5 py-1 gap-1.5`} onClick={() => setSectionFilter('all')}>
                Section: {sectionFilter} <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {tagFilter && (
              <Badge variant="outline" className="cursor-pointer bg-indigo-50 border-indigo-300 text-indigo-700 pl-2.5 pr-1.5 py-1 gap-1.5" onClick={() => setTagFilter('')}>
                Tag: {tagFilter} <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {destinationFilter !== 'all' && (
              <Badge variant="outline" className="cursor-pointer bg-green-50 border-green-300 text-green-700 pl-2.5 pr-1.5 py-1 gap-1.5" onClick={() => setDestinationFilter('all')}>
                Destination: {destinations.find(d => d.id === destinationFilter)?.name || '...'} <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            {tourFilter !== 'all' && (
              <Badge variant="outline" className="cursor-pointer bg-blue-50 border-blue-300 text-blue-700 pl-2.5 pr-1.5 py-1 gap-1.5" onClick={() => setTourFilter('all')}>
                Tour: {tours.find(t => t.id === tourFilter)?.name || '...'} <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => { setSectionFilter('all'); setTagFilter(''); setDestinationFilter('all'); setTourFilter('all'); setStatusFilter('all'); setLanguageFilter('all'); setSearch(''); }}>
              Clear all
            </Button>
            <span className="ml-auto text-sm text-slate-400">{filteredFaqs.length} of {faqs.length} FAQs</span>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="rounded-2xl bg-indigo-50 border border-indigo-100 shadow-inner">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Select onValueChange={(val) => handleBulkAction('section', val)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Change Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(SECTION_COLORS).map(section => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(val) => handleBulkAction('status', val)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="faqs">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {filteredFaqs.map((faq, index) => (
                  <Draggable key={faq.id} draggableId={faq.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all hover:border-indigo-300"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div {...provided.dragHandleProps} className="mt-1 cursor-move">
                              <GripVertical className="w-5 h-5 text-slate-400" />
                            </div>
                            <Checkbox
                              checked={selectedIds.has(faq.id)}
                              onCheckedChange={() => toggleSelect(faq.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(faq.id)}>
                                  <h3 className="font-semibold text-lg text-slate-900">
                                    {faq.question}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge
                                      className={`${SECTION_COLORS[faq.section]} cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all ${sectionFilter === faq.section ? 'ring-2 ring-indigo-500 shadow-md' : ''}`}
                                      onClick={(e) => { e.stopPropagation(); setSectionFilter(sectionFilter === faq.section ? 'all' : faq.section); }}
                                    >{faq.section}</Badge>
                                    <Badge variant="outline">{LANGUAGE_NAMES[faq.language]}</Badge>
                                    <Badge variant={faq.status === 'published' ? 'default' : 'secondary'}>
                                      {faq.status}
                                    </Badge>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      #{faq.sort_order}
                                    </Badge>
                                    {faq.tags?.map(tag => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className={`text-xs cursor-pointer hover:bg-indigo-100 hover:border-indigo-400 transition-all ${tagFilter === tag ? 'bg-indigo-100 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setTagFilter(tagFilter === tag ? '' : tag); }}
                                      >{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(faq)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(faq)}>
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {expandedIds.has(faq.id) && (
                          <CardContent className="pt-0">
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer) }}
                            />
                            {/* Linked destinations */}
                            {faq.destination_ids?.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Destinations:</span>
                                <div className="inline-flex flex-wrap gap-1.5 mt-1">
                                  {faq.destination_ids.map(destId => {
                                    const dest = destinations.find(d => d.id === destId);
                                    return dest ? (
                                      <Badge
                                        key={destId}
                                        variant="outline"
                                        className={`text-xs cursor-pointer hover:bg-green-100 hover:border-green-400 transition-all ${destinationFilter === destId ? 'bg-green-100 border-green-500 text-green-700 ring-1 ring-green-500' : 'border-green-200 text-green-700'}`}
                                        onClick={() => setDestinationFilter(destinationFilter === destId ? 'all' : destId)}
                                      >{dest.name}</Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Linked tours */}
                            {faq.tour_ids?.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Tours:</span>
                                <div className="inline-flex flex-wrap gap-1.5 mt-1">
                                  {faq.tour_ids.map(tourId => {
                                    const tour = tours.find(t => t.id === tourId);
                                    return tour ? (
                                      <Badge
                                        key={tourId}
                                        variant="outline"
                                        className={`text-xs cursor-pointer hover:bg-blue-100 hover:border-blue-400 transition-all ${tourFilter === tourId ? 'bg-blue-100 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'border-blue-200 text-blue-700'}`}
                                        onClick={() => setTourFilter(tourFilter === tourId ? 'all' : tourId)}
                                      >{tour.name}</Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {filteredFaqs.length === 0 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-dashed border-2 border-slate-200/60 shadow-sm">
            <CardContent className="py-16 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg font-medium">No FAQs found matching your criteria</p>
            </CardContent>
          </Card>
        )}

        {/* Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {editingFaq?.id ? 'Edit FAQ' : 'New FAQ'}
              </DialogTitle>
            </DialogHeader>
            {editingFaq && (
              <div className="space-y-4">
                <div>
                  <Label>Question *</Label>
                  <Input
                    value={editingFaq.question}
                    onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Answer *</Label>
                  <RichTextEditor
                    value={editingFaq.answer}
                    onChange={(value) => setEditingFaq({ ...editingFaq, answer: value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Section</Label>
                    <Select value={editingFaq.section} onValueChange={(val) => setEditingFaq({ ...editingFaq, section: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(SECTION_COLORS).map(section => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Select value={editingFaq.language} onValueChange={(val) => setEditingFaq({ ...editingFaq, language: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={editingFaq.tags?.join(', ') || ''}
                    onChange={(e) => setEditingFaq({
                      ...editingFaq,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    placeholder="kerry, wicklow, self-guided"
                  />
                </div>
                <div>
                  <Label>Page Slugs (comma-separated)</Label>
                  <Input
                    value={editingFaq.page_ids?.join(', ') || ''}
                    onChange={(e) => setEditingFaq({
                      ...editingFaq,
                      page_ids: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    placeholder="booking, how-it-works, contact"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={editingFaq.sort_order}
                      onChange={(e) => setEditingFaq({ ...editingFaq, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editingFaq.status} onValueChange={(val) => setEditingFaq({ ...editingFaq, status: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button variant="outline" onClick={() => handleSave(true)}>Save & Add Another</Button>
              <Button onClick={() => handleSave()} className="text-white bg-whi hover:bg-whi-hover">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shortcode Help Dialog */}
        <Dialog open={showShortcodeHelp} onOpenChange={setShowShortcodeHelp}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                <HelpCircle className="w-5 h-5 inline mr-2" />
                FAQ Shortcode Reference
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Use these shortcodes in page content, tour descriptions, or destination overviews to dynamically display FAQs:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-slate-800">{'{{faq:section:booking}}'}</code>
                  <p className="text-xs text-slate-600 mt-1">Show all FAQs in the "booking" section</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-slate-800">{'{{faq:tag:kerry}}'}</code>
                  <p className="text-xs text-slate-600 mt-1">Show all FAQs tagged with "kerry"</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-slate-800">{'{{faq:destination:cooley-mourne}}'}</code>
                  <p className="text-xs text-slate-600 mt-1">Show FAQs linked to a specific destination (use destination slug)</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-slate-800">{'{{faq:tour:kerry-way-8-day}}'}</code>
                  <p className="text-xs text-slate-600 mt-1">Show FAQs linked to a specific tour (use tour slug)</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-slate-800">{'{{faq:page:how-it-works}}'}</code>
                  <p className="text-xs text-slate-600 mt-1">Show FAQs assigned to a specific page</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <code className="text-sm font-mono text-slate-800">{'{{faq:tag:kerry,section:destinations}}'}</code>
                  <p className="text-xs text-slate-600 mt-1">Combine filters (show FAQs that match all criteria)</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">
                Note: Implementation of shortcode parsing on the frontend is required separately.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}