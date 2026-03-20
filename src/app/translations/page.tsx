// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/components/formatDate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Calendar, Plus, Edit2, Trash2, Eye, EyeOff, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEST_FIELDS = ['name', 'short_description', 'overview', 'description', 'landscape_description',
  'cultural_highlights', 'difficulty_overview', 'accommodation_style', 'practical_info',
  'who_is_it_for', 'best_time_to_visit', 'meta_title', 'meta_description'];

const TOUR_FIELDS = ['name', 'subtitle', 'overview', 'highlights', 'who_is_it_for',
  'accommodation_description', 'meta_title', 'meta_description'];

const BLOG_FIELDS = ['title', 'content', 'excerpt', 'meta_title', 'meta_description'];

function getCompleteness(item, langCode, fields) {
  if (langCode === 'en') return 100;
  const suffix = `_${langCode}`;
  const filled = fields.filter(f => {
    const val = item[`${f}${suffix}`];
    return val && String(val).trim().length > 0;
  });
  return fields.length === 0 ? 0 : Math.round((filled.length / fields.length) * 100);
}

function CompletenessCell({ pct }) {
  const color = pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-orange-500' : 'text-red-500';
  return <span className={`font-semibold text-sm ${color}`}>{pct}%</span>;
}

const DEFAULT_FORM = {
  language_code: '', language_name: '', site_url: '', api_endpoint: '',
  api_key: '', app_type: 'supabase', is_subdirectory: false,
  parent_site_url: '', flag_emoji: '', status: 'active',
};

