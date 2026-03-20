// @ts-nocheck
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Helper to get language-specific field key
export const getFieldKey = (baseName, lang) => {
  // Fields that have explicit _en suffix in schema
  if (['description', 'highlights'].includes(baseName)) {
    return lang === 'en' ? `${baseName}_en` : `${baseName}_${lang}`;
  }
  // Fields that do NOT have _en suffix (implicitly English for base field)
  return lang === 'en' ? baseName : `${baseName}_${lang}`;
};

// Helper to parse array field stored as JSON string
export const getParsedArrayField = (formData, baseName, lang) => {
  const key = getFieldKey(baseName, lang);
  const value = formData[key];
  try {
    if (baseName === 'itinerary') {
      return Array.isArray(value) ? value : [];
    }
    return value && typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
  } catch (e) {
    console.warn(`Failed to parse ${key}:`, value, e);
    return [];
  }
};

// Helper to get text field value
export const getRichTextField = (formData, baseName, lang) => {
  const key = getFieldKey(baseName, lang);
  return formData[key] || '';
};

// Language-aware input component
export function LanguageAwareInput({ baseName, lang, formData, onChange, ...props }) {
  const key = getFieldKey(baseName, lang);
  const value = formData[key] || '';
  
  return (
    <Input
      value={value}
      onChange={(e) => onChange(key, e.target.value)}
      {...props}
    />
  );
}

// Language-aware textarea component
export function LanguageAwareTextarea({ baseName, lang, formData, onChange, ...props }) {
  const key = getFieldKey(baseName, lang);
  const value = formData[key] || '';
  
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(key, e.target.value)}
      {...props}
    />
  );
}