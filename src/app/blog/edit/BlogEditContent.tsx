// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, ExternalLink, Copy, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { format } from 'date-fns';

export default function BlogPostEditor() {
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  const postId = paramsId;
  const isEditing = !!postId;

  const [post, setPost] = useState({
    title: '',
    slug: '',
    language: 'en',
    status: 'draft',
    category: 'Walking Routes',
    tags: [],
    author: 'Cliff',
    published_date: new Date().toISOString().split('T')[0],
    read_time: 5,
    featured: false,
    wp_url: '',
    wp_post_id: null,
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    seo_keywords: [],
    related_tour_id: '',
    related_destination_id: '',
    language_group_id: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: existingPost, isLoading } = useQuery({
    queryKey: ['blogPost', postId],
    queryFn: async () => {
      const { data } = await supabase.from('posts').select('*').match({ id: postId });
      const posts = data || [];
      return posts[0] || null;
    },
    enabled: isEditing
  });

  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async () => {
      const { data } = await supabase.from('posts').select('*');
      return data || [];
    }
  });

  useEffect(() => {
    if (existingPost) {
      setPost({
        title: existingPost.title || '',
        slug: existingPost.slug || '',
        language: existingPost.language || 'en',
        status: existingPost.status || 'draft',
        category: existingPost.category || 'Walking Routes',
        tags: Array.isArray(existingPost.tags) ? existingPost.tags : [],
        author: existingPost.author || 'Cliff',
        published_date: existingPost.published_date || new Date().toISOString().split('T')[0],
        read_time: existingPost.read_time || 5,
        featured: existingPost.featured || false,
        wp_url: existingPost.wp_url || '',
        wp_post_id: existingPost.wp_post_id || null,
        meta_title: existingPost.meta_title || '',
        meta_description: existingPost.meta_description || '',
        focus_keyword: existingPost.focus_keyword || '',
        seo_keywords: Array.isArray(existingPost.seo_keywords) ? existingPost.seo_keywords : [],
        related_tour_id: existingPost.related_tour_id || '',
        related_destination_id: existingPost.related_destination_id || '',
        language_group_id: existingPost.language_group_id || ''
      });
      setAutoSlug(false);
    }
  }, [existingPost]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        const { data: result } = await supabase.from('posts').update(data).eq('id', postId).select().single();
        return result;
      }
      const { data: result } = await supabase.from('posts').insert(data).select().single();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      toast.success(isEditing ? 'Post updated' : 'Post created');
      if (!isEditing) {
        setTimeout(() => {
          window.location.href = createPageUrl('BlogPostAdmin');
        }, 500);
      }
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return await supabase.from('posts').delete().eq('id', postId);
    },
    onSuccess: () => {
      toast.success('Post deleted');
      setTimeout(() => {
        window.location.href = createPageUrl('BlogPostAdmin');
      }, 500);
    }
  });

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (value) => {
    setPost(prev => ({ ...prev, title: value }));
    if (autoSlug) {
      setPost(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleSlugChange = (value) => {
    setAutoSlug(false);
    setPost(prev => ({ ...prev, slug: generateSlug(value) }));
  };

  const handleSave = () => {
    saveMutation.mutate(post);
  };

  const copySlug = () => {
    navigator.clipboard.writeText(post.slug);
    toast.success('Slug copied');
  };

  const getLanguageFlag = (lang) => {
    const flags = { 'en': '🇬🇧', 'nl': '🇳🇱', 'de': '🇩🇪' };
    return flags[lang] || '🌐';
  };

  const siblingPosts = post.language_group_id
    ? allPosts.filter(p => p.language_group_id === post.language_group_id && p.id !== postId)
    : [];

  const metaTitleLength = post.meta_title?.length || 0;
  const metaDescLength = post.meta_description?.length || 0;

  const getCharCountColor = (length, max) => {
    if (length > max) return 'text-red-600';
    if (length > max * 0.9) return 'text-amber-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center bg-slate-50/50">
        <p className="text-slate-600">Loading post...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={createPageUrl('BlogPostAdmin')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-whi-dark">
              {isEditing ? 'Edit Post' : 'New Post'}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-[65%_35%] gap-6">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Article Identity */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">Article Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={post.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter post title"
                    className="text-base"
                  />
                </div>

                <div>
                  <Label>Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      value={post.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="auto-generated-from-title"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copySlug}
                      disabled={!post.slug}
                      title="Copy slug"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    URL: /blog/{post.slug || 'your-post-slug'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Language *</Label>
                    <Select value={post.language} onValueChange={(v) => setPost(prev => ({ ...prev, language: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                        <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
                        <SelectItem value="de">🇩🇪 German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={post.status} onValueChange={(v) => setPost(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="needs_translation">Needs Translation</SelectItem>
                        <SelectItem value="needs_update">Needs Update</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={post.category} onValueChange={(v) => setPost(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Walking Routes">Walking Routes</SelectItem>
                      <SelectItem value="Planning & Tips">Planning & Tips</SelectItem>
                      <SelectItem value="Destinations">Destinations</SelectItem>
                      <SelectItem value="Seasonal">Seasonal</SelectItem>
                      <SelectItem value="Travel Info">Travel Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim() && !post.tags.includes(tagInput.trim())) {
                            setPost(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
                            setTagInput('');
                          }
                        }
                      }}
                      placeholder="Add tag and press Enter"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <Badge
                        key={tag}
                        className="bg-whi-mauve-subtle text-whi-mauve cursor-pointer"
                        onClick={() => setPost(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                      >
                        {tag} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO Metadata */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">SEO Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Focus Keyword</Label>
                  <Input
                    value={post.focus_keyword}
                    onChange={(e) => setPost(prev => ({ ...prev, focus_keyword: e.target.value }))}
                    placeholder="e.g., wicklow way guide"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Appears in title, intro, and at least one H2
                  </p>
                </div>

                <div>
                  <Label>Meta Title</Label>
                  <Input
                    value={post.meta_title}
                    onChange={(e) => setPost(prev => ({ ...prev, meta_title: e.target.value }))}
                    placeholder={post.title || 'Defaults to post title'}
                    maxLength={60}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden mr-2">
                      <div
                        className={`h-full transition-all ${metaTitleLength > 60 ? 'bg-red-500' :
                          metaTitleLength > 55 ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                        style={{ width: `${Math.min((metaTitleLength / 60) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getCharCountColor(metaTitleLength, 60)}`}>
                      {metaTitleLength}/60
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    value={post.meta_description}
                    onChange={(e) => setPost(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="Brief description for search results"
                    rows={3}
                    maxLength={160}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden mr-2">
                      <div
                        className={`h-full transition-all ${metaDescLength > 160 ? 'bg-red-500' :
                          metaDescLength > 145 ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                        style={{ width: `${Math.min((metaDescLength / 160) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getCharCountColor(metaDescLength, 160)}`}>
                      {metaDescLength}/160
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Secondary Keywords</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const keywords = Array.isArray(post.seo_keywords) ? post.seo_keywords : [];
                          if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
                            setPost(prev => ({ ...prev, seo_keywords: [...keywords, keywordInput.trim()] }));
                            setKeywordInput('');
                          }
                        }
                      }}
                      placeholder="Add keyword and press Enter"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(post.seo_keywords) ? post.seo_keywords : []).map(kw => (
                      <Badge
                        key={kw}
                        className="bg-whi-subtle text-whi cursor-pointer"
                        onClick={() => setPost(prev => ({
                          ...prev,
                          seo_keywords: (Array.isArray(prev.seo_keywords) ? prev.seo_keywords : []).filter(k => k !== kw)
                        }))}
                      >
                        {kw} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WordPress Link */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">WordPress Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>WP URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={post.wp_url}
                      onChange={(e) => setPost(prev => ({ ...prev, wp_url: e.target.value }))}
                      placeholder="https://walkingholidayireland.com/..."
                      className="flex-1"
                    />
                    {post.wp_url && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(post.wp_url, '_blank')}
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste the published URL once the article is live in WordPress
                  </p>
                </div>

                <div>
                  <Label>WordPress Post ID</Label>
                  <Input
                    type="number"
                    value={post.wp_post_id || ''}
                    onChange={(e) => setPost(prev => ({ ...prev, wp_post_id: parseInt(e.target.value) || null }))}
                    placeholder="e.g., 12345"
                    className="w-32 font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publishing */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark text-base">Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Published Date</Label>
                  <Input
                    type="date"
                    value={post.published_date}
                    onChange={(e) => setPost(prev => ({ ...prev, published_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Author</Label>
                  <Input
                    value={post.author}
                    onChange={(e) => setPost(prev => ({ ...prev, author: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Feature on homepage</Label>
                  <Switch
                    checked={post.featured}
                    onCheckedChange={(checked) => setPost(prev => ({ ...prev, featured: checked }))}
                  />
                </div>

                <div>
                  <Label>Read Time</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={post.read_time}
                      onChange={(e) => setPost(prev => ({ ...prev, read_time: parseInt(e.target.value) || 0 }))}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-600">min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relationships */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark text-base">Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Related Tour</Label>
                  <Select
                    value={post.related_tour_id || '__none__'}
                    onValueChange={(v) => setPost(prev => ({ ...prev, related_tour_id: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tour" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {tours
                        .filter(t => t.status === 'published')
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                        .map(tour => (
                          <SelectItem key={tour.id} value={tour.id}>
                            {tour.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Related Destination</Label>
                  <Select
                    value={post.related_destination_id || '__none__'}
                    onValueChange={(v) => setPost(prev => ({ ...prev, related_destination_id: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {destinations
                        .filter(d => d.status === 'published')
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                        .map(dest => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Language Versions */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark text-base">Language Versions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Language Group ID</Label>
                  <Input
                    value={post.language_group_id}
                    onChange={(e) => setPost(prev => ({ ...prev, language_group_id: e.target.value }))}
                    placeholder="e.g., wicklow-way-guide"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Same ID links EN/NL/DE versions together
                  </p>
                </div>

                {siblingPosts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Sibling Versions:</p>
                    {siblingPosts.map(sibling => (
                      <Link
                        key={sibling.id}
                        href={createPageUrl('BlogPostEditor') + '?id=' + sibling.id}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-lg">{getLanguageFlag(sibling.language)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{sibling.title}</p>
                        </div>
                        <Badge className={getStatusBadge(sibling.status) + ' text-xs'}>
                          {sibling.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {post.gsc_last_updated ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600">Clicks</div>
                        <div className="text-xl font-bold text-slate-900">
                          {post.gsc_clicks || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600">Impressions</div>
                        <div className="text-xl font-bold text-slate-900">
                          {post.gsc_impressions || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600">Avg Position</div>
                        <div className="text-xl font-bold text-slate-900">
                          {post.gsc_position ? Math.round(post.gsc_position) : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600">CTR</div>
                        <div className="text-xl font-bold text-slate-900">
                          {post.gsc_ctr ? `${post.gsc_ctr.toFixed(1)}%` : '—'}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Last updated: {format(new Date(post.gsc_last_updated), 'dd MMM yyyy')}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Performance data not yet imported
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-whi hover:bg-whi-hover text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>

          <div className="flex gap-3">
            {post.wp_url && (
              <Button
                variant="outline"
                onClick={() => window.open(post.wp_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in WordPress
              </Button>
            )}

            {isEditing && (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteModal(true)}
                className="text-red-600 hover:bg-red-50"
              >
                Delete Post
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200/60">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Delete {post.title}?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deletePostMutation.mutate();
                  setShowDeleteModal(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusBadge(status) {
  const styles = {
    'published': 'bg-green-100 text-green-800',
    'draft': 'bg-slate-200 text-slate-700',
    'needs_translation': 'bg-whi-subtle text-whi',
    'needs_update': 'bg-whi-purple-subtle text-whi-purple',
    'retired': 'bg-slate-100 text-slate-400'
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}