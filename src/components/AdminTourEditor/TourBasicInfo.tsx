// @ts-nocheck
"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Save, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/lib/utils';
import { generateTourCode } from '../TourCodeGenerator';
import { getFieldKey, getRichTextField, getParsedArrayField } from '../LanguageAwareInput';

export default function TourBasicInfo({
  formData,
  selectedLanguage,
  destinations,
  regions,
  routes = [],
  saveMutation,
  handleInputChange,
  fieldSaveMutation,
  isTranslating,
  onSave
}) {
  // Calculate live difficulty grade from routes
  const liveDifficultyGrade = (() => {
    const englishItinerary = getParsedArrayField(formData, 'itinerary', 'en');
    const daysWithRoutes = englishItinerary.filter(d => d.route_ids && d.route_ids.length > 0);
    const scores = daysWithRoutes
      .map(d => routes.find(r => r.id === d.route_ids[0]))
      .filter(Boolean)
      .map(r => r.difficulty_score || r.effort_km || 0);
    if (scores.length === 0) return formData.tour_difficulty_grade;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg < 18) return 'Easy';
    if (avg < 25) return 'Moderate';
    if (avg < 30) return 'Challenging';
    return 'Challenging+';
  })();

  return (
    <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-slate-900">Basic Information</CardTitle>
          <CardDescription>Essential tour details</CardDescription>
        </div>
        <Button onClick={onSave} disabled={saveMutation.isPending} className="bg-whi text-slate-600 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-whi-hover" size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Title *</Label>
            <Input
              id="name"
              value={getRichTextField(formData, 'name', selectedLanguage)}
              onChange={(e) => handleInputChange(getFieldKey('name', selectedLanguage), e.target.value)}
              onBlur={() => fieldSaveMutation.mutate(formData)}
              placeholder="e.g., The Wicklow Way (8 Days)"
              disabled={isTranslating}
            />
            <p className="text-xs text-slate-700">Format: The [Trail Name] ([Duration])</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              onBlur={() => fieldSaveMutation.mutate(formData)}
              placeholder="url-friendly-slug"
              disabled={isTranslating}
            />
          </div>
        </div>

        {formData.id && (
          <div className="space-y-2">
            <Label>Record ID</Label>
            <Input
              value={formData.id}
              readOnly
              disabled
              className="bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-xs"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="subtitle">Subtitle</Label>
            <span className="text-sm text-slate-700">
              {getRichTextField(formData, 'subtitle', selectedLanguage).length || 0} / 80
            </span>
          </div>
          <Input
            id="subtitle"
            value={getRichTextField(formData, 'subtitle', selectedLanguage)}
            onChange={(e) => handleInputChange(getFieldKey('subtitle', selectedLanguage), e.target.value.slice(0, 80))}
            onBlur={() => fieldSaveMutation.mutate(formData)}
            maxLength={80}
            placeholder="e.g., 8 Days Through Ireland's Garden County"
            disabled={isTranslating}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="tour_type">Tour Type</Label>
            <Select
              value={formData.tour_type}
              onValueChange={(value) => handleInputChange('tour_type', value)}
              disabled={isTranslating}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self_guided">Self-guided</SelectItem>
                <SelectItem value="guided">Guided</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isTranslating}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="code">Tour Code</Label>
            {(() => {
              const dest = destinations.find((d) => d.id === formData.destination_id);
              const region = dest ? regions.find((r) => r.id === dest.region_id) : null;
              const liveCode = generateTourCode({ ...formData, tour_difficulty_grade: liveDifficultyGrade }, dest, region);
              const savedCode = formData.code;
              const codeChanged = savedCode && liveCode !== savedCode;
              return (
                <>
                  <Input
                    id="code"
                    value={liveCode}
                    readOnly
                    disabled
                    className="bg-slate-100 text-slate-600 cursor-not-allowed font-mono"
                  />
                  {codeChanged && (
                    <p className="text-xs text-amber-600">Saved: <span className="font-mono">{savedCode}</span> — will update on save</p>
                  )}
                  {!codeChanged && <p className="text-xs text-slate-700">Auto-generated</p>}
                </>
              );
            })()}
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <div className="flex gap-2">
              <Select
                value={formData.destination_id || ''}
                onValueChange={(value) => handleInputChange('destination_id', value === '__none__' ? '' : value)}
                disabled={isTranslating}
              >
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No Destination —</SelectItem>
                  {Array.from(new Set(destinations.map((d) => d.region_id))).map((regionId) => {
                    const region = regions.find((r) => r.id === regionId);
                    const regionDests = destinations.filter((d) => d.region_id === regionId).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    return region ?
                      <div key={regionId}>
                        <div className="px-2 py-1.5 font-semibold text-xs text-slate-500 uppercase tracking-wide">{region.name}</div>
                        {regionDests.map((dest) => <SelectItem key={dest.id} value={dest.id} className="pl-8">{dest.code} - {dest.name}</SelectItem>)}
                      </div> :
                      null;
                  })}
                </SelectContent>
              </Select>
              {formData.destination_id &&
                <Button variant="outline" size="icon" onClick={() => window.open(createPageUrl('DestinationEditor') + '?id=' + formData.destination_id, '_blank')} title="View destination">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              }
            </div>
            {destinations.length === 0 && <p className="text-xs text-slate-700 mt-1">No destinations found</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Area</Label>
            <Input
              id="region"
              value={(() => {
                const destination = destinations.find((d) => d.id === formData.destination_id);
                const region = destination ? regions.find((r) => r.id === destination.region_id) : null;
                return region?.name || '';
              })()}
              readOnly
              disabled
              className="bg-slate-100 text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-700">Auto-populated</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="duration_days">Duration Days *</Label>
            <Input
              id="duration_days"
              type="number"
              value={formData.duration_days}
              onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value) || 0)}
              disabled={isTranslating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="walking_days">Walking Days</Label>
            <Input
              id="walking_days"
              type="number"
              value={formData.walking_days}
              onChange={(e) => handleInputChange('walking_days', parseInt(e.target.value) || 0)}
              disabled={isTranslating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price From (€)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price_per_person_eur}
              onChange={(e) => handleInputChange('price_per_person_eur', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              disabled={isTranslating}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Walking Season</Label>
            <Badge variant="outline" className="bg-slate-100">
              <Info className="w-3 h-3 mr-1" />All Tours
            </Badge>
          </div>
          <WalkingSeasonDisplay />
        </div>
      </CardContent>
    </Card>
  );
}

function WalkingSeasonDisplay() {
  const { data: settings = [] } = useQuery({
    queryKey: ['globalSettings'],
    queryFn: async () => {
      const { data } = await supabase.from('global_settings').select('*');
      return data || [];
    }
  });

  const bestMonthsSetting = settings.find((s) => s.setting_key === 'best_months');
  const bestMonths = bestMonthsSetting?.setting_value || ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <>
      <div className="grid grid-cols-6 gap-2">
        {monthsList.map((month) => {
          const isActive = bestMonths.includes(month);
          return (
            <Button key={month} disabled className={`w-full font-semibold ${isActive ? 'bg-whi text-white' : 'bg-slate-200 text-slate-600'}`}>
              {month}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-slate-700 italic">Walking season applies to all tours. Edit in Global Settings.</p>
    </>
  );
}