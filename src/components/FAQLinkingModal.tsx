// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';

export default function FAQLinkingModal({ open, onClose, onLink, currentLinks = [], linkType = 'destination' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaqIds, setSelectedFaqIds] = useState([]);

  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data } = await supabase.from('faqs').select('*').order('sort_order');
      return data || [];
    }
  });

  const availableFaqs = faqs
    .filter(faq => faq.status === 'published')
    .filter(faq => !currentLinks.includes(faq.id))
    .filter(faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleToggle = (faqId) => {
    setSelectedFaqIds(prev => 
      prev.includes(faqId) 
        ? prev.filter(id => id !== faqId)
        : [...prev, faqId]
    );
  };

  const handleLink = () => {
    onLink(selectedFaqIds);
    setSelectedFaqIds([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Existing FAQs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search FAQs by question, section, or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableFaqs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                {searchTerm ? 'No FAQs match your search' : 'No available FAQs to link'}
              </p>
            ) : (
              availableFaqs.map(faq => (
                <div
                  key={faq.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleToggle(faq.id)}
                >
                  <Checkbox
                    checked={selectedFaqIds.includes(faq.id)}
                    onCheckedChange={() => handleToggle(faq.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{faq.question}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {faq.section}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {faq.language}
                      </Badge>
                      {faq.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={selectedFaqIds.length === 0}
            style={{ backgroundColor: '#1B4D3E' }}
            className="text-white"
          >
            Link {selectedFaqIds.length} FAQ{selectedFaqIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}