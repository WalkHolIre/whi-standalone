// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import ImageLibraryPicker from '../ImageLibraryPicker';

export default function TourMedia({
  formData,
  saveMutation,
  handleInputChange,
  handleImageUpload,
  handleGalleryUpload,
  removeGalleryImage,
  isTranslating,
  onSave
}) {
  return (
    <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-slate-900">Media</CardTitle>
          <CardDescription>Hero image and gallery</CardDescription>
        </div>
        <Button onClick={onSave} disabled={saveMutation.isPending} className="text-white bg-whi hover:bg-whi-hover" size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Hero Image</Label>
          {formData.hero_image && (
            <div className="mb-2">
              <img src={formData.hero_image} alt="Hero" className="w-full h-64 object-cover rounded-lg" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleImageUpload('hero_image', e.target.files[0]);
                }
              }}
              className="flex-1"
              disabled={isTranslating}
            />
            <span className="text-slate-700 text-sm">or</span>
            <ImageLibraryPicker onSelect={(image) => handleInputChange('hero_image', image.url)} currentValue={formData.hero_image} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Gallery</Label>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {formData.gallery.map((img, idx) => (
              <div key={idx} className="relative group">
                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                <button
                  onClick={() => removeGalleryImage(idx)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isTranslating}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  handleGalleryUpload(e.target.files);
                }
              }}
              className="flex-1"
              disabled={isTranslating}
            />
            <span className="text-slate-700 text-sm">or</span>
            <ImageLibraryPicker
              multiple
              onSelect={(images) => {
                const newUrls = images.map((img) => img.url);
                handleInputChange('gallery', [...formData.gallery, ...newUrls]);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}