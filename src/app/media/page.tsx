// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, X, Copy, Trash2, Download, Settings as SettingsIcon, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ImageManager() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [detailImage, setDetailImage] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortField, setSortField] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [editedImages, setEditedImages] = useState({});
  const [convertingIds, setConvertingIds] = useState([]);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [fixingMetadata, setFixingMetadata] = useState(false);
  const [reoptimizingAll, setReoptimizingAll] = useState(false);
  const [tagInput, setTagInput] = useState({});
  const [fixingFormats, setFixingFormats] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [settings, setSettings] = useState({
    maxWidth: 1920,
    maxHeight: 1440,
    webpQuality: 0.82,
    jpegQuality: 0.85,
    stripExif: true,
    autoWebp: true
  });

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: async () => {
      const { data, error } = await supabase.from('images').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.from('images').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Image uploaded');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: result, error } = await supabase.from('images').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Image updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('images').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      toast.success('Image deleted');
    }
  });

  const optimizeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const originalWidth = img.width;
            const originalHeight = img.height;
            const originalSize = file.size;
            const originalFormat = file.type.split('/')[1];

            let width = originalWidth;
            let height = originalHeight;

            if (width > settings.maxWidth || height > settings.maxHeight) {
              const ratio = Math.min(settings.maxWidth / width, settings.maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const outputFormat = settings.autoWebp ? 'image/webp' : 'image/jpeg';
            const quality = settings.autoWebp ? settings.webpQuality : settings.jpegQuality;

            canvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Failed to optimize image'));
                return;
              }

              const optimizedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, settings.autoWebp ? '.webp' : '.jpg'),
                { type: outputFormat }
              );

              const compressionSavings = (originalSize - blob.size) / originalSize * 100;

              resolve({
                file: optimizedFile,
                metadata: {
                  original_width: originalWidth,
                  original_height: originalHeight,
                  original_file_size: originalSize,
                  original_format: originalFormat,
                  width,
                  height,
                  file_size: blob.size,
                  format: settings.autoWebp ? 'webp' : 'jpeg',
                  compression_savings: Math.round(compressionSavings),
                  optimised: true
                }
              });
            }, outputFormat, quality);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (files) => {
    const fileList = Array.from(files);
    setUploading(true);

    const progress = fileList.map((f) => ({
      name: f.name,
      status: 'uploading',
      originalSize: f.size,
      optimizedSize: null
    }));
    setUploadProgress(progress);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let step = 'starting';

      try {
        console.log(`[Upload] Starting: ${file.name} (${file.size} bytes, type: ${file.type})`);

        // Step 1: Optimise
        step = 'optimising';
        setUploadProgress((prev) => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'optimising' } : p
        ));

        let optimizedFile = null;
        let metadata = {};
        try {
          const result = await optimizeImage(file);
          optimizedFile = result.file;
          metadata = result.metadata;
          console.log(`[Upload] Optimised: ${file.name} → ${metadata.file_size} bytes (${metadata.format})`);
        } catch (optimizeError) {
          console.warn('[Upload] Optimization failed, using original:', optimizeError);
          metadata = {
            original_width: 0,
            original_height: 0,
            original_file_size: file.size,
            original_format: file.type.split('/')[1] || 'unknown',
            width: 0,
            height: 0,
            file_size: file.size,
            format: file.type.split('/')[1] || 'unknown',
            compression_savings: 0,
            optimised: false
          };
        }

        setUploadProgress((prev) => prev.map((p, idx) =>
          idx === i ? { ...p, optimizedSize: metadata.file_size } : p
        ));

        // Step 2: Upload original to storage
        step = 'uploading original to storage';
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileNameOriginal = `${Date.now()}-${safeName}`;
        console.log(`[Upload] Uploading original to storage: ${fileNameOriginal}`);
        const { data: dataOriginal, error: errorOriginal } = await supabase.storage
          .from('images')
          .upload(fileNameOriginal, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });
        if (errorOriginal) {
          console.error('[Upload] Storage original error:', JSON.stringify(errorOriginal));
          throw new Error(`Storage upload failed: ${errorOriginal.message || errorOriginal.error || JSON.stringify(errorOriginal)}`);
        }
        console.log(`[Upload] Original uploaded OK: ${fileNameOriginal}`);
        const { data: { publicUrl: originalUrl } } = supabase.storage.from('images').getPublicUrl(fileNameOriginal);

        // Step 3: Upload optimised version to storage
        let optimizedUrl = originalUrl;
        if (optimizedFile) {
          step = 'uploading optimised to storage';
          const safeOptName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileNameOptimized = `${Date.now()}-optimized-${safeOptName}`;
          console.log(`[Upload] Uploading optimised to storage: ${fileNameOptimized}`);
          const { data: dataOptimized, error: errorOptimized } = await supabase.storage
            .from('images')
            .upload(fileNameOptimized, optimizedFile, {
              contentType: optimizedFile.type,
              cacheControl: '3600',
              upsert: false
            });
          if (errorOptimized) {
            console.error('[Upload] Storage optimised error:', JSON.stringify(errorOptimized));
            throw new Error(`Optimised storage upload failed: ${errorOptimized.message || errorOptimized.error || JSON.stringify(errorOptimized)}`);
          }
          console.log(`[Upload] Optimised uploaded OK: ${fileNameOptimized}`);
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileNameOptimized);
          optimizedUrl = publicUrl;
        }

        // Step 4: Save record to images table
        step = 'saving to database';
        const title = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        const dbRecord = {
          url: optimizedUrl,
          original_url: originalUrl,
          title,
          alt_text: title,
          tags: [],
          location: '',
          ...metadata
        };
        console.log(`[Upload] Saving to DB:`, JSON.stringify(dbRecord));
        await createMutation.mutateAsync(dbRecord);
        console.log(`[Upload] Done: ${file.name}`);

        setUploadProgress((prev) => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'done' } : p
        ));
      } catch (error) {
        console.error(`[Upload] FAILED at step "${step}":`, error);
        const errMsg = error instanceof Error ? error.message : (error?.message || error?.statusCode || JSON.stringify(error));
        const fullError = `Failed at "${step}": ${errMsg}`;
        setUploadProgress((prev) => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error', errorDetail: fullError } : p
        ));
        toast.error(`Failed to upload ${file.name}: ${fullError}`, { duration: 30000 });
      }
    }

    setTimeout(() => {
      setUploading(false);
      // Don't clear progress if there were errors — keep them visible
      setUploadProgress((prev) => {
        const hasErrors = prev.some((p) => p.status === 'error');
        return hasErrors ? prev : [];
      });
    }, 2000);
  };

  const handleInlineEdit = (id, field, value) => {
    setEditedImages((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSaveChanges = async () => {
    const updates = Object.entries(editedImages);
    if (updates.length === 0) {
      toast.info('No changes to save');
      return;
    }

    try {
      await Promise.all(
        updates.map(([id, data]) =>
          updateMutation.mutateAsync({ id, data })
        )
      );
      setEditedImages({});
      toast.success(`Saved changes to ${updates.length} image(s)`);
    } catch (error) {
      toast.error('Failed to save changes');
    }
  };

  const handleSaveDetailImage = async (imageId) => {
    const changes = editedImages[imageId];
    if (!changes || Object.keys(changes).length === 0) {
      toast.info('No changes to save');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: imageId, data: changes });
      setEditedImages((prev) => {
        const next = { ...prev };
        delete next[imageId];
        return next;
      });
      toast.success('Image saved');
    } catch (error) {
      toast.error('Failed to save image');
    }
  };

  const handleConvertToWebp = async (image) => {
    setConvertingIds((prev) => [...prev, image.id]);

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], image.title + '.webp', { type: 'image/webp' });

      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const webpBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/webp', settings.webpQuality);
      });

      const webpFile = new File([webpBlob], image.title + '.webp', { type: 'image/webp' });
      const webpFileName = `${Date.now()}-${webpFile.name}`;
      const { data: webpData, error: webpError } = await supabase.storage.from('images').upload(webpFileName, webpFile);
      if (webpError) throw webpError;
      const { data: { publicUrl: file_url } } = supabase.storage.from('images').getPublicUrl(webpFileName);

      await updateMutation.mutateAsync({
        id: image.id,
        data: {
          url: file_url,
          format: 'webp',
          file_size: webpBlob.size
        }
      });

      toast.success('Converted to WebP');
    } catch (error) {
      toast.error('Failed to convert image');
    } finally {
      setConvertingIds((prev) => prev.filter((id) => id !== image.id));
    }
  };

  const handleReOptimizeImage = async (image) => {
    setConvertingIds((prev) => [...prev, image.id]);

    try {
      const response = await fetch(image.original_url || image.url);
      const blob = await response.blob();
      const file = new File([blob], image.title, { type: blob.type });

      const { file: optimizedFile, metadata } = await optimizeImage(file);
      const optimFileName = `${Date.now()}-${optimizedFile.name}`;
      const { data: optimData, error: optimError } = await supabase.storage.from('images').upload(optimFileName, optimizedFile);
      if (optimError) throw optimError;
      const { data: { publicUrl: file_url } } = supabase.storage.from('images').getPublicUrl(optimFileName);

      await updateMutation.mutateAsync({
        id: image.id,
        data: {
          url: file_url,
          ...metadata
        }
      });

      toast.success('Image re-optimized successfully');
    } catch (error) {
      toast.error('Failed to re-optimize image');
    } finally {
      setConvertingIds((prev) => prev.filter((id) => id !== image.id));
    }
  };

  const handleGenerateSeoForAll = async () => {
    setGeneratingSeo(true);

    try {
      const imagesToProcess = filteredAndSortedImages.filter((img) =>
        !img.alt_text || !img.location || !img.tags?.length
      );

      if (imagesToProcess.length === 0) {
        toast.info('All images already have SEO data');
        return;
      }

      for (const img of imagesToProcess) {
        // TODO: Migrate to Supabase Edge Function for LLM invocation
        console.warn('TODO: Migrate base44.integrations.Core.InvokeLLM to Supabase Edge Function');
        // const response = await supabase.functions.invoke('generateImageSeo', {
        //   body: {
        //     imageTitle: img.title,
        //     prompt: `Generate SEO-optimized metadata for an image titled "${img.title}". Return JSON with: alt_text (descriptive alt text for accessibility, max 125 chars), location (if the title suggests a location in Ireland, otherwise empty string), and tags (array of 3-5 relevant SEO keywords).`
        //   }
        // });

        // await updateMutation.mutateAsync({
        //   id: img.id,
        //   data: {
        //     alt_text: response.alt_text,
        //     location: response.location,
        //     tags: response.tags
        //   }
        // });
      }

      toast.success(`Generated SEO data for ${imagesToProcess.length} images`);
    } catch (error) {
      toast.error('Failed to generate SEO data');
    } finally {
      setGeneratingSeo(false);
    }
  };

  const handleFixUnknownFormats = async () => {
    setFixingFormats(true);

    try {
      const imagesToFix = images.filter((img) => !img.format || img.format === 'UNKNOWN' || img.format?.toLowerCase() === 'unknown');

      if (imagesToFix.length === 0) {
        toast.info('No images with unknown format');
        return;
      }

      let successCount = 0;
      for (const img of imagesToFix) {
        try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          const format = blob.type.split('/')[1] || img.url.split('.').pop().toLowerCase();

          await updateMutation.mutateAsync({
            id: img.id,
            data: { format }
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to fix format for ${img.title}:`, error);
        }
      }

      toast.success(`Fixed format for ${successCount} image(s)`);
    } catch (error) {
      toast.error('Failed to fix formats');
    } finally {
      setFixingFormats(false);
    }
  };

  const handleFixMetadata = async () => {
    setFixingMetadata(true);

    try {
      const imagesToFix = images.filter((img) =>
        !img.file_size || !img.width || !img.height || !img.format ||
        !img.original_file_size || !img.original_width || !img.original_height || !img.original_format
      );

      if (imagesToFix.length === 0) {
        toast.info('All images have complete metadata');
        return;
      }

      toast.info(`Fixing metadata for ${imagesToFix.length} images...`);

      for (const img of imagesToFix) {
        try {
          const updateData = {};

          if (!img.file_size || !img.width || !img.height || !img.format) {
            const response = await fetch(img.url);
            const blob = await response.blob();

            const imageEl = new Image();
            imageEl.src = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
              imageEl.onload = resolve;
              imageEl.onerror = reject;
            });

            const format = blob.type.split('/')[1] || img.url.split('.').pop().toLowerCase();

            updateData.file_size = blob.size;
            updateData.width = imageEl.width;
            updateData.height = imageEl.height;
            updateData.format = format;

            URL.revokeObjectURL(imageEl.src);
          }

          if (!img.original_file_size || !img.original_width || !img.original_height || !img.original_format) {
            const originalUrl = img.original_url || img.url;
            const response = await fetch(originalUrl);
            const blob = await response.blob();

            const imageEl = new Image();
            imageEl.src = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
              imageEl.onload = resolve;
              imageEl.onerror = reject;
            });

            const format = blob.type.split('/')[1] || originalUrl.split('.').pop().toLowerCase();

            updateData.original_file_size = blob.size;
            updateData.original_width = imageEl.width;
            updateData.original_height = imageEl.height;
            updateData.original_format = format;

            URL.revokeObjectURL(imageEl.src);
          }

          await updateMutation.mutateAsync({
            id: img.id,
            data: updateData
          });
        } catch (error) {
          console.error(`Failed to fix metadata for ${img.title}:`, error);
        }
      }

      toast.success(`Fixed metadata for ${imagesToFix.length} images`);
    } catch (error) {
      toast.error('Failed to fix metadata');
    } finally {
      setFixingMetadata(false);
    }
  };

  const handleReOptimizeAll = async () => {
    setReoptimizingAll(true);

    try {
      if (images.length === 0) {
        toast.info('No images to re-optimize');
        return;
      }

      toast.info(`Re-optimizing ${images.length} images...`);
      let successCount = 0;

      for (const img of images) {
        try {
          const response = await fetch(img.original_url || img.url);
          const blob = await response.blob();
          const file = new File([blob], img.title, { type: blob.type });

          const { file: optimizedFile, metadata } = await optimizeImage(file);
          const reoptimFileName = `${Date.now()}-reoptim-${Math.random()}-${optimizedFile.name}`;
          const { data: reoptimData, error: reoptimError } = await supabase.storage.from('images').upload(reoptimFileName, optimizedFile);
          if (reoptimError) throw reoptimError;
          const { data: { publicUrl: file_url } } = supabase.storage.from('images').getPublicUrl(reoptimFileName);

          await updateMutation.mutateAsync({
            id: img.id,
            data: {
              url: file_url,
              ...metadata
            }
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to re-optimize ${img.title}:`, error);
        }
      }

      toast.success(`Re-optimized ${successCount} image(s)`);
    } catch (error) {
      toast.error('Failed to re-optimize images');
    } finally {
      setReoptimizingAll(false);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) {
      toast.error('No URL available to copy');
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      toast.success('URL copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  // Fix: use editedImages tags first, then fall back to image's own tags
  const handleDeleteTag = (imageId, tagIndex) => {
    const img = images.find((i) => i.id === imageId) || detailImage;
    const currentTags = editedImages[imageId]?.tags ?? img?.tags ?? [];
    const newTags = currentTags.filter((_, idx) => idx !== tagIndex);
    handleInlineEdit(imageId, 'tags', newTags);
  };

  const handleAddTag = (imageId) => {
    const input = tagInput[imageId]?.trim();
    if (!input) return;

    const img = images.find((i) => i.id === imageId) || detailImage;
    const currentTags = editedImages[imageId]?.tags ?? img?.tags ?? [];

    if (!currentTags.includes(input)) {
      handleInlineEdit(imageId, 'tags', [...currentTags, input]);
      setTagInput((prev) => ({ ...prev, [imageId]: '' }));
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this image?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.length} image(s)?`)) {
      Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id))).
        then(() => setSelectedIds([]));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === null || bytes === undefined) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredAndSortedImages = useMemo(() => {
    let filtered = images.filter((img) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        img.title?.toLowerCase().includes(searchLower) ||
        img.alt_text?.toLowerCase().includes(searchLower) ||
        img.location?.toLowerCase().includes(searchLower) ||
        img.tags?.some((tag) => tag.toLowerCase().includes(searchLower)));

    });

    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (sortField === 'created_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [images, searchTerm, sortField, sortDirection]);

  const totalSize = images.reduce((sum, img) => sum + (img.file_size || 0), 0);
  const totalOriginalSize = images.reduce((sum, img) => sum + (img.original_file_size || 0), 0);
  const avgSavings = totalOriginalSize > 0 ?
    Math.round((totalOriginalSize - totalSize) / totalOriginalSize * 100) :
    0;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Image Manager
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Upload, optimize, and organize media assets</p>
          </div>
        </div>

        {/* Upload, Settings & SEO in one row */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Upload Area - 40% */}
          <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden col-span-1 lg:col-span-4">
            <CardContent className="pt-6">
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDraggingOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'}`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                  if (!uploading && e.dataTransfer.files?.length) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}>

                <div className="text-center pointer-events-none">
                  <Upload className={`w-10 h-10 mx-auto mb-2 ${isDraggingOver ? 'text-blue-400' : 'text-slate-400'}`} />
                  <p className="text-sm font-medium text-slate-700">
                    {uploading ? 'Processing...' : isDraggingOver ? 'Drop images here' : 'Drag & drop images'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-optimised on upload
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={uploading} />

              </label>

              {uploadProgress.length > 0 &&
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {uploadProgress.map((prog, idx) =>
                    <div key={idx} className="p-2 bg-slate-50 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 truncate flex-1">{prog.name}</span>
                        <Badge className={
                          prog.status === 'done' ? 'bg-green-100 text-green-800' :
                            prog.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                        }>
                          {prog.status === 'uploading' && 'Uploading'}
                          {prog.status === 'optimising' && 'Optimising'}
                          {prog.status === 'done' && '✓'}
                          {prog.status === 'error' && 'Error'}
                        </Badge>
                      </div>
                      {prog.status === 'error' && prog.errorDetail &&
                        <p className="mt-1 text-red-600 text-xs break-all font-mono bg-red-50 p-2 rounded">{prog.errorDetail}</p>
                      }
                    </div>
                  )}
                </div>
              }
            </CardContent>
          </Card>

          {/* Optimisation Settings - 40% */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="col-span-1 lg:col-span-4 h-full">
            <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden h-full">
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                    <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                      <SettingsIcon className="w-4 h-4" />
                      Optimisation Settings
                    </CardTitle>
                    <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-2 gap-3 pt-0">
                  <div>
                    <Label className="text-xs">Max Width (px)</Label>
                    <Input
                      type="number"
                      value={settings.maxWidth}
                      onChange={(e) => setSettings({ ...settings, maxWidth: parseInt(e.target.value) })}
                      className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Max Height (px)</Label>
                    <Input
                      type="number"
                      value={settings.maxHeight}
                      onChange={(e) => setSettings({ ...settings, maxHeight: parseInt(e.target.value) })}
                      className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">WebP Quality ({Math.round(settings.webpQuality * 100)}%)</Label>
                    <Input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.01"
                      value={settings.webpQuality}
                      onChange={(e) => setSettings({ ...settings, webpQuality: parseFloat(e.target.value) })}
                      className="h-6" />
                  </div>
                  <div>
                    <Label className="text-xs">JPEG Quality ({Math.round(settings.jpegQuality * 100)}%)</Label>
                    <Input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.01"
                      value={settings.jpegQuality}
                      onChange={(e) => setSettings({ ...settings, jpegQuality: parseFloat(e.target.value) })}
                      className="h-6" />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* SEO Generation - 20% */}
          <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden col-span-1 lg:col-span-2 flex flex-col justify-center">
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full gap-2">
              <Button
                onClick={handleGenerateSeoForAll}
                disabled={generatingSeo}
                className="w-full text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9">
                {generatingSeo ? 'Generating...' : 'Generate SEO'}
              </Button>
              <Button
                onClick={handleReOptimizeAll}
                disabled={reoptimizingAll}
                variant="outline"
                className="w-full text-xs font-semibold rounded-xl h-9">
                {reoptimizingAll ? 'Re-optimizing...' : 'Re-optimize All'}
              </Button>
              <Button
                onClick={handleFixUnknownFormats}
                disabled={fixingFormats}
                variant="outline"
                className="w-full text-xs font-semibold rounded-xl h-9">
                {fixingFormats ? 'Fixing...' : 'Fix Format'}
              </Button>
              <Button
                onClick={handleFixMetadata}
                disabled={fixingMetadata}
                variant="outline"
                className="w-full text-xs font-semibold rounded-xl h-9">
                {fixingMetadata ? 'Fixing...' : 'Fix Missing Data'}
              </Button>
              <div className="w-full pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-600 font-medium">Overall Savings</p>
                <p className="text-sm font-bold text-green-600">
                  {formatFileSize(totalOriginalSize - totalSize)} ({avgSavings}%)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Bulk Actions */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search by title, alt text, location, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-slate-50/50 rounded-xl shadow-sm border-slate-200 h-11 focus:bg-white focus:ring-indigo-500/20 transition-colors" />

              {Object.keys(editedImages).length > 0 &&
                <Button
                  onClick={handleSaveChanges}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-10 shadow-sm px-6">
                  Save Changes ({Object.keys(editedImages).length})
                </Button>
              }
              {selectedIds.length > 0 &&
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="rounded-xl font-semibold h-10 shadow-sm px-6 bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedIds.length})
                </Button>
              }
            </div>
          </CardContent>
        </Card>

        {/* Image Library Table */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 px-4 py-3 font-medium text-slate-500">
                      <Checkbox
                        checked={selectedIds.length === filteredAndSortedImages.length && filteredAndSortedImages.length > 0}
                        onCheckedChange={(checked) => {
                          setSelectedIds(checked ? filteredAndSortedImages.map((img) => img.id) : []);
                        }} />
                    </TableHead>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleSort('title')}>
                      Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Alt Text</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleSort('file_size')}>
                      Size {sortField === 'file_size' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleSort('format')}>
                      Format {sortField === 'format' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ?
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        Loading images...
                      </TableCell>
                    </TableRow> :
                    filteredAndSortedImages.length === 0 ?
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                          No images found
                        </TableCell>
                      </TableRow> :
                      filteredAndSortedImages.map((img) =>
                        <TableRow key={img.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(img.id)}
                              onCheckedChange={(checked) => {
                                setSelectedIds(checked ?
                                  [...selectedIds, img.id] :
                                  selectedIds.filter((id) => id !== img.id)
                                );
                              }} />
                          </TableCell>
                          <TableCell>
                            <img
                              src={img.url}
                              alt={img.alt_text || img.title}
                              className="w-14 h-14 object-cover rounded cursor-pointer"
                              onClick={() => setDetailImage(img)} />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editedImages[img.id]?.title ?? img.title}
                              onChange={(e) => handleInlineEdit(img.id, 'title', e.target.value)}
                              className="min-w-[200px] rounded-lg border-slate-200 shadow-sm" />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editedImages[img.id]?.alt_text ?? img.alt_text ?? ''}
                              onChange={(e) => handleInlineEdit(img.id, 'alt_text', e.target.value)}
                              className="min-w-[200px] rounded-lg border-slate-200 shadow-sm" />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editedImages[img.id]?.location ?? img.location ?? ''}
                              onChange={(e) => handleInlineEdit(img.id, 'location', e.target.value)}
                              className="min-w-[150px] rounded-lg border-slate-200 shadow-sm" />
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {img.width && img.height ? `${img.width}×${img.height}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600">{formatFileSize(img.file_size)}</span>
                              {img.original_file_size && img.file_size &&
                                <Badge className="bg-green-100 text-green-800">
                                  ↓{Math.round((img.original_file_size - img.file_size) / img.original_file_size * 100)}%
                                </Badge>
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge className={img.format === 'webp' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {img.format?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                              {img.format !== 'webp' &&
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConvertToWebp(img)}
                                  disabled={convertingIds.includes(img.id)}
                                  className="text-xs">
                                  {convertingIds.includes(img.id) ? 'Converting...' : 'Convert'}
                                </Button>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyUrl(img.url)}
                                title="Copy URL">
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(img.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={!!detailImage} onOpenChange={() => setDetailImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex items-center justify-between">
              <DialogTitle>Image Details</DialogTitle>
              {detailImage &&
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIdx = filteredAndSortedImages.findIndex((img) => img.id === detailImage.id);
                      if (currentIdx > 0) {
                        setDetailImage(filteredAndSortedImages[currentIdx - 1]);
                      }
                    }}
                    disabled={filteredAndSortedImages.findIndex((img) => img.id === detailImage.id) === 0}>
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIdx = filteredAndSortedImages.findIndex((img) => img.id === detailImage.id);
                      if (currentIdx < filteredAndSortedImages.length - 1) {
                        setDetailImage(filteredAndSortedImages[currentIdx + 1]);
                      }
                    }}
                    disabled={filteredAndSortedImages.findIndex((img) => img.id === detailImage.id) === filteredAndSortedImages.length - 1}>
                    Next →
                  </Button>
                </div>
              }
            </DialogHeader>
            {detailImage &&
              <div className="space-y-6">
                <img
                  src={detailImage.url}
                  alt={detailImage.alt_text || detailImage.title}
                  className="w-full rounded-lg" />

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Original</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Format:</strong> {detailImage.original_format?.toUpperCase()}</p>
                      <p><strong>Dimensions:</strong> {detailImage.original_width}×{detailImage.original_height}</p>
                      <p><strong>File Size:</strong> {formatFileSize(detailImage.original_file_size)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(detailImage.original_url, '_blank')}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Original
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Optimised</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Format:</strong> {detailImage.format?.toUpperCase()}</p>
                      <p><strong>Dimensions:</strong> {detailImage.width}×{detailImage.height}</p>
                      <p><strong>File Size:</strong> {formatFileSize(detailImage.file_size)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(detailImage.url, '_blank')}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Optimised
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    {(() => {
                      const saved = (detailImage.original_file_size || 0) - (detailImage.file_size || 0);
                      const savingsPercent = detailImage.original_file_size > 0 ?
                        Math.round(saved / detailImage.original_file_size * 100) :
                        0;
                      const savedKB = (saved / 1024).toFixed(1);
                      return (
                        <p className="text-sm font-semibold text-green-900">
                          Space Saved: {savedKB} KB ({savingsPercent}%)
                        </p>);
                    })()}
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <Input
                        value={editedImages[detailImage.id]?.title ?? detailImage.title}
                        onChange={(e) => handleInlineEdit(detailImage.id, 'title', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Alt Text</Label>
                      <Input
                        value={editedImages[detailImage.id]?.alt_text ?? detailImage.alt_text ?? ''}
                        onChange={(e) => handleInlineEdit(detailImage.id, 'alt_text', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <Input
                        value={editedImages[detailImage.id]?.location ?? detailImage.location ?? ''}
                        onChange={(e) => handleInlineEdit(detailImage.id, 'location', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Tags</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editedImages[detailImage.id]?.tags ?? detailImage.tags ?? []).map((tag, idx) =>
                        <Badge key={idx} variant="outline" className="text-xs group hover:bg-red-50 cursor-default">
                          <span>{tag}</span>
                          <button
                            onClick={() => handleDeleteTag(detailImage.id, idx)}
                            className="ml-1 text-red-600 hover:text-red-700">
                            ×
                          </button>
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={tagInput[detailImage.id] ?? ''}
                        onChange={(e) => setTagInput((prev) => ({ ...prev, [detailImage.id]: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag(detailImage.id)}
                        placeholder="Add tag..."
                        className="h-8 text-xs" />
                      <Button
                        onClick={() => handleAddTag(detailImage.id)}
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs">
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Save + URL actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveDetailImage(detailImage.id)}
                      disabled={!editedImages[detailImage.id] || Object.keys(editedImages[detailImage.id]).length === 0}
                      className="flex-1 bg-green-600 hover:bg-green-700">
                      Save Changes
                    </Button>
                    <Button onClick={() => handleCopyUrl(detailImage.url)} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Optimised URL
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleCopyUrl(detailImage.original_url)}
                      disabled={!detailImage.original_url}
                      className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Original URL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReOptimizeImage(detailImage)}
                      disabled={convertingIds.includes(detailImage.id)}
                      className="flex-1">
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      {convertingIds.includes(detailImage.id) ? 'Re-optimizing...' : 'Re-optimize'}
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`/admin/databases/Image/${detailImage.id}`, '_blank')} className="flex-1">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      View in DB
                    </Button>
                  </div>
                </div>
              </div>
            }
          </DialogContent>
        </Dialog>
      </div>
    </div>);
}