export default function TranslationDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [pushingId, setPushingId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const { data: languageSites = [] } = useQuery({
    queryKey: ['languageSites'],
    queryFn: async () => {
      const { data } = await supabase.from('language_sites').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });
  const { data: tours = [] } = useQuery({ queryKey: ['tours'], queryFn: async () => { const { data } = await supabase.from('tours').select('*'); return data || []; } });
  const { data: destinations = [] } = useQuery({ queryKey: ['destinations'], queryFn: async () => { const { data } = await supabase.from('destinations').select('*'); return data || []; } });
  const { data: blogPosts = [] } = useQuery({ queryKey: ['blogPosts'], queryFn: async () => { const { data } = await supabase.from('posts').select('*'); return data || []; } });

  const createMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('language_sites').insert(data).select().single()).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['languageSites'] }); resetForm(); setIsDialogOpen(false); toast.success('Language site created'); },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => (await supabase.from('language_sites').update(data).eq('id', id).select().single()).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['languageSites'] }); resetForm(); setIsDialogOpen(false); toast.success('Language site updated'); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('language_sites').delete().eq('id', id)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['languageSites'] }); toast.success('Language site deleted'); },
  });

  const resetForm = () => { setFormData(DEFAULT_FORM); setEditingId(null); setShowApiKey(false); };

  const handleEdit = (site) => { setFormData(site); setEditingId(site.id); setIsDialogOpen(true); };
  const handleAdd = () => { resetForm(); setIsDialogOpen(true); };
  const handleSubmit = (e) => {
    e.preventDefault();
    editingId ? updateMutation.mutate({ id: editingId, data: formData }) : createMutation.mutate(formData);
  };
  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this language site?')) deleteMutation.mutate(id);
  };
  const handlePush = async (siteId, siteName) => {
    setPushingId(siteId);
    try {
      // TODO: Migrate to Supabase Edge Function
      console.warn('Function not yet migrated: pushContentToSite');
      toast.error('pushContentToSite function not yet migrated to Supabase');
    } catch (error) {
      toast.error(`Push failed: ${error.message}`);
    } finally {
      setPushingId(null);
    }
  };

  const activeLanguages = useMemo(() =>
    languageSites.filter(ls => ls.status === 'active').sort((a, b) => (a.language_code || '').localeCompare(b.language_code || ''))
    , [languageSites]);

  const overallProgress = useMemo(() => {
    const nonEnLangs = activeLanguages.filter(l => l.language_code !== 'en');
    if (nonEnLangs.length === 0) return 0;
    const allPcts = [
      ...destinations.flatMap(d => nonEnLangs.map(l => getCompleteness(d, l.language_code, DEST_FIELDS))),
      ...tours.flatMap(t => nonEnLangs.map(l => getCompleteness(t, l.language_code, TOUR_FIELDS))),
      ...blogPosts.flatMap(p => nonEnLangs.map(l => getCompleteness(p, l.language_code, BLOG_FIELDS)))
    ];
    if (allPcts.length === 0) return 0;
    return Math.round(allPcts.reduce((s, v) => s + v, 0) / allPcts.length);
  }, [tours, destinations, blogPosts, activeLanguages]);

  const languageSummaries = useMemo(() =>
    activeLanguages.filter(l => l.language_code !== 'en').map(lang => {
      const destPcts = destinations.map(d => getCompleteness(d, lang.language_code, DEST_FIELDS));
      const tourPcts = tours.map(t => getCompleteness(t, lang.language_code, TOUR_FIELDS));
      const blogPcts = blogPosts.map(p => getCompleteness(p, lang.language_code, BLOG_FIELDS));
      const all = [...destPcts, ...tourPcts, ...blogPcts];
      const avg = all.length === 0 ? 0 : Math.round(all.reduce((s, v) => s + v, 0) / all.length);
      return { ...lang, progress: avg, complete: all.filter(v => v === 100).length, partial: all.filter(v => v > 0 && v < 100).length, empty: all.filter(v => v === 0).length, total: all.length };
    })
    , [tours, destinations, blogPosts, activeLanguages]);

  const filterItem = (item, fields) => {
    if (filter === 'all') return true;
    const nonEnLangs = activeLanguages.filter(l => l.language_code !== 'en');
    const pcts = nonEnLangs.map(l => getCompleteness(item, l.language_code, fields));
    if (filter === 'missing') return pcts.some(p => p === 0);
    if (filter === 'in-progress') return pcts.some(p => p > 0 && p < 100);
    if (filter === 'ready') return pcts.every(p => p === 100);
    return true;
  };

  const filteredTours = tours.filter(t => filterItem(t, TOUR_FIELDS));
  const filteredDestinations = destinations.filter(d => filterItem(d, DEST_FIELDS));
  const filteredBlogPosts = blogPosts.filter(p => filterItem(p, BLOG_FIELDS));
  const nonEnLangs = activeLanguages.filter(l => l.language_code !== 'en');

  const ContentTable = ({ items, type, fields }) => {
    if (items.length === 0) {
      return <div className="text-center py-8 text-slate-500">No {type.toLowerCase()} found with the selected filter.</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Name</th>
              {nonEnLangs.map(lang => (
                <th key={lang.id} className="text-center py-3 px-4 font-semibold text-slate-900">
                  <div className="text-lg">{lang.flag_emoji}</div>
                  <div className="text-xs">{lang.language_code.toUpperCase()}</div>
                </th>
              ))}
              <th className="text-center py-3 px-4 font-semibold text-slate-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">{item.title || item.name}</td>
                {nonEnLangs.map(lang => (
                  <td key={`${item.id}-${lang.id}`} className="text-center py-3 px-4">
                    <CompletenessCell pct={getCompleteness(item, lang.language_code, fields)} />
                  </td>
                ))}
                <td className="text-center py-3 px-4">
                  <Link href={createPageUrl(
                    type === 'tours' ? 'AdminTourEditor' :
                      type === 'destinations' ? 'DestinationEditor' : 'BlogPostEditor'
                  ) + `?id=${item.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Translation Dashboard
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Manage language sites and monitor translation completeness</p>
          </div>
          <Button onClick={handleAdd} className="gap-2 relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-semibold shadow-sm border-0 transition-all">
            <Plus className="w-4 h-4" />
            Add Language Site
          </Button>
        </div>

        {/* Language Sites */}
        <div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200">
                  <TableHead className="text-slate-900">Language</TableHead>
                  <TableHead className="text-slate-900">Code</TableHead>
                  <TableHead className="text-slate-900">Site URL</TableHead>
                  <TableHead className="text-slate-900">App Type</TableHead>
                  <TableHead className="text-slate-900">Status</TableHead>
                  <TableHead className="text-slate-900">Last Push</TableHead>
                  <TableHead className="text-right text-slate-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {languageSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-slate-500">No language sites configured yet.</TableCell>
                  </TableRow>
                ) : languageSites.map((site) => (
                  <TableRow key={site.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <TableCell className="text-slate-900">
                      <span className="text-lg mr-2">{site.flag_emoji}</span>
                      {site.language_name}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono">{site.language_code}</TableCell>
                    <TableCell className="text-slate-600 max-w-xs truncate">{site.site_url}</TableCell>
                    <TableCell className="text-slate-600">{site.app_type}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${site.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>{site.status}</span>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{site.last_push_at ? formatDate(site.last_push_at) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePush(site.id, site.language_name)}
                          disabled={pushingId === site.id || site.status !== 'active'}
                          className="text-whi hover:text-whi-hover disabled:opacity-50" title="Push content to this site">
                          {pushingId === site.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(site)} className="text-slate-600 hover:text-slate-900">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(site.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Overall Progress */}
        {activeLanguages.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-slate-900">Overall Translation Completeness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{overallProgress}% Complete</span>
                <span className="text-sm text-slate-500">{tours.length + destinations.length + blogPosts.length} items</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Per-language summaries */}
        {nonEnLangs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {languageSummaries.map(lang => (
              <Card key={lang.id} className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{lang.flag_emoji}</span>
                    <span className="text-slate-900">{lang.language_name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{lang.progress}% avg</span>
                    </div>
                    <Progress value={lang.progress} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-green-50 p-2 rounded"><div className="font-semibold text-green-700">{lang.complete}</div><div className="text-green-600 text-xs">100%</div></div>
                    <div className="bg-orange-50 p-2 rounded"><div className="font-semibold text-orange-700">{lang.partial}</div><div className="text-orange-600 text-xs">Partial</div></div>
                    <div className="bg-slate-100 p-2 rounded"><div className="font-semibold text-slate-700">{lang.empty}</div><div className="text-slate-600 text-xs">Empty</div></div>
                  </div>
                  {lang.last_push_at && (
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last push: {formatDate(lang.last_push_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Content translation table */}
        {nonEnLangs.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900">Content Translation Completeness</CardTitle>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Content</SelectItem>
                    <SelectItem value="missing">Not Started</SelectItem>
                    <SelectItem value="in-progress">Partially Done</SelectItem>
                    <SelectItem value="ready">100% Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tours" className="w-full">
                <TabsList className="grid grid-cols-3 w-full mb-6">
                  <TabsTrigger value="tours">Tours ({filteredTours.length})</TabsTrigger>
                  <TabsTrigger value="destinations">Destinations ({filteredDestinations.length})</TabsTrigger>
                  <TabsTrigger value="blogposts">Blog Posts ({filteredBlogPosts.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="tours"><ContentTable items={filteredTours} type="tours" fields={TOUR_FIELDS} /></TabsContent>
                <TabsContent value="destinations"><ContentTable items={filteredDestinations} type="destinations" fields={DEST_FIELDS} /></TabsContent>
                <TabsContent value="blogposts"><ContentTable items={filteredBlogPosts} type="blogposts" fields={BLOG_FIELDS} /></TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Language Site' : 'Add Language Site'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="language_code">Language Code</Label><Input id="language_code" value={formData.language_code} onChange={(e) => setFormData({ ...formData, language_code: e.target.value })} placeholder="e.g., de, nl, en" required /></div>
            <div><Label htmlFor="language_name">Language Name</Label><Input id="language_name" value={formData.language_name} onChange={(e) => setFormData({ ...formData, language_name: e.target.value })} placeholder="e.g., German, Dutch, English" required /></div>
            <div><Label htmlFor="flag_emoji">Flag Emoji</Label><Input id="flag_emoji" value={formData.flag_emoji} onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })} placeholder="e.g., 🇩🇪" /></div>
            <div><Label htmlFor="site_url">Site URL</Label><Input id="site_url" value={formData.site_url} onChange={(e) => setFormData({ ...formData, site_url: e.target.value })} placeholder="https://example.com" required /></div>
            <div>
              <Label htmlFor="app_type">App Type</Label>
              <Select value={formData.app_type} onValueChange={(v) => setFormData({ ...formData, app_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="supabase">Supabase</SelectItem><SelectItem value="wordpress">WordPress</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="api_endpoint">API Endpoint</Label><Input id="api_endpoint" value={formData.api_endpoint} onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })} placeholder="https://api.example.com/push" /></div>
            <div>
              <Label htmlFor="api_key">API Key</Label>
              <div className="flex gap-2">
                <Input id="api_key" type={showApiKey ? 'text' : 'password'} value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} placeholder="Secret API key" />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)} className="flex-shrink-0">
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_subdirectory} onChange={(e) => setFormData({ ...formData, is_subdirectory: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Is Subdirectory</span>
              </label>
            </div>
            {formData.is_subdirectory && (
              <div><Label htmlFor="parent_site_url">Parent Site URL</Label><Input id="parent_site_url" value={formData.parent_site_url} onChange={(e) => setFormData({ ...formData, parent_site_url: e.target.value })} placeholder="https://example.com" /></div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}