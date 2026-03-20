// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import ImageLibraryPicker from '../ImageLibraryPicker';
import WHIRichEditor from '../WHIRichEditor';
import { getFieldKey, getRichTextField } from '../LanguageAwareInput';

export default function TourAccommodation({
  formData,
  selectedLanguage,
  saveMutation,
  handleInputChange,
  handleImageUpload,
  isTranslating,
  onSave
}) {
  return (
    <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-slate-900">Accommodation Details</CardTitle>
          <CardDescription>Accommodation information</CardDescription>
        </div>
        <Button onClick={onSave} disabled={saveMutation.isPending} className="text-white bg-whi hover:bg-whi-hover" size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="accommodation_type">Accommodation Type</Label>
          <Select
            value={getRichTextField(formData, 'accommodation_type', selectedLanguage)}
            onValueChange={(value) => handleInputChange(getFieldKey('accommodation_type', selectedLanguage), value)}
            disabled={isTranslating}
          >
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="guesthouse">Guesthouse</SelectItem>
              <SelectItem value="b_and_b">B&B</SelectItem>
              <SelectItem value="hostel">Hostel</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Accommodation Image</Label>
          {formData.accommodation_image && (
            <div className="mb-2">
              <img src={formData.accommodation_image} alt="Accommodation" className="w-48 h-32 object-cover rounded-lg" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleImageUpload('accommodation_image', e.target.files[0]);
                }
              }}
              className="flex-1"
              disabled={isTranslating}
            />
            <span className="text-slate-700 text-sm">or</span>
            <ImageLibraryPicker onSelect={(image) => handleInputChange('accommodation_image', image.url)} currentValue={formData.accommodation_image} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accommodation_description">Accommodation Description</Label>
          <WHIRichEditor
            value={getRichTextField(formData, 'accommodation_description', selectedLanguage)}
            onChange={(html) => handleInputChange(getFieldKey('accommodation_description', selectedLanguage), html)}
            minHeight="200px"
            disabled={isTranslating}
          />
        </div>
      </CardContent>
    </Card>
  );
}