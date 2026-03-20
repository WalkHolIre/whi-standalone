// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  Upload,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { LoadingState } from '@/components/LoadingState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CSVMappingModal from '@/components/CSVMappingModal';

export default function ServiceProviders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data } = await supabase.from('service_providers').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const importMutation = useMutation({
    /** @param {{ file_url: string, mapping: any }} args */
    mutationFn: async ({ file_url, mapping }) => {
      // TODO: Migrate to Supabase Edge Function
      console.warn('Function not yet migrated: importServiceProviders');
      throw new Error('importServiceProviders function not yet migrated to Supabase');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success(`Imported ${data.imported} service providers`);
      setShowMappingModal(false);
      setCsvData(null);
    },
    onError: (error) => {
      toast.error('Import failed: ' + error.message);
      setShowMappingModal(false);
      setCsvData(null);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Upload file to Supabase Storage and parse CSV
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;
        await supabase.storage.from('images').upload(filePath, file, { cacheControl: '3600', upsert: false });
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
        const file_url = publicUrl;
        const response = await fetch(file_url);
        const csvText = await response.text();

        // Parse CSV headers and sample data
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(';').map(h => h.trim().replace(/^\ufeff|^"|"$/g, ''));

        const sampleData = [];
        for (let i = 1; i < Math.min(4, lines.length); i++) {
          const values = lines[i].split(';').map(v => v.trim().replace(/^"|"$/g, ''));
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          sampleData.push(row);
        }

        setCsvData({ file_url, headers, sampleData });
        setShowMappingModal(true);
      } catch (error) {
        toast.error('Failed to parse CSV file: ' + error.message);
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleMappingConfirm = (mapping) => {
    if (csvData) {
      importMutation.mutate({ file_url: csvData.file_url, mapping });
    }
  };

  const entityFields = [
    { value: 'name', label: 'Business Name' },
    { value: 'type', label: 'Type' },
    { value: 'contact_name', label: 'Contact Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'county', label: 'County' },
    { value: 'postal_code', label: 'Postal Code' },
    { value: 'country', label: 'Country' },
    { value: 'latitude', label: 'Latitude' },
    { value: 'longitude', label: 'Longitude' },
    { value: 'website', label: 'Website' },
    { value: 'image', label: 'Picture' },
    { value: 'services_offered', label: 'Services Offered' },
    { value: 'standard_rate_eur', label: 'Standard Rate (EUR)' },
    { value: 'payment_terms', label: 'Payment Terms' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'rating', label: 'Rating' },
    { value: 'status', label: 'Status' },
    { value: 'notes', label: 'Notes' },
    { value: 'language_spoken', label: 'Languages Spoken' },
  ];

  const filteredProviders = (providers?.filter((provider) => {
    const matchesSearch = provider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || provider.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || provider.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }) || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const getTypeIcon = (type) => {
    return Building2;
  };

  const getTypeColor = (type) => {
    const colors = {
      accommodation: 'bg-blue-500/20 text-blue-400',
      transport: 'bg-green-500/20 text-green-400',
      guide: 'bg-purple-500/20 text-purple-400',
      activity: 'bg-orange-500/20 text-orange-400',
      restaurant: 'bg-pink-500/20 text-pink-400',
      other: 'bg-slate-700 text-slate-400',
    };
    return colors[type] || 'bg-slate-700 text-slate-400';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-slate-700 text-slate-400 border-slate-600',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return colors[status] || 'bg-slate-700 text-slate-400';
  };

  return (
    <div className="p-4 lg:p-8 min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-[2rem] p-8 lg:p-10 mb-8 border border-white/10 shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl mix-blend-screen pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-sm font-medium mb-4 backdrop-blur-md">
                <Building2 className="w-4 h-4" />
                Network Directory
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">Service Providers</h1>
              <p className="text-indigo-200 text-lg max-w-xl leading-relaxed">Manage your network of accommodation, transport, and local guides.</p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-upload').click()}
                disabled={importMutation.isPending}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all gap-2 h-11 px-6 rounded-xl font-semibold shadow-sm"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {importMutation.isPending ? 'Importing...' : 'Import CSV'}
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Link href={createPageUrl('ProviderDetail')}>
                <Button className="bg-white text-indigo-900 hover:bg-slate-50 gap-2 h-11 px-6 rounded-xl shadow-sm transition-all font-bold group">
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  Add Provider
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search providers by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 rounded-xl bg-white/70 focus-visible:ring-indigo-500 shadow-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-48 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="accommodation">Accommodation</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="guide">Guide</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Providers Grid */}
        {isLoading ? (
          <LoadingState message="Loading service providers..." />
        ) : filteredProviders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProviders.map((provider) => (
              <Link key={provider.id} href={createPageUrl('ProviderDetail') + '?id=' + provider.id} className="block group">
                <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 h-full flex flex-col overflow-hidden">
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight mb-3">
                          {provider.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 rounded-lg font-medium px-2 py-0.5">
                            {provider.type || 'Other'}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`${provider.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : provider.status === 'pending' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} border-0 rounded-lg font-medium px-2 py-0.5`}
                          >
                            {provider.status || 'inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm flex-1 mt-2">
                      {provider.contact_name && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-slate-500">{provider.contact_name[0].toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-slate-900 truncate">{provider.contact_name}</span>
                        </div>
                      )}
                      {(provider.city || provider.country) && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                            <MapPin className="w-3 h-3 text-rose-500" />
                          </div>
                          <span className="truncate">{provider.city}{provider.city && provider.country ? ', ' : ''}{provider.country}</span>
                        </div>
                      )}
                      {provider.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <Phone className="w-3 h-3 text-emerald-500" />
                          </div>
                          <span className="truncate">{provider.phone}</span>
                        </div>
                      )}
                      {provider.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <Mail className="w-3 h-3 text-indigo-500" />
                          </div>
                          <span className="truncate">{provider.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        {provider.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-bold text-slate-900">{provider.rating}</span>
                            <span className="text-xs font-medium text-slate-500">/5</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Unrated</span>
                        )}
                      </div>

                      {provider.standard_rate_eur && (
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rate</div>
                          <span className="text-xl font-black text-slate-900 tracking-tight leading-none">
                            €{provider.standard_rate_eur.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No providers found</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first service provider'}
              </p>
              {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
                <Link href={createPageUrl('ProviderDetail')}>
                  <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm border-0 transition-colors gap-2 h-11">
                    <Plus className="w-4 h-4" />
                    Add Your First Provider
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}
      </div>

      <CSVMappingModal
        isOpen={showMappingModal}
        onClose={() => {
          setShowMappingModal(false);
          setCsvData(null);
        }}
        csvHeaders={csvData?.headers || []}
        entityFields={entityFields}
        sampleData={csvData?.sampleData || []}
        onConfirm={handleMappingConfirm}
      />
    </div>
  );
}