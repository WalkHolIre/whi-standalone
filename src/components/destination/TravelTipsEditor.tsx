// @ts-nocheck
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface TravelTip {
  title: string;
  tip: string;
}

interface Props {
  value: TravelTip[] | null;
  onChange: (value: TravelTip[]) => void;
}

export default function TravelTipsEditor({ value, onChange }: Props) {
  const items = value || [];

  const addItem = () => {
    onChange([...items, { title: '', tip: '' }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TravelTip, val: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-slate-700">Travel Tips</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" /> Add Tip
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-slate-400 italic">No travel tips added yet.</p>
      )}

      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
          <GripVertical className="w-4 h-4 text-slate-300 mt-2.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Tip title (e.g. Best Airport)"
              value={item.title}
              onChange={(e) => updateItem(index, 'title', e.target.value)}
            />
            <Input
              placeholder="Tip details"
              value={item.tip}
              onChange={(e) => updateItem(index, 'tip', e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-600 mt-1"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
