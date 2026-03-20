// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { default as MarkdownEditor } from './MarkdownEditor';

export default function FAQCreationModal({ 
  open, 
  onClose, 
  onCreated,
  prefilledData = {} 
}) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    section: prefilledData.section || 'general',
    language: 'en',
    status: 'published',
    sort_order: 0,
    destination_ids: prefilledData.destination_ids || [],
    tour_ids: prefilledData.tour_ids || [],
    tags: [],
    ...prefilledData
  });

  const [tagInput, setTagInput] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Remove destination_ids/tour_ids from FAQ data — linking is done via junction tables
      const { destination_ids, tour_ids, ...faqData } = data;
      const { data: newFaq, error } = await supabase.from('faqs').insert(faqData).select().single();
      if (error) throw error;

      // If destination_ids were provided, insert into junction table
      if (destination_ids?.length > 0) {
        const links = destination_ids.map((destId, i) => ({
          faq_id: newFaq.id,
          destination_id: destId,
          sort_order: i,
        }));
        await supabase.from('faq_destination_map').insert(links);
      }

      return newFaq;
    },
    onSuccess: (newFaq) => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ created successfully');
      onCreated(newFaq);
      resetForm();
      onClose();
    },
    onError: () => {
      toast.error('Failed to create FAQ');
    }
  });

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      section: prefilledData.section || 'general',
      language: 'en',
      status: 'published',
      sort_order: 0,
      destination_ids: prefilledData.destination_ids || [],
      tour_ids: prefilledData.tour_ids || [],
      tags: [],
      ...prefilledData
    });
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = () => {
    if (!formData.question || !formData.answer) {
      toast.error('Question and answer are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New FAQ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Question *</Label>
            <Input
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the question..."
            />
          </div>

          <div>
            <Label>Answer *</Label>
            <MarkdownEditor
              value={formData.answer}
              onChange={(value) => setFormData(prev => ({ ...prev, answer: value }))}
              rows={6}
              placeholder="Write the answer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Section</Label>
              <Select
                value={formData.section}
                onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="destinations">Destinations</SelectItem>
                  <SelectItem value="tours">Tours</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag and press Enter"
              />
              <Button onClick={handleAddTag} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-slate-200 px-2 py-1 rounded text-sm cursor-pointer hover:bg-slate-300"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            style={{ backgroundColor: '#1B4D3E' }}
            className="text-white"
          >
            {createMutation.isPending ? 'Creating...' : 'Create FAQ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}