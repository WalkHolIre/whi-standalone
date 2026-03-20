'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

export default function AdditionalInclusionsList({
  items = [],
  onChange,
  onAdd,
  onRemove,
}: {
  items?: string[];
  onChange?: (items: string[]) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.target.value;
                  onChange?.(newItems);
                }}
                placeholder="Enter inclusion"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove?.(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Inclusion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
