// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Zap, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import TranslationField from './TranslationField';
import AddLanguageButton from './AddLanguageButton';

export default function TourTranslations({ tour, tourId }) {
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [translations, setTranslations] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const translationCacheRef = useRef({});
  const hasChangesRef = useRef({});  // track unsaved changes per language

  const handleFieldChange = (field, value) => {
    const langCode = selectedLanguage?.language_code;
    setTranslations(prev => {
      const updated = { ...prev, [field]: value };
      translationCacheRef.current[langCode] = updated;
      return updated;
    });
    setHasChanges(true);
  };

  // Fetch active language sites
  const { data: languageSites = [] } = useQuery({
    queryKey: ['languageSites'],
    queryFn: async () => {
      const { data } = await supabase.from('language_sites').select('*').match({ status: 'active' });
      const sites = data || [];
      return sites.filter(s => s.language_code !== 'en').sort((a, b) => {
        const order = { 'de': 1, 'nl': 2 };
        return (order[a.language_code] || 99) - (order[b.language_code] || 99);
      });
    },
    enabled: !!tourId
  });

  // Set default language on first load
  useEffect(() => {
    if (languageSites.length > 0 && !selectedLanguage) {
      setSelectedLanguage(languageSites[0]);
    }
  }, [languageSites]);

  const buildTourTranslations = (langCode) => {
    const suffix = `_${langCode}`;
    return {
      title: tour[`title${suffix}`] || '',
      subtitle: tour[`subtitle${suffix}`] || '',
      overview: tour[`overview${suffix}`] || '',
      highlights: tour[`highlights${suffix}`] || '',
      included_service: tour[`included_service${suffix}`] || '',
      included_transport: tour[`included_transport${suffix}`] || '',
      included_accommodation: tour[`included_accommodation${suffix}`] || '',
      not_included: tour[`not_included${suffix}`] || '',
      who_is_it_for: tour[`who_is_it_for${suffix}`] || '',
      accommodation_description: tour[`accommodation_description${suffix}`] || '',
      meta_title: tour[`meta_title${suffix}`] || '',
      meta_description: tour[`meta_description${suffix}`] || '',
      itinerary: tour[`itinerary${suffix}`] || []
    };
  };

  useEffect(() => {
    const langCode = selectedLanguage?.language_code;
    if (!langCode) return;

    if (translationCacheRef.current[langCode]) {
      setTranslations(translationCacheRef.current[langCode]);
      return;
    }

    const loaded = buildTourTranslations(langCode);
    translationCacheRef.current[langCode] = loaded;
    setTranslations(loaded);
    // Don't reset hasChanges here — handleLanguageChange manages it via hasChangesRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage?.language_code]);

  const handleLanguageChange = (language) => {
    hasChangesRef.current[selectedLanguage?.language_code] = hasChanges;
    setSelectedLanguage(language);
    setHasChanges(hasChangesRef.current[language.language_code] || false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLanguage) return;

      const langCode = selectedLanguage.language_code;

      // Use tour_translations table instead of language-suffixed fields in tours table
      const existingTranslation = await supabase.from('tour_translations')
        .select('id')
        .eq('tour_id', tourId)
        .eq('language_code', langCode)
        .single();

      const translationData = {
        tour_id: tourId,
        language_code: langCode,
        name: translations.title,
        subtitle: translations.subtitle,
        overview: translations.overview,
        description: translations.overview,
        short_description: translations.short_description || translations.overview,
        highlights: translations.highlights,
        whats_included: translations.included_service,
        whats_not_included: translations.not_included,
        meta_title: translations.meta_title,
        meta_description: translations.meta_description,
        translation_status: 'completed'
      };

      let response;
      if (existingTranslation.data) {
        response = await supabase.from('tour_translations')
          .update(translationData)
          .eq('id', existingTranslation.data.id)
          .select()
          .single();
      } else {
        response = await supabase.from('tour_translations')
          .insert(translationData)
          .select()
          .single();
      }
      return response.data;
    },
    onSuccess: (savedTour) => {
      const langCode = selectedLanguage?.language_code;
      translationCacheRef.current[langCode] = { ...translations };
      queryClient.setQueryData(['tour', tourId], (old) => old ? { ...old, ...savedTour } : savedTour);
      setHasChanges(false);
      toast.success('Translations saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save translations: ' + error.message);
    }
  });

  const autoTranslateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLanguage) return;

      // TODO: Integrate AI service directly
      console.warn('LLM invocation not yet configured');
      return null;
    },
    onSuccess: (data) => {
      const langCode = selectedLanguage?.language_code;
      let translatedHighlights = data.highlights || '';
      if (translatedHighlights && !translatedHighlights.startsWith('[')) {
        translatedHighlights = JSON.stringify(
          translatedHighlights.split('\n').filter(h => h.trim())
        );
      }
      setTranslations(prev => {
        const updated = {
          ...prev,
          title: data.title || prev.title,
          subtitle: data.subtitle || prev.subtitle,
          overview: data.overview || prev.overview,
          highlights: translatedHighlights || prev.highlights,
          included_service: data.included_service || prev.included_service,
          included_transport: data.included_transport || prev.included_transport,
          included_accommodation: data.included_accommodation || prev.included_accommodation,
          not_included: data.not_included || prev.not_included,
          who_is_it_for: data.who_is_it_for || prev.who_is_it_for,
          accommodation_description: data.accommodation_description || prev.accommodation_description,
          meta_title: data.meta_title || prev.meta_title,
          meta_description: data.meta_description || prev.meta_description,
          itinerary: data.itinerary || prev.itinerary
        };
        translationCacheRef.current[langCode] = updated;
        return updated;
      });
      setHasChanges(true);
      toast.success('Translation complete — please review before saving');
    },
    onError: (error) => {
      console.error('Auto-translate error:', error);
      toast.error('Translation failed: ' + (error?.message || 'Unknown error'));
    }
  });

  if (!selectedLanguage) {
    return <div className="text-center py-8">Loading translations...</div>;
  }

  const langCode = selectedLanguage.language_code;
  const langName = selectedLanguage.language_name;
  const flagEmoji = selectedLanguage.flag_emoji;

  const hasEmptyFields = [
    'title', 'overview', 'highlights', 'included_service',
    'included_transport', 'included_accommodation', 'not_included',
    'who_is_it_for', 'accommodation_description', 'meta_title', 'meta_description'
  ].some(field => !translations[field]);

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap items-center">
            {languageSites.map((lang) => (
              <Button
                key={lang.language_code}
                variant={selectedLanguage?.language_code === lang.language_code ? 'default' : 'outline'}
                onClick={() => handleLanguageChange(lang)}
                className={`gap-2 ${selectedLanguage?.language_code === lang.language_code ? 'bg-slate-900 text-white' : ''}`}
              >
                <span>{lang.flag_emoji}</span>
                {lang.language_name}
              </Button>
            ))}
            <AddLanguageButton
              existingCodes={languageSites.map(l => l.language_code)}
              entityType="tour"
              entityId={tourId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Translation Fields</CardTitle>
          <CardDescription>Edit content for {flagEmoji} {langName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Left: English Original */}
            <div className="space-y-6 pb-6 border-r border-slate-200 pr-8">
              <h3 className="font-semibold text-slate-900">English (Original)</h3>
              
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Title</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200">
                  {tour.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Overview</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-32 overflow-y-auto">
                  {tour.description_en || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Highlights</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-32 overflow-y-auto">
                  {tour.highlights_en || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Included Services</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-32 overflow-y-auto">
                  {tour.included_services || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Included Transport</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-24 overflow-y-auto">
                  {tour.included_transport || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Included Accommodation</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-24 overflow-y-auto">
                  {tour.included_accommodation || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Not Included</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-24 overflow-y-auto">
                  {tour.excluded_services || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Who Is It For</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-24 overflow-y-auto">
                  {tour.who_is_it_for || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Accommodation Description</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-24 overflow-y-auto">
                  {tour.accommodation_description || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Meta Title</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200">
                  {tour.meta_title || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Meta Description</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-20 overflow-y-auto">
                  {tour.meta_description || '(empty)'}
                </p>
              </div>
            </div>

            {/* Right: Translation Fields */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">{flagEmoji} {langName} Translation</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => autoTranslateMutation.mutate()}
                  disabled={autoTranslateMutation.isPending}
                >
                  {autoTranslateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Auto-Translate
                    </>
                  )}
                </Button>
              </div>

              <TranslationField label="Title" value={translations.title} onChange={(v) => handleFieldChange('title', v)} isEmpty={!translations.title} isRequired />
              <TranslationField label="Overview" value={translations.overview} onChange={(v) => handleFieldChange('overview', v)} isRichText isEmpty={!translations.overview} minHeight="200px" />
              <TranslationField label="Highlights" value={translations.highlights} onChange={(v) => handleFieldChange('highlights', v)} isRichText isEmpty={!translations.highlights} />
              <TranslationField label="Included Services" value={translations.included_service} onChange={(v) => handleFieldChange('included_service', v)} isRichText isEmpty={!translations.included_service} />
              <TranslationField label="Included Transport" value={translations.included_transport} onChange={(v) => handleFieldChange('included_transport', v)} isEmpty={!translations.included_transport} />
              <TranslationField label="Included Accommodation" value={translations.included_accommodation} onChange={(v) => handleFieldChange('included_accommodation', v)} isEmpty={!translations.included_accommodation} />
              <TranslationField label="Not Included" value={translations.not_included} onChange={(v) => handleFieldChange('not_included', v)} isRichText isEmpty={!translations.not_included} />
              <TranslationField label="Who Is It For" value={translations.who_is_it_for} onChange={(v) => handleFieldChange('who_is_it_for', v)} isEmpty={!translations.who_is_it_for} />
              <TranslationField label="Accommodation Description" value={translations.accommodation_description} onChange={(v) => handleFieldChange('accommodation_description', v)} isEmpty={!translations.accommodation_description} />
              <TranslationField label="Meta Title" value={translations.meta_title} onChange={(v) => handleFieldChange('meta_title', v)} isEmpty={!translations.meta_title} charLimit={60} />
              <TranslationField label="Meta Description" value={translations.meta_description} onChange={(v) => handleFieldChange('meta_description', v)} isEmpty={!translations.meta_description} charLimit={160} />
            </div>
          </div>

          {/* Missing Fields Warning */}
          {hasEmptyFields && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Some translation fields are empty. Complete them before publishing.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 flex gap-2 justify-end">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending || autoTranslateMutation.isPending}
              className="bg-whi hover:bg-whi-hover text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Translations'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}