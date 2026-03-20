// @ts-nocheck
"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import WHIRichEditor from './WHIRichEditor';

export default function TranslationField({ 
  label, value, onChange, isRichText, isEmpty, 
  charLimit, isRequired = false, minHeight = '150px' 
}) {
  const charCount = value?.length || 0;
  const isOverLimit = charLimit && charCount > charLimit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>{label}{isRequired && ' *'}</Label>
          {isEmpty && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
              <AlertCircle className="w-3 h-3" />
              Missing
            </span>
          )}
        </div>
        {charLimit && (
          <span className={`text-sm ${isOverLimit ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
            {charCount} / {charLimit}
          </span>
        )}
      </div>
      
      {isRichText ? (
        <WHIRichEditor
          value={value || ''}
          onChange={onChange}
          minHeight={minHeight}
        />
      ) : (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
          className={isEmpty ? 'border-red-300' : ''}
          maxLength={charLimit}
        />
      )}
    </div>
  );
}