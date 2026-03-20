'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function CSVMappingModal({
  open = false,
  onOpenChange,
  onConfirm,
  columns = [],
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: (mapping: Record<string, string>) => void;
  columns?: string[];
}) {
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  const handleConfirm = () => {
    onConfirm?.(mapping);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map CSV Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {columns.map((col) => (
            <div key={col} className="flex items-center gap-2">
              <label className="min-w-32 text-sm font-medium">{col}:</label>
              <input
                type="text"
                placeholder={`Map ${col}`}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [col]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm Mapping</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
