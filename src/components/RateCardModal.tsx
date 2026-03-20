// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export default function RateCardModal({ customerId, onClose }) {
  const [selectedCard, setSelectedCard] = useState('default');
  const queryClient = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
      return data;
    },
    enabled: !!customerId
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.from('customers').update({ assigned_rate_card: selectedCard }).eq('id', customerId).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Rate card updated for ${customer?.display_name}`);
      onClose();
    }
  });

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-96">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Assign Rate Card
            </h2>
            <p className="text-sm text-slate-600 mt-1">{customer.display_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-900 block mb-2">
              Rate Card
            </label>
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default B2B Rate Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            className="flex-1"
            disabled={updateMutation.isPending}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}