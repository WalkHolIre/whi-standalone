// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Images, Search, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ImageLibraryPicker({ onSelect, multiple = false, currentValue = null, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val) => {
    setInternalOpen(val);
    onOpenChange?.(val);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: async () => {
      const { data } = await supabase.from('images').select('*');
      return data || [];
    },
    enabled: open
  });

  const filteredImages = useMemo(() => {
    if (!searchTerm) return images;
    const term = searchTerm.toLowerCase();
    return images.filter(img => 
      img.title?.toLowerCase().includes(term) ||
      img.alt_text?.toLowerCase().includes(term) ||
      img.location?.toLowerCase().includes(term) ||
      img.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  }, [images, searchTerm]);

  const isImageSelected = (imageUrl) => {
    if (multiple) {
      return selectedImages.some(img => img.url === imageUrl);
    }
    return currentValue === imageUrl;
  };

  const getImageIndex = (imageUrl) => {
    return selectedImages.findIndex(img => img.url === imageUrl) + 1;
  };

  const handleImageClick = (image) => {
    if (!multiple) {
      setSelectedImages([image]);
      return;
    }

    const isSelected = selectedImages.some(img => img.url === image.url);
    if (isSelected) {
      setSelectedImages(selectedImages.filter(img => img.url !== image.url));
    } else {
      setSelectedImages([...selectedImages, image]);
    }
  };

  const handleInsert = () => {
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    const result = multiple ? selectedImages : selectedImages[0];
    onSelect(result);
    setOpen(false);
    setSelectedImages([]);
    setSearchTerm('');
  };

  const handleCancel = () => {
    setOpen(false);
    setSelectedImages([]);
    setSearchTerm('');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <Images className="w-4 h-4" />
          {multiple ? 'Add from Library' : 'Choose from Library'}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle style={{ color: '#1B4D3E' }}>
              {multiple ? 'Select Images from Library' : 'Select Image from Library'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by title, alt text, tags, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading images...</div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchTerm ? 'No images match your search' : 'No images in library yet'}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {filteredImages.map((image) => {
                    const selected = isImageSelected(image.url);
                    const index = multiple ? getImageIndex(image.url) : null;
                    
                    return (
                      <div
                        key={image.id}
                        onClick={() => handleImageClick(image)}
                        className={`relative cursor-pointer rounded-lg border-2 transition-all hover:shadow-lg ${
                          selected 
                            ? 'border-[#1B4D3E] shadow-md' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="aspect-video rounded-t-lg overflow-hidden bg-slate-100">
                          <img
                            src={image.url}
                            alt={image.alt_text || image.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium truncate" title={image.title}>
                            {image.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {image.width && image.height && `${image.width}×${image.height}`}
                            {image.file_size && ` • ${formatFileSize(image.file_size)}`}
                          </p>
                        </div>
                        {selected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" 
                               style={{ backgroundColor: '#1B4D3E' }}>
                            {multiple && index ? (
                              <span className="text-white text-xs font-bold">{index}</span>
                            ) : (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleInsert}
              disabled={selectedImages.length === 0}
              style={{ backgroundColor: '#1B4D3E' }}
              className="text-white"
            >
              Insert {multiple && selectedImages.length > 0 && `${selectedImages.length} `}
              {multiple && selectedImages.length > 1 ? 'Images' : 'Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}