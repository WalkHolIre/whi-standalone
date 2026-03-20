// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_LANGUAGES = [
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
];

// Fields to pre-populate (empty strings) on the entity when a new language is added
const DESTINATION_LANG_FIELDS = [
  'name', 'short_description', 'overview', 'description',
  'landscape_description', 'cultural_highlights', 'difficulty_overview',
  'accommodation_style', 'practical_info', 'who_is_it_for',
  'best_time_to_visit', 'meta_title', 'meta_description', 'translation_status'
];

const TOUR_LANG_FIELDS = [
  'name', 'subtitle', 'overview_', 'description_', 'short_description_',
  'highlights_', 'who_is_it_for', 'accommodation_type', 'accommodation_description',
  'meta_title', 'meta_description', 'translation_status'
];

export default function AddLanguageButton({ existingCodes = [], entityType = 'destination', entityId = null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const available = AVAILABLE_LANGUAGES.filter(l => !existingCodes.includes(l.code));

  const handleAdd = async () => {
    if (!selectedCode) {
      toast.error('Please select a language');
      return;
    }

    const lang = AVAILABLE_LANGUAGES.find(l => l.code === selectedCode);
    setSaving(true);

    try {
      // 1. Create the LanguageSite record
      const { data: created } = await supabase.from('language_sites').insert({
        language_code: lang.code,
        language_name: lang.name,
        flag_emoji: lang.flag,
        site_url: siteUrl || `https://walkingholidayireland.${lang.code}`,
        status: 'active'
      }).select().single();
      created;

      // 2. If an entity id is provided, pre-populate empty translation fields on that entity
      if (entityId) {
        const suffix = `_${lang.code}`;
        const emptyFields = {};

        if (entityType === 'destination') {
          DESTINATION_LANG_FIELDS.forEach(field => {
            const key = field === 'translation_status' ? `translation_status${suffix}` : `${field}${suffix}`;
            emptyFields[key] = field === 'translation_status' ? 'not_started' : '';
          });
          const destResponse = await supabase.from('destinations').update(emptyFields).eq('id', entityId).select().single();
          destResponse.data;
        } else if (entityType === 'tour') {
          // Tour fields use different naming conventions
          const tourFields = [
            'name', 'subtitle', 'who_is_it_for', 'accommodation_type',
            'accommodation_description', 'meta_title', 'meta_description'
          ];
          const tourArrayFields = ['overview', 'description', 'short_description', 'highlights', 'itinerary'];
          tourFields.forEach(field => {
            emptyFields[`${field}${suffix}`] = '';
          });
          tourArrayFields.forEach(field => {
            if (field === 'itinerary') {
              emptyFields[`${field}${suffix}`] = [];
            } else {
              emptyFields[`${field}${suffix}`] = '';
            }
          });
          emptyFields[`translation_status${suffix}`] = 'not_started';
          const tourResponse = await supabase.from('tours').update(emptyFields).eq('id', entityId).select().single();
          tourResponse.data;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['languageSites'] });
      toast.success(`${lang.name} added successfully`);
      setOpen(false);
      setSelectedCode('');
      setSiteUrl('');
    } catch (err) {
      toast.error('Failed to add language: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (available.length === 0) return null;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Add Language
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Language</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Language</Label>
              <Select value={selectedCode} onValueChange={setSelectedCode}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a language..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map(l => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Site URL <span className="text-slate-400 text-xs">(optional)</span></Label>
              <Input
                className="mt-1"
                placeholder="https://walkingholidayireland.de"
                value={siteUrl}
                onChange={e => setSiteUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !selectedCode}>
              {saving ? 'Adding...' : 'Add Language'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}