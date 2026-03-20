// @ts-nocheck
"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, X, Info } from 'lucide-react';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';

export default function GlobalServicesDisplay() {
  const { data: settings = [] } = useQuery({
    queryKey: ['globalSettings'],
    queryFn: async () => {
      const { data } = await supabase.from('global_settings').select('*');
      return data || [];
    }
  });

  const includedServices = settings.find(s => s.setting_key === 'included_services')?.setting_value || [];
  const excludedServices = settings.find(s => s.setting_key === 'excluded_services')?.setting_value || [];

  return (
    <div className="space-y-6">
      {/* Included Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">What's Included</Label>
          <Badge variant="outline" className="bg-slate-100">
            <Info className="w-3 h-3 mr-1" />
            All Tours
          </Badge>
        </div>
        <div className="space-y-2">
          {includedServices.length > 0 ? (
            includedServices.map((service, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{service}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 italic">No included services defined</p>
          )}
        </div>
      </div>

      {/* Excluded Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">What's Not Included</Label>
          <Badge variant="outline" className="bg-slate-100">
            <Info className="w-3 h-3 mr-1" />
            All Tours
          </Badge>
        </div>
        <div className="space-y-2">
          {excludedServices.length > 0 ? (
            excludedServices.map((service, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{service}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 italic">No excluded services defined</p>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-xs text-slate-600">
          These services apply to all tours. To edit, visit{' '}
          <Link
            to={createPageUrl('GlobalSettings')}
            className="text-whi font-semibold hover:underline"
          >
            Global Settings
          </Link>
        </p>
      </div>
    </div>
  );
}