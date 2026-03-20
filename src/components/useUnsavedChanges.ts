// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from 'react';

export function useUnsavedChanges() {
  const [hasChanges, setHasChanges] = useState(false);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const markChanged = useCallback(() => setHasChanges(true), []);
  const markSaved = useCallback(() => setHasChanges(false), []);

  return { hasChanges, markChanged, markSaved };
}