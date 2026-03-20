// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { getFieldKey, getRichTextField } from '../LanguageAwareInput';

export default function TourSEO({
  formData,
  selectedLanguage,
  saveMutation,
  handleInputChange,
  fieldSaveMutation,
  isTranslating,
  onSave
}) {
  return (
    <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-slate-900">SEO Settings</CardTitle>
          <CardDescription>Search engine optimization for search engines</CardDescription>
        </div>
        <Button onClick={onSave} disabled={saveMutation.isPending} className="bg-slate-300 text-slate-900 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-whi-hover" size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="meta_title">Meta Title</Label>
            <span className={`text-sm ${(getRichTextField(formData, 'meta_title', selectedLanguage)?.length || 0) > 60 ? 'text-red-500' : (getRichTextField(formData, 'meta_title', selectedLanguage)?.length || 0) >= 50 ? 'text-whi' : 'text-slate-500'}`}>
              {getRichTextField(formData, 'meta_title', selectedLanguage)?.length || 0} / 70
            </span>
          </div>
          <Input
            id="meta_title"
            value={getRichTextField(formData, 'meta_title', selectedLanguage)}
            onChange={(e) => handleInputChange(getFieldKey('meta_title', selectedLanguage), e.target.value.slice(0, 70))}
            onBlur={() => fieldSaveMutation.mutate(formData)}
            maxLength={70}
            placeholder="e.g., Wicklow Way 8-Day Walking Holiday | Walking Holiday Ireland"
            disabled={isTranslating} />

          <p className="text-xs text-slate-700">Recommended: 50–60 characters. Include tour name and primary keyword.</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="meta_description">Meta Description</Label>
            <span className={`text-sm ${(getRichTextField(formData, 'meta_description', selectedLanguage)?.length || 0) > 160 ? 'text-red-500' : (getRichTextField(formData, 'meta_description', selectedLanguage)?.length || 0) >= 140 ? 'text-whi' : 'text-slate-500'}`}>
              {getRichTextField(formData, 'meta_description', selectedLanguage)?.length || 0} / 170
            </span>
          </div>
          <Textarea
            id="meta_description"
            value={getRichTextField(formData, 'meta_description', selectedLanguage)}
            onChange={(e) => handleInputChange(getFieldKey('meta_description', selectedLanguage), e.target.value.slice(0, 170))}
            onBlur={() => fieldSaveMutation.mutate(formData)}
            maxLength={170}
            rows={3}
            placeholder="e.g., Walk the Wicklow Way in 8 days with luggage transfers and handpicked B&Bs. Self-guided hiking through Ireland's Garden County."
            disabled={isTranslating} />

          <p className="text-xs text-slate-700">Recommended: 150–160 characters. Compelling summary with a call to action.</p>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-slate-900 mb-4">Google Search Preview</h3>
          <SEOPreview
            title={getRichTextField(formData, 'meta_title', selectedLanguage)}
            description={getRichTextField(formData, 'meta_description', selectedLanguage)}
            slug={formData.slug} />

        </div>
      </CardContent>
    </Card>);

}

function SEOPreview({ title, description, slug }) {
  const baseUrl = 'walkingholidayireland.com';
  const truncatedTitle = title ? title.substring(0, 60) + (title.length > 60 ? '...' : '') : 'Tour Title';
  const truncatedDesc = description ? description.substring(0, 155) + (description.length > 155 ? '...' : '') : 'Tour description...';
  const urlPath = slug ? `${baseUrl} › walking-tour › ${slug.substring(0, 30)}...` : `${baseUrl} › tour`;

  return (
    <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
      <p className="text-whi-purple font-medium text-sm mb-1">{truncatedTitle}</p>
      <p className="text-whi text-xs mb-2">{urlPath}</p>
      <p className="text-slate-600 text-sm leading-relaxed">{truncatedDesc}</p>
    </div>);

}