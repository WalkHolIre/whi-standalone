// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Zap, Loader2, CheckCircle2, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { default as MarkdownEditor } from './MarkdownEditor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isFilled = (val) => {
  if (val === null || val === undefined) return false;
  if (Array.isArray(val)) return val.length > 0;
  const s = String(val).trim();
  return s.length > 0 && s !== '<p></p>' && s !== '<br>';
};

const POI_TYPE_COLOURS = {
  scenic: 'bg-blue-100 text-blue-800',
  historic: 'bg-amber-100 text-amber-800',
  'pre-historic': 'bg-orange-100 text-orange-800',
  viewpoint: 'bg-cyan-100 text-cyan-800',
  village: 'bg-purple-100 text-purple-800',
  landmark: 'bg-rose-100 text-rose-800',
  nature: 'bg-green-100 text-green-800'
};

const ACTIVITY_ICONS = {
  hiking: '🥾',
  sightseeing: '📷',
  food: '🍽️',
  culture: '🏛️',
  nature: '🌿',
  history: '📜'
};

const TIP_CATEGORIES = {
  navigation: { label: 'Navigation', icon: '🧭' },
  safety: { label: 'Safety', icon: '⚠️' },
  logistics: { label: 'Logistics', icon: '🚗' },
  accommodation: { label: 'Accommodation', icon: '🏡' },
  planning: { label: 'Planning', icon: '📅' },
  weather: { label: 'Weather', icon: '🌦️' },
  general: { label: 'General', icon: '💡' }
};

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Two-column row ──────────────────────────────────────────────────────────

function TwoCol({ label, right }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <div>{right}</div>
    </div>
  );
}

// ─── Field components ────────────────────────────────────────────────────────

function TextField({ value, onChange, placeholder, isEmpty, charLimit }) {
  const count = (value || '').length;
  const over = charLimit && count > charLimit;
  return (
    <div className="space-y-1">
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={isEmpty ? 'border-red-300' : ''} />
      {charLimit &&
        <p className={`text-xs text-right ${over ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
          {count} / {charLimit}
        </p>
      }
      {isEmpty &&
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Missing translation
        </p>
      }
    </div>
  );
}

function TextAreaField({ value, onChange, placeholder, isEmpty, charLimit, rows = 3 }) {
  const count = (value || '').length;
  const over = charLimit && count > charLimit;
  return (
    <div className="space-y-1">
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={isEmpty ? 'border-red-300' : ''} />
      {charLimit &&
        <p className={`text-xs text-right ${over ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
          {count} / {charLimit}
        </p>
      }
      {isEmpty &&
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Missing translation
        </p>
      }
    </div>
  );
}

// ─── Structured array editors ─────────────────────────────────────────────────

function POITranslationEditor({ englishPois = [], value = [], onChange }) {
  useEffect(() => {
    if (englishPois.length > 0 && value.length < englishPois.length) {
      const merged = englishPois.map((eng, i) => ({
        type: eng.type,
        lat: eng.lat,
        lng: eng.lng,
        image_url: eng.image_url || '',
        name: value[i]?.name || '',
        description: value[i]?.description || ''
      }));
      onChange(merged);
    }
  }, [englishPois.length]);

  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {englishPois.map((eng, i) => {
        const tr = value[i] || {};
        const isEmpty = !tr.name && !tr.description;
        const imageUrl = eng.image_url || tr.image_url || '';
        return (
          <div key={i} className={`p-3 rounded-lg border ${isEmpty ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex gap-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={eng.name}
                  className="rounded-md object-cover border border-border flex-shrink-0"
                  style={{ width: '120px', height: '80px', maxWidth: '300px' }}
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-500">#{i + 1}</span>
                  {eng.type &&
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${POI_TYPE_COLOURS[eng.type] || 'bg-slate-100 text-slate-600'}`}>{eng.type}</span>
                  }
                </div>
                <Input
                  value={tr.name || ''}
                  onChange={(e) => update(i, 'name', e.target.value)}
                  placeholder="Translate name..."
                  className={!tr.name ? 'border-red-300' : ''} />
                <Textarea
                  value={tr.description || ''}
                  onChange={(e) => update(i, 'description', e.target.value)}
                  placeholder="Translate description..."
                  rows={2}
                  className={!tr.description ? 'border-red-300' : ''} />
              </div>
            </div>
          </div>
        );
      })}
      {englishPois.length === 0 &&
        <p className="text-sm text-slate-400 italic">No points of interest in English content.</p>
      }
    </div>
  );
}

function ActivitiesTranslationEditor({ englishActivities = [], value = [], onChange }) {
  useEffect(() => {
    if (englishActivities.length > 0 && value.length < englishActivities.length) {
      const merged = englishActivities.map((eng, i) => ({
        icon: eng.icon,
        title: value[i]?.title || '',
        description: value[i]?.description || ''
      }));
      onChange(merged);
    }
  }, [englishActivities.length]);

  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {englishActivities.map((eng, i) => {
        const tr = value[i] || {};
        const isEmpty = !tr.title && !tr.description;
        return (
          <div key={i} className={`p-3 rounded-lg border ${isEmpty ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span>{ACTIVITY_ICONS[eng.icon] || '🎯'}</span>
                <span className="text-xs text-slate-500">#{i + 1}</span>
              </div>
              <Input
                value={tr.title || ''}
                onChange={(e) => update(i, 'title', e.target.value)}
                placeholder="Translate title..."
                className={!tr.title ? 'border-red-300' : ''} />
              <Textarea
                value={tr.description || ''}
                onChange={(e) => update(i, 'description', e.target.value)}
                placeholder="Translate description..."
                rows={2}
                className={!tr.description ? 'border-red-300' : ''} />
            </div>
          </div>
        );
      })}
      {englishActivities.length === 0 &&
        <p className="text-sm text-slate-400 italic">No activities in English content.</p>
      }
    </div>
  );
}

function TipsTranslationEditor({ englishTips = [], value = [], onChange }) {
  useEffect(() => {
    if (englishTips.length > 0 && value.length < englishTips.length) {
      const merged = englishTips.map((eng, i) => ({
        category: eng.category,
        tip: value[i]?.tip || ''
      }));
      onChange(merged);
    }
  }, [englishTips.length]);

  const update = (i, val) => {
    const next = [...value];
    next[i] = { ...next[i], tip: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {englishTips.map((eng, i) => {
        const tr = value[i] || {};
        const cat = TIP_CATEGORIES[eng.category] || { label: eng.category, icon: '💡' };
        const isEmpty = !tr.tip;
        return (
          <div key={i} className={`p-3 rounded-lg border ${isEmpty ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span>{cat.icon}</span>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{cat.label}</span>
              </div>
              <Textarea
                value={tr.tip || ''}
                onChange={(e) => update(i, e.target.value)}
                placeholder="Translate tip..."
                rows={2}
                className={isEmpty ? 'border-red-300' : ''} />
            </div>
          </div>
        );
      })}
      {englishTips.length === 0 &&
        <p className="text-sm text-slate-400 italic">No travel tips in English content.</p>
      }
    </div>
  );
}

// ─── Translation fields that map to destination_translations table columns ───

const TEXT_FIELDS = [
  'name', 'short_description', 'overview', 'description',
  'landscape_description', 'difficulty_overview', 'who_is_it_for',
  'best_time_to_visit', 'accommodation_style', 'cultural_highlights',
  'practical_info', 'meta_title', 'meta_description'
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DestinationTranslations({ destinationId }) {
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [translations, setTranslations] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Fetch the English destination data
  const { data: destination } = useQuery({
    queryKey: ['destination', destinationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('destinations')
        .select('*')
        .eq('id', destinationId)
        .single();
      return data;
    },
    enabled: !!destinationId,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Fetch active language sites (excluding English)
  const { data: languageSites = [] } = useQuery({
    queryKey: ['languageSites'],
    queryFn: async () => {
      const { data } = await supabase
        .from('language_sites')
        .select('*')
        .eq('status', 'active');
      const sites = (data || []).filter((s) => s.language_code !== 'en');
      return sites.sort((a, b) => {
        const order = { de: 1, nl: 2, es: 3, fr: 4 };
        return (order[a.language_code] || 99) - (order[b.language_code] || 99);
      });
    },
    enabled: !!destinationId
  });

  // Fetch the translation row for the selected language
  const { data: translationRow, refetch: refetchTranslation } = useQuery({
    queryKey: ['destination_translation', destinationId, selectedLanguage?.language_code],
    queryFn: async () => {
      const { data } = await supabase
        .from('destination_translations')
        .select('*')
        .eq('destination_id', destinationId)
        .eq('language_code', selectedLanguage.language_code)
        .maybeSingle();
      return data;
    },
    enabled: !!destinationId && !!selectedLanguage?.language_code,
    staleTime: 0
  });

  // Auto-select first language
  useEffect(() => {
    if (languageSites.length > 0 && !selectedLanguage) {
      setSelectedLanguage(languageSites[0]);
    }
  }, [languageSites]);

  // Load translation data into form state when translation row changes
  useEffect(() => {
    if (!selectedLanguage) return;
    const row = translationRow || {};
    const t = {};
    TEXT_FIELDS.forEach((f) => { t[f] = row[f] || ''; });
    setTranslations(t);
  }, [translationRow, selectedLanguage?.language_code]);

  const handleFieldChange = useCallback((field, value) => {
    setTranslations((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Save translation to the destination_translations table (upsert)
  const handleSave = async () => {
    const langCode = selectedLanguage?.language_code;
    if (!langCode) return;
    setIsSaving(true);

    const dataToSave = {
      destination_id: destinationId,
      language_code: langCode,
    };
    TEXT_FIELDS.forEach((f) => { dataToSave[f] = translations[f] || ''; });

    try {
      const { error } = await supabase
        .from('destination_translations')
        .upsert(dataToSave, { onConflict: 'destination_id,language_code' });

      if (error) throw error;

      await refetchTranslation();
      toast.success('Translation saved');
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle AI translation of all fields
  const handleTranslateAll = async () => {
    setIsTranslating(true);
    try {
      // TODO: Connect to Supabase Edge Function for AI translation
      // This will use Claude API to:
      // 1. Take all English fields from the destination
      // 2. Do local keyword research for the target language/market
      // 3. Localise and translate all content with SEO best practices
      // 4. Return translated content for all fields

      console.warn('TODO: Connect AI translation via Supabase Edge Function');
      toast.info('AI translation not yet connected. Please translate manually or connect the Edge Function.');
    } catch (err) {
      toast.error('Translation failed: ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  if (!destination || !selectedLanguage) {
    return <div className="text-center py-8 text-muted-foreground">Loading translations...</div>;
  }

  const langCode = selectedLanguage.language_code;
  const engPois = destination.points_of_interest || [];
  const engActivities = destination.top_activities || [];
  const engTips = destination.travel_tips || [];

  const t = translations;

  // Count how many text fields are filled
  const filledCount = TEXT_FIELDS.filter((f) => isFilled(t[f])).length;
  const totalCount = TEXT_FIELDS.length;

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <Card className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {languageSites.map((lang) =>
                <Button
                  key={lang.language_code}
                  variant={selectedLanguage?.language_code === lang.language_code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang)}
                  className={selectedLanguage?.language_code === lang.language_code ? 'bg-whi text-white hover:bg-orange-600' : ''}>
                  <span className="mr-1">{lang.flag_emoji}</span>
                  {lang.language_name}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {filledCount} / {totalCount} fields
              </Badge>
              <Button
                onClick={handleTranslateAll}
                disabled={isTranslating}
                size="sm"
                className="gap-1.5 bg-whi text-white hover:bg-orange-600">
                {isTranslating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Translating...</>
                  : <><Zap className="w-4 h-4" />Translate All Fields</>
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Basic Info ── */}
      <Section title="Basic Info" defaultOpen>
        <TwoCol
          label="Name"
          right={
            <TextField
              value={t.name}
              onChange={(v) => handleFieldChange('name', v)}
              placeholder="Translate name..."
              isEmpty={!isFilled(t.name)} />
          } />
        <TwoCol
          label="Short Description"
          right={
            <TextField
              value={t.short_description}
              onChange={(v) => handleFieldChange('short_description', v)}
              placeholder="Translate short description..."
              isEmpty={!isFilled(t.short_description)} />
          } />
      </Section>

      {/* ── Main Content ── */}
      <Section title="Main Content" defaultOpen>
        <TwoCol
          label="Overview"
          right={
            <MarkdownEditor
              value={t.overview || ''}
              onChange={(v) => handleFieldChange('overview', v)}
              rows={4}
              placeholder="Translate overview..." />
          } />
        <TwoCol
          label="Description"
          right={
            <MarkdownEditor
              value={t.description || ''}
              onChange={(v) => handleFieldChange('description', v)}
              rows={6}
              placeholder="Translate description..." />
          } />
        <TwoCol
          label="Landscape Description"
          right={
            <MarkdownEditor
              value={t.landscape_description || ''}
              onChange={(v) => handleFieldChange('landscape_description', v)}
              rows={4}
              placeholder="Translate landscape description..." />
          } />
      </Section>

      {/* ── Walking Info ── */}
      <Section title="Walking Info">
        <TwoCol
          label="Difficulty Overview"
          right={
            <MarkdownEditor
              value={t.difficulty_overview || ''}
              onChange={(v) => handleFieldChange('difficulty_overview', v)}
              rows={4}
              placeholder="Translate difficulty overview..." />
          } />
        <TwoCol
          label="Who Is It For?"
          right={
            <MarkdownEditor
              value={t.who_is_it_for || ''}
              onChange={(v) => handleFieldChange('who_is_it_for', v)}
              rows={4}
              placeholder="Translate audience description..." />
          } />
        <TwoCol
          label="Best Time to Visit"
          right={
            <MarkdownEditor
              value={t.best_time_to_visit || ''}
              onChange={(v) => handleFieldChange('best_time_to_visit', v)}
              rows={4}
              placeholder="Translate best time to visit..." />
          } />
        <TwoCol
          label="Accommodation Style"
          right={
            <MarkdownEditor
              value={t.accommodation_style || ''}
              onChange={(v) => handleFieldChange('accommodation_style', v)}
              rows={4}
              placeholder="Translate accommodation style..." />
          } />
      </Section>

      {/* ── Culture & Practical ── */}
      <Section title="Culture & Practical">
        <TwoCol
          label="Cultural Highlights"
          right={
            <MarkdownEditor
              value={t.cultural_highlights || ''}
              onChange={(v) => handleFieldChange('cultural_highlights', v)}
              rows={4}
              placeholder="Translate cultural highlights..." />
          } />
        <TwoCol
          label="Practical Info"
          right={
            <MarkdownEditor
              value={t.practical_info || ''}
              onChange={(v) => handleFieldChange('practical_info', v)}
              rows={4}
              placeholder="Translate practical info..." />
          } />
      </Section>

      {/* ── SEO ── */}
      <Section title="SEO">
        <TwoCol
          label="Meta Title"
          right={
            <TextField
              value={t.meta_title}
              onChange={(v) => handleFieldChange('meta_title', v)}
              placeholder="Translate meta title..."
              isEmpty={!isFilled(t.meta_title)}
              charLimit={70} />
          } />
        <TwoCol
          label="Meta Description"
          right={
            <TextAreaField
              value={t.meta_description}
              onChange={(v) => handleFieldChange('meta_description', v)}
              placeholder="Translate meta description..."
              isEmpty={!isFilled(t.meta_description)}
              charLimit={170}
              rows={2} />
          } />
      </Section>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 bg-whi text-white hover:bg-orange-600">
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            : <><Save className="w-4 h-4" />Save Translation</>
          }
        </Button>
      </div>
    </div>
  );
}
