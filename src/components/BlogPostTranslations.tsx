// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Save, Zap, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import TranslationField from './TranslationField';
import { sanitizeHtml } from './sanitize';

export default function BlogPostTranslations({ post, postId }) {
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

  // Fetch active language sites (exclude English as it's the source)
  const { data: languageSites = [] } = useQuery({
    queryKey: ['languageSites'],
    queryFn: async () => {
      const { data } = await supabase.from('language_sites').select('*').match({ status: 'active' });
      const sites = data || [];
      return sites
        .filter(site => site.language_code !== 'en')
        .sort((a, b) => {
          const order = { 'de': 1, 'nl': 2 };
          return (order[a.language_code] || 99) - (order[b.language_code] || 99);
        });
    },
    enabled: !!postId
  });

  // Set default language on first load
  useEffect(() => {
    if (languageSites.length > 0 && !selectedLanguage) {
      setSelectedLanguage(languageSites[0]);
    }
  }, [languageSites]);

  const buildPostTranslations = (langCode) => {
    const suffix = `_${langCode}`;
    return {
      title: post[`title${suffix}`] || '',
      content: post[`content${suffix}`] || '',
      excerpt: post[`excerpt${suffix}`] || '',
      meta_title: post[`meta_title${suffix}`] || '',
      meta_description: post[`meta_description${suffix}`] || ''
    };
  };

  useEffect(() => {
    const langCode = selectedLanguage?.language_code;
    if (!langCode) return;

    if (translationCacheRef.current[langCode]) {
      setTranslations(translationCacheRef.current[langCode]);
      return;
    }

    const loaded = buildPostTranslations(langCode);
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
      const suffix = `_${langCode}`;
      
      const dataToSave = {
        [`title${suffix}`]: translations.title,
        [`content${suffix}`]: translations.content,
        [`excerpt${suffix}`]: translations.excerpt,
        [`meta_title${suffix}`]: translations.meta_title,
        [`meta_description${suffix}`]: translations.meta_description
      };

      const response = await supabase.from('posts').update(dataToSave).eq('id', postId).select().single();
      return response.data;
    },
    onSuccess: (savedPost) => {
      const langCode = selectedLanguage?.language_code;
      translationCacheRef.current[langCode] = { ...translations };
      queryClient.setQueryData(['blogPost', postId], (old) => old ? { ...old, ...savedPost } : savedPost);
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
      setTranslations(prev => {
        const updated = {
          ...prev,
          title: data.title || prev.title,
          content: data.content || prev.content,
          excerpt: data.excerpt || prev.excerpt,
          meta_title: data.meta_title || prev.meta_title,
          meta_description: data.meta_description || prev.meta_description
        };
        translationCacheRef.current[langCode] = updated;
        return updated;
      });
      setHasChanges(true);
      toast.success('Translation complete — please review before saving');
    },
    onError: (error) => {
      console.error('Auto-translate error:', error);
      toast.error('Translation failed: ' + (error?.message || 'Unknown error. Check console.'));
    }
  });

  if (!selectedLanguage) {
    return <div className="text-center py-8">Loading translations...</div>;
  }

  const langCode = selectedLanguage.language_code;
  const langName = selectedLanguage.language_name;
  const flagEmoji = selectedLanguage.flag_emoji;

  const hasEmptyFields = [
    'title', 'content', 'excerpt', 'meta_title', 'meta_description'
  ].some(field => !translations[field]);

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap items-center">
            {/* English - Source Language */}
            <Button
              disabled
              variant="outline"
              className="gap-2 opacity-75 cursor-default"
            >
              <span>🇬🇧</span>
              English
              <Badge className="ml-2 bg-slate-200 text-slate-800 text-xs">Default (.com)</Badge>
            </Button>
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
                  {post.title}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Content</Label>
                <div className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-32 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content || '(empty)') }} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Excerpt</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-24 overflow-y-auto">
                  {post.excerpt || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Meta Title</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200">
                  {post.meta_title || '(empty)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Meta Description</Label>
                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200 max-h-20 overflow-y-auto">
                  {post.meta_description || '(empty)'}
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
              <TranslationField label="Content" value={translations.content} onChange={(v) => handleFieldChange('content', v)} isRichText isEmpty={!translations.content} minHeight="200px" />
              <TranslationField label="Excerpt" value={translations.excerpt} onChange={(v) => handleFieldChange('excerpt', v)} isRichText isEmpty={!translations.excerpt} />
              <TranslationField label="Meta Title" value={translations.meta_title} onChange={(v) => handleFieldChange('meta_title', v)} isEmpty={!translations.meta_title} charLimit={60} />
              <TranslationField label="Meta Description" value={translations.meta_description} onChange={(v) => handleFieldChange('meta_description', v)} isRichText={false} isEmpty={!translations.meta_description} charLimit={160} />
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
              className="bg-whi text-whi-on hover:bg-whi-hover gap-2"
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