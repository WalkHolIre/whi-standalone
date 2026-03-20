// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X, ExternalLink, Save, ArrowLeft, Link as LinkIcon, Plus, Trash2, GripVertical } from 'lucide-react';
import PointsOfInterestEditor from '@/components/destination/PointsOfInterestEditor';
import TopActivitiesEditor from '@/components/destination/TopActivitiesEditor';
import TravelTipsEditor from '@/components/destination/TravelTipsEditor';
import { default as MarkdownEditor } from '@/components/MarkdownEditor';
import { toast } from 'sonner';
import ImageLibraryPicker from '@/components/ImageLibraryPicker';
import FAQLinkingModal from '@/components/FAQLinkingModal';
import FAQCreationModal from '@/components/FAQCreationModal';
import DestinationTranslations from '@/components/DestinationTranslations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';

export default function DestinationEditor() {
  const router = useRouter();
  const queryClient = useQueryClient();

  
  const [destinationId, setDestinationId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<string | null>(null);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDestinationId(params.get('id'));
    setMode(params.get('mode'));
  }, []);
  const isNew = mode === 'new' || !destinationId;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    country: 'Ireland',
    region_id: '',
    status: 'draft',
    hero_image: '',
    gallery: [],
    map_center_lat: null,
    map_center_lng: null,
    map_zoom: 10,
    seo_keywords: '',
    meta_description: '',
    meta_title: '',
    short_description: '',
    overview: '',
    description: '',
    landscape_description: '',
    cultural_highlights: '',
    difficulty_overview: '',
    accommodation_style: '',
    practical_info: '',
    who_is_it_for: '',
    best_time_to_visit: '',
    best_months: [],
    video_gallery: [],
    points_of_interest: [],
    travel_tips: [],
    top_activities: [],
    local_cuisine: []
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showFaqLinkModal, setShowFaqLinkModal] = useState(false);
  const [showFaqCreateModal, setShowFaqCreateModal] = useState(false);

  const { data: destination, isLoading } = useQuery({
    queryKey: ['destination', destinationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('destinations')
        .select('*, region:regions(id, name, code, slug)')
        .eq('id', destinationId)
        .single();
      return data;
    },
    enabled: !isNew && !!destinationId
  });

  const { data: allFaqs = [] } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data } = await supabase.from('faqs').select('*').order('sort_order');
      return data || [];
    },
    enabled: !isNew && !!destinationId
  });

  // Fetch FAQ-destination links from junction table
  const { data: faqDestLinks = [] } = useQuery({
    queryKey: ['faq_destination_map', destinationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('faq_destination_map')
        .select('*')
        .eq('destination_id', destinationId)
        .order('sort_order');
      return data || [];
    },
    enabled: !isNew && !!destinationId
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*').order('sort_order');
      return data || [];
    }
  });

  useEffect(() => {
    if (destination && !isNew) {
      setFormData({
        name: destination.name || '',
        slug: destination.slug || '',
        country: destination.country || 'Ireland',
        region_id: destination.region_id || '',
        status: destination.status || 'draft',
        hero_image: destination.hero_image || '',
        gallery: destination.gallery || [],
        map_center_lat: destination.map_center_lat || null,
        map_center_lng: destination.map_center_lng || null,
        map_zoom: destination.map_zoom || 10,
        seo_keywords: destination.seo_keywords || '',
        meta_description: destination.meta_description || destination.seo_description || '',
        meta_title: destination.meta_title || '',
        short_description: destination.short_description || '',
        overview: destination.overview || '',
        description: destination.description || '',
        landscape_description: destination.landscape_description || '',
        cultural_highlights: destination.cultural_highlights || '',
        difficulty_overview: destination.difficulty_overview || '',
        accommodation_style: destination.accommodation_style || '',
        practical_info: destination.practical_info || '',
        who_is_it_for: destination.who_is_it_for || '',
        best_time_to_visit: destination.best_time_to_visit || '',
        best_months: destination.best_months || [],
        video_gallery: destination.video_gallery || [],
        points_of_interest: destination.points_of_interest || [],
        travel_tips: destination.travel_tips || [],
        top_activities: destination.top_activities || [],
        local_cuisine: destination.local_cuisine || []
      });
      setSlugManuallyEdited(true);
    }
  }, [destination, isNew]);

  const saveMutation = useMutation({
    /** @param {any} data */
    mutationFn: async (data) => {
      // Extract control fields passed from handleSave
      const { _destinationId, _isNew, ...formFields } = data;

      // Map formData fields to actual DB column names
      const dbData = {
        name: formFields.name,
        slug: formFields.slug,
        country: formFields.country,
        region_id: formFields.region_id || null,
        status: formFields.status,
        hero_image: formFields.hero_image || null,
        gallery: formFields.gallery || [],
        map_center_lat: formFields.map_center_lat || null,
        map_center_lng: formFields.map_center_lng || null,
        map_zoom: formFields.map_zoom || 10,
        seo_keywords: formFields.seo_keywords || '',
        seo_description: formFields.meta_description || '',
        meta_title: formFields.meta_title || '',
        short_description: formFields.short_description || '',
        overview: formFields.overview || '',
        description: formFields.description || '',
        landscape_description: formFields.landscape_description || '',
        cultural_highlights: formFields.cultural_highlights || '',
        difficulty_overview: formFields.difficulty_overview || '',
        accommodation_style: formFields.accommodation_style || '',
        practical_info: formFields.practical_info || '',
        who_is_it_for: formFields.who_is_it_for || '',
        best_time_to_visit: formFields.best_time_to_visit || '',
        best_months: formFields.best_months || [],
        video_gallery: formFields.video_gallery || [],
        points_of_interest: formFields.points_of_interest || [],
        travel_tips: formFields.travel_tips || [],
        top_activities: formFields.top_activities || [],
        local_cuisine: formFields.local_cuisine || [],
      };

      console.log('[Save] isNew:', _isNew, 'destinationId:', _destinationId, 'name:', dbData.name);

      if (_isNew) {
        const { data: saved, error } = await supabase.from('destinations').insert(dbData).select().single();
        if (error) { console.error('[Save] Insert error:', error); throw error; }
        return saved;
      } else {
        const { data: saved, error } = await supabase.from('destinations').update(dbData).eq('id', _destinationId).select().single();
        if (error) { console.error('[Save] Update error:', error); throw error; }
        return saved;
      }
    },
    onSuccess: (savedData) => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination', destinationId] });
      toast.success('Destination saved');
      if (isNew && savedData?.id) {
        router.push(createPageUrl(`DestinationEditor?id=${savedData.id}`));
      }
    },
    onError: (err) => {
      toast.error('Failed to save: ' + (err?.message || 'Unknown error'));
    }
  });

  const faqLinkMutation = useMutation({
    mutationFn: async ({ action, faqId, sortOrder }: { action: 'link' | 'unlink' | 'reorder'; faqId: string; sortOrder?: number }) => {
      if (action === 'link') {
        return await supabase.from('faq_destination_map').insert({
          faq_id: faqId,
          destination_id: destinationId,
          sort_order: sortOrder ?? 0,
        });
      } else if (action === 'unlink') {
        return await supabase.from('faq_destination_map')
          .delete()
          .eq('faq_id', faqId)
          .eq('destination_id', destinationId);
      } else if (action === 'reorder') {
        return await supabase.from('faq_destination_map')
          .update({ sort_order: sortOrder })
          .eq('faq_id', faqId)
          .eq('destination_id', destinationId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq_destination_map', destinationId] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    }
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'name' && !slugManuallyEdited) {
      const autoSlug = value.
        toLowerCase().
        replace(/[^a-z0-9\s-]/g, '').
        replace(/\s+/g, '-').
        replace(/-+/g, '-').
        trim();
      setFormData((prev) => ({ ...prev, slug: autoSlug }));
    }

    if (field === 'slug') {
      setSlugManuallyEdited(true);
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Generate a unique file path in Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `destinations/${destinationId || 'new'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (field === 'hero_image') {
        handleInputChange('hero_image', publicUrl);
      } else {
        handleInputChange('gallery', [...formData.gallery, publicUrl]);
      }
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (index) => {
    handleInputChange('gallery', formData.gallery.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    console.log('[handleSave] Called. destinationId:', destinationId, 'mode:', mode, 'name:', formData.name);

    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    // Clean POIs: remove empty lat/lng so they don't fail number validation
    const cleanedPois = (formData.points_of_interest || []).map(poi => {
      const cleaned = { ...poi };
      if (cleaned.lat === '' || cleaned.lat === null) delete cleaned.lat;
      if (cleaned.lng === '' || cleaned.lng === null) delete cleaned.lng;
      return cleaned;
    });

    // Ensure region_id is null not empty string (foreign key constraint)
    const dataToSave = { ...formData, points_of_interest: cleanedPois };
    if (!dataToSave.region_id) dataToSave.region_id = null;

    console.log('[handleSave] Calling mutate with destinationId:', destinationId);
    saveMutation.mutate({ _destinationId: destinationId, _isNew: !destinationId || mode === 'new', ...dataToSave });
  };

  // Build linked FAQs list from the junction table
  const linkedFaqIds = faqDestLinks.map((link) => link.faq_id);
  const linkedFaqs = linkedFaqIds
    .map((id) => allFaqs.find((f) => f.id === id))
    .filter(Boolean);

  const handleLinkFaqs = async (faqIds) => {
    const maxOrder = faqDestLinks.length > 0
      ? Math.max(...faqDestLinks.map((l) => l.sort_order ?? 0))
      : -1;

    for (let i = 0; i < faqIds.length; i++) {
      await faqLinkMutation.mutateAsync({
        action: 'link',
        faqId: faqIds[i],
        sortOrder: maxOrder + 1 + i,
      });
    }
    toast.success(`Linked ${faqIds.length} FAQ${faqIds.length !== 1 ? 's' : ''}`);
  };

  const handleUnlinkFaq = async (faqId) => {
    await faqLinkMutation.mutateAsync({ action: 'unlink', faqId });
    toast.success('FAQ unlinked');
  };

  const handleReorderFaqs = async (result) => {
    if (!result.destination) return;

    const items = Array.from(linkedFaqs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    for (let i = 0; i < items.length; i++) {
      await faqLinkMutation.mutateAsync({
        action: 'reorder',
        faqId: items[i].id,
        sortOrder: i,
      });
    }
  };

  const handleFaqCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['faqs'] });
    queryClient.invalidateQueries({ queryKey: ['faq_destination_map', destinationId] });
    toast.success('FAQ created and linked');
  };

  const pageTitle = isNew ? 'New Destination' : `Edit: ${formData.name}`;

  if (isLoading && !isNew) {
    return (
      <div className="min-h-screen p-8 bg-slate-50/50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-muted-foreground">Loading destination...</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        {/* Header Block */}
        <div className="relative overflow-hidden bg-gradient-to-br from-whi-purple via-whi-purple to-whi-purple rounded-[2rem] p-8 lg:p-10 mb-8 border border-white/10 shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-whi/20 blur-3xl mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-whi/20 blur-3xl mix-blend-screen pointer-events-none" />

          <div className="relative z-10 w-full flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2 gap-1.5 text-orange-100 hover:text-white hover:bg-white/10 rounded-lg h-8 px-2 transition-colors"
                onClick={() => router.push(createPageUrl('DestinationManager'))}>
                <ArrowLeft className="w-4 h-4" />
                Back to Destinations
              </Button>
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-orange-100 text-sm font-medium backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(241,126,0,0.8)]"></span>
                  Content Editor
                </div>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                {isNew ? 'New Destination' : 'Edit Destination'}
              </h1>
              {!isNew && <p className="text-orange-200 text-lg mt-2 font-medium">{formData.name}</p>}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => router.push(createPageUrl('DestinationManager'))}>
              Cancel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-6 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <TabsTrigger value="basic" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-whi-purple data-[state=active]:shadow-sm data-[state=active]:font-semibold text-slate-500 text-sm py-2 transition-all">Basic Details</TabsTrigger>
            <TabsTrigger value="content" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-whi-purple data-[state=active]:shadow-sm data-[state=active]:font-semibold text-slate-500 text-sm py-2 transition-all">Content</TabsTrigger>
            <TabsTrigger value="media" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-whi-purple data-[state=active]:shadow-sm data-[state=active]:font-semibold text-slate-500 text-sm py-2 transition-all">Media</TabsTrigger>
            <TabsTrigger value="translations" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-whi-purple data-[state=active]:shadow-sm data-[state=active]:font-semibold text-slate-500 text-sm py-2 transition-all">Translations</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Basic Information */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Destination Identifiers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-whi focus:ring-whi/20 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} />

                  {errors.name && <p className="text-red-500 text-sm mt-1.5 font-medium">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="slug" className="text-slate-600">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-whi focus:ring-whi/20" />

                  <p className="text-xs text-slate-500 mt-1.5 font-medium">
                    Auto-generated from name, used for website links
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)} />

                  </div>
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Select value={formData.region_id || ''} onValueChange={(val) => handleInputChange('region_id', val)}>
                      <SelectTrigger id="region">
                        <SelectValue placeholder="Select a region..." />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.code} — {r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <div className="flex gap-2">
                    <Select value={formData.status} onValueChange={(val) => handleInputChange('status', val)}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.status === 'published' &&
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:text-slate-900"
                        onClick={() => window.open(`/destinations/${formData.slug}`, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {/* Overview & Description */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Overview & Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="short_description">Brief Tagline</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => handleInputChange('short_description', e.target.value)}
                    placeholder="Brief tagline for cards and hero section" />

                </div>
                <div>
                  <Label htmlFor="overview">Overview</Label>
                  <MarkdownEditor
                    value={formData.overview}
                    onChange={(val) => handleInputChange('overview', val)}
                    rows={4}
                    placeholder="Short overview paragraph" />
                </div>
                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <MarkdownEditor
                    value={formData.description}
                    onChange={(val) => handleInputChange('description', val)}
                    rows={8}
                    placeholder="Full detailed description" />
                </div>
                <div>
                  <Label htmlFor="landscape_description">Landscape & Scenery</Label>
                  <MarkdownEditor
                    value={formData.landscape_description}
                    onChange={(val) => handleInputChange('landscape_description', val)}
                    rows={4}
                    placeholder="Describe the landscape and scenery" />

                </div>
              </CardContent>
            </Card>

            {/* Walking & Activities */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Walking & Activities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="difficulty_overview">Walking Difficulty</Label>
                  <MarkdownEditor
                    value={formData.difficulty_overview}
                    onChange={(val) => handleInputChange('difficulty_overview', val)}
                    rows={4}
                    placeholder="Difficulty and terrain information" />
                </div>
                <div>
                  <Label htmlFor="who_is_it_for">Who Is This For?</Label>
                  <MarkdownEditor
                    value={formData.who_is_it_for}
                    onChange={(val) => handleInputChange('who_is_it_for', val)}
                    rows={4}
                    placeholder="Describe the target audience" />
                </div>
                <div>
                  <Label htmlFor="best_time_to_visit">Best Time to Visit</Label>
                  <MarkdownEditor
                    value={formData.best_time_to_visit}
                    onChange={(val) => handleInputChange('best_time_to_visit', val)}
                    rows={4}
                    placeholder="Seasonal travel information" />

                </div>
                <div>
                  <Label>Best Months</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) =>
                      <label key={month} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.best_months.includes(month)}
                          onChange={(e) => {
                            const updated = e.target.checked ?
                              [...formData.best_months, month] :
                              formData.best_months.filter((m) => m !== month);
                            handleInputChange('best_months', updated);
                          }}
                          className="rounded border-border" />

                        <span className="text-sm">{month.slice(0, 3)}</span>
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Culture & Practical Info */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Culture & Practical Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cultural_highlights">Culture & Cuisine Highlights</Label>
                  <MarkdownEditor
                    value={formData.cultural_highlights}
                    onChange={(val) => handleInputChange('cultural_highlights', val)}
                    rows={4}
                    placeholder="Culture and cuisine highlights" />
                </div>
                <div>
                  <Label htmlFor="accommodation_style">Accommodation Types</Label>
                  <MarkdownEditor
                    value={formData.accommodation_style}
                    onChange={(val) => handleInputChange('accommodation_style', val)}
                    rows={4}
                    placeholder="Types of accommodation available" />
                </div>
                <div>
                  <Label htmlFor="practical_info">How to Get There</Label>
                  <MarkdownEditor
                    value={formData.practical_info}
                    onChange={(val) => handleInputChange('practical_info', val)}
                    rows={4}
                    placeholder="Transport and access information" />

                </div>
              </CardContent>
            </Card>

            {/* Structured Data Editors */}
            <Card>
              <CardContent className="pt-6 space-y-0">
                <PointsOfInterestEditor
                  value={formData.points_of_interest}
                  onChange={(v) => handleInputChange('points_of_interest', v)}
                />
                <TopActivitiesEditor
                  value={formData.top_activities}
                  onChange={(v) => handleInputChange('top_activities', v)}
                />
                <TravelTipsEditor
                  value={formData.travel_tips}
                  onChange={(v) => handleInputChange('travel_tips', v)}
                />
              </CardContent>
            </Card>

            {/* SEO */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Search Engine Optimization (SEO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meta_title">Meta Title {formData.meta_title.length > 60 && <span className="text-red-600 text-xs ml-2">(max 60 chars)</span>}</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => handleInputChange('meta_title', e.target.value)}
                    placeholder="SEO page title"
                    maxLength={60} />

                  <p className="text-xs text-muted-foreground mt-1">{formData.meta_title.length} / 60</p>
                </div>
                <div>
                  <Label htmlFor="meta_description">Meta Description {formData.meta_description.length > 160 && <span className="text-red-600 text-xs ml-2">(max 160 chars)</span>}</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => handleInputChange('meta_description', e.target.value)}
                    rows={2}
                    placeholder="Meta description for search engines"
                    maxLength={160} />

                  <p className="text-xs text-muted-foreground mt-1">{formData.meta_description.length} / 160</p>
                </div>
                <div>
                  <Label htmlFor="seo_keywords">SEO Keywords</Label>
                  <Input
                    id="seo_keywords"
                    value={formData.seo_keywords}
                    onChange={(e) => handleInputChange('seo_keywords', e.target.value)}
                    placeholder="Comma-separated keywords" />

                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            {/* Media */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Media Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Hero Image</Label>
                  {formData.hero_image ?
                    <div className="mt-2 relative">
                      <img
                        src={formData.hero_image}
                        alt="Hero"
                        className="w-full h-48 object-cover rounded-lg" />

                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleInputChange('hero_image', '')}>

                        <X className="w-4 h-4" />
                      </Button>
                    </div> :

                    <div className="mt-2 space-y-2">
                      <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-input">
                        <div className="text-center">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            {uploading ? 'Uploading...' : 'Click to upload hero image'}
                          </span>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'hero_image')}
                          disabled={uploading} />

                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 border-t border-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="flex-1 border-t border-border" />
                      </div>
                      <ImageLibraryPicker
                        onSelect={(image) => handleInputChange('hero_image', image.url)}
                        currentValue={formData.hero_image} />

                    </div>
                  }
                </div>

                <div>
                  <Label>Gallery</Label>
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    {formData.gallery.map((url, index) =>
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg" />

                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeGalleryImage(index)}>

                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <label className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-input">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'gallery')}
                        disabled={uploading} />

                    </label>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <ImageLibraryPicker
                      multiple
                      onSelect={(images) => {
                        const newUrls = images.map((img) => img.url);
                        handleInputChange('gallery', [...formData.gallery, ...newUrls]);
                      }} />

                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="translations">
            {!isNew ?
              <DestinationTranslations destinationId={destinationId} /> :

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Save the destination first before you can manage translations.
                  </p>
                </CardContent>
              </Card>
            }
          </TabsContent>
        </Tabs>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md mt-8 -mx-8 px-8 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {saveMutation.isSuccess && <span className="text-green-600 font-medium">Changes saved successfully</span>}
            {saveMutation.isError && <span className="text-red-600 font-medium">Save failed — please try again</span>}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-10 px-5 rounded-lg font-medium border-slate-200 hover:bg-slate-50"
              onClick={() => router.push(createPageUrl('DestinationManager'))}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={() => { console.log('[CLICK] Save button clicked'); handleSave(); }}
              style={{ backgroundColor: '#F17E00', color: 'white', fontWeight: 'bold', height: 40, padding: '0 24px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              disabled={saveMutation.isPending}>
              <Save style={{ width: 16, height: 16 }} />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <FAQLinkingModal
        open={showFaqLinkModal}
        onClose={() => setShowFaqLinkModal(false)}
        onLink={handleLinkFaqs}
        currentLinks={linkedFaqs.map((f) => f.id)}
        linkType="destination" />


      <FAQCreationModal
        open={showFaqCreateModal}
        onClose={() => setShowFaqCreateModal(false)}
        onCreated={handleFaqCreated}
        prefilledData={{
          section: 'destinations',
          destination_ids: [destinationId]
        }} />

    </div>);

}