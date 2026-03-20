// @ts-nocheck
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Plus, Eye, Mail, Phone, Calendar, Star, Users, Building2, ChevronUp, ChevronDown, X, Trash2, Search, Menu } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { LoadingState } from '@/components/LoadingState';


export default function PartnersIndex() {
  const queryClient = useQueryClient();

  // Read URL params
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  const [urlParams, setUrlParams] = React.useState(new URLSearchParams(''));
  React.useEffect(() => {
    setUrlParams(new URLSearchParams(window.location.search));
  }, []);

  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [typeFilter, setTypeFilter] = useState(urlParams.get('type') || 'all');
  const [countryFilter, setCountryFilter] = useState(urlParams.get('country') || 'all');
  const [languageFilter, setLanguageFilter] = useState(urlParams.get('language') || 'all');
  const [commissionFilter, setCommissionFilter] = useState(urlParams.get('commission') || 'all');
  const [starFilter, setStarFilter] = useState(urlParams.get('stars') || 'any');
  const [sourceFilter, setSourceFilter] = useState(urlParams.get('source') || 'all');
  const [hasActiveBookings, setHasActiveBookings] = useState(urlParams.get('active_bookings') === 'true');
  const [hasOutstanding, setHasOutstanding] = useState(urlParams.get('outstanding') === 'true');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('company');
  const [sortDirection, setSortDirection] = useState('asc');

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (countryFilter !== 'all') params.set('country', countryFilter);
    if (languageFilter !== 'all') params.set('language', languageFilter);
    if (commissionFilter !== 'all') params.set('commission', commissionFilter);
    if (starFilter !== 'any') params.set('stars', starFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (hasActiveBookings) params.set('active_bookings', 'true');
    if (hasOutstanding) params.set('outstanding', 'true');

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [search, statusFilter, typeFilter, countryFilter, languageFilter, commissionFilter, starFilter, sourceFilter, hasActiveBookings, hasOutstanding]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*');
      return data || [];
    }
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['partnerContacts'],
    queryFn: async () => {
      const { data } = await supabase.from('partner_contacts').select('*');
      return data || [];
    }
  });

  const { isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  const partners = customers.filter(c => c.is_partner);

  // Enrich partners with booking data
  const enrichedPartners = useMemo(() => {
    if (!bookings || !contacts) return partners.map(p => ({
      ...p,
      bookingsCount: 0,
      activeBookingsCount: 0,
      lifetimeValue: 0,
      outstanding: 0,
      contactsCount: 0,
      contacts: []
    }));

    return partners.map(partner => {
      const partnerBookings = bookings.filter(b => b.customer_id === partner.id);
      const confirmedBookings = partnerBookings.filter(b => ['Confirmed', 'Active', 'Completed'].includes(b.status));
      const activeBookings = partnerBookings.filter(b => ['Confirmed', 'Active'].includes(b.status));

      const lifetimeValue = confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const outstanding = partnerBookings.reduce((sum, b) => sum + (b.balance_due || 0), 0);

      const partnerContacts = contacts.filter(c => c.partner_id === partner.id);

      return {
        ...partner,
        bookingsCount: partnerBookings.length,
        activeBookingsCount: activeBookings.length,
        lifetimeValue,
        outstanding,
        contactsCount: partnerContacts.length,
        contacts: partnerContacts
      };
    });
  }, [partners, bookings, contacts]);

  const filtered = useMemo(() => {
    let result = enrichedPartners;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
      (c.display_name?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.customer_number?.toLowerCase().includes(q) ||
        c.billing_country?.toLowerCase().includes(q) ||
        c.contacts?.some(contact =>
          contact.email?.toLowerCase().includes(q) ||
          contact.contact_name?.toLowerCase().includes(q)
        ))
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter(c => c.partner_status === 'active');
      } else if (statusFilter === 'inactive') {
        result = result.filter(c => c.status === 'Inactive');
      } else if (statusFilter === 'prospect') {
        result = result.filter(c => c.partner_status === 'lead');
      }
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.tags?.includes(typeFilter));
    }

    if (countryFilter !== 'all') {
      result = result.filter(c => c.billing_country === countryFilter);
    }

    if (languageFilter !== 'all') {
      result = result.filter(c => c.preferred_language === languageFilter);
    }

    if (commissionFilter === 'net_rate') {
      result = result.filter(c => c.tags?.includes('Net Rate'));
    } else if (commissionFilter === 'commission') {
      result = result.filter(c => c.tags?.includes('Commission'));
    }

    if (starFilter !== 'any') {
      const minStars = parseInt(starFilter);
      result = result.filter(c => (c.star_rating || 0) >= minStars);
    }

    if (sourceFilter !== 'all') {
      result = result.filter(c => c.source === sourceFilter);
    }

    if (hasActiveBookings) {
      result = result.filter(c => c.activeBookingsCount > 0);
    }

    if (hasOutstanding) {
      result = result.filter(c => (c.outstanding || 0) > 0);
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'company':
          aVal = a.display_name || '';
          bVal = b.display_name || '';
          break;
        case 'country':
          aVal = a.billing_country || '';
          bVal = b.billing_country || '';
          break;
        case 'bookings':
          aVal = a.bookingsCount || 0;
          bVal = b.bookingsCount || 0;
          break;
        case 'lifetime':
          aVal = a.lifetimeValue || 0;
          bVal = b.lifetimeValue || 0;
          break;
        case 'outstanding':
          aVal = a.outstanding || 0;
          bVal = b.outstanding || 0;
          break;
        case 'stars':
          aVal = a.star_rating || 0;
          bVal = b.star_rating || 0;
          break;
        default:
          aVal = a.customer_number || '';
          bVal = b.customer_number || '';
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [enrichedPartners, search, statusFilter, typeFilter, countryFilter, languageFilter, commissionFilter, starFilter, sourceFilter, hasActiveBookings, hasOutstanding, sortColumn, sortDirection]);

  const summaryStats = useMemo(() => {
    const totalLifetime = filtered.reduce((sum, p) => sum + (p.lifetimeValue || 0), 0);
    const totalOutstanding = filtered.reduce((sum, p) => sum + (p.outstanding || 0), 0);

    return {
      total: filtered.length,
      active: filtered.filter(c => c.partner_status === 'active').length,
      totalLifetime,
      totalOutstanding
    };
  }, [filtered]);

  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(partners.map(p => p.billing_country).filter(Boolean))];
    return uniqueCountries.sort();
  }, [partners]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCountryFilter('all');
    setLanguageFilter('all');
    setCommissionFilter('all');
    setStarFilter('any');
    setSourceFilter('all');
    setHasActiveBookings(false);
    setHasOutstanding(false);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-3 h-3 inline ml-1" /> :
      <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const deletePartnerMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('customers').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Partner deleted');
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
    }
  });

  const rowsPerPage = 25;
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Partners
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Trade accounts, travel agents & tour operators</p>
          </div>
          <Button
            onClick={() => window.location.href = createPageUrl('PartnerProfile') + '?new=true'}
            className="relative z-10 w-full md:w-auto h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm border-0 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Partner
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 p-6 relative overflow-hidden">
            <div className="text-sm font-semibold text-indigo-900/60 uppercase tracking-widest mb-1">Total Partners</div>
            <div className="text-4xl font-black text-indigo-900">{summaryStats.total}</div>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 p-6 relative overflow-hidden">
            <div className="text-sm font-semibold text-emerald-900/60 uppercase tracking-widest mb-1">Active</div>
            <div className="text-4xl font-black text-emerald-900">{summaryStats.active}</div>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 p-6 relative overflow-hidden">
            <div className="text-sm font-semibold text-amber-900/60 uppercase tracking-widest mb-1">Total Lifetime Value</div>
            <div className="text-4xl font-black text-amber-900">
              €{summaryStats.totalLifetime.toLocaleString()}
            </div>
          </Card>
          <Card className={`rounded-2xl border-0 shadow-sm bg-gradient-to-br p-6 relative overflow-hidden ${summaryStats.totalOutstanding > 0 ? 'from-rose-50 to-pink-50' : 'from-slate-50 to-gray-50'}`}>
            <div className={`text-sm font-semibold uppercase tracking-widest mb-1 ${summaryStats.totalOutstanding > 0 ? 'text-rose-900/60' : 'text-slate-900/60'}`}>Total Outstanding</div>
            <div className={`text-4xl font-black ${summaryStats.totalOutstanding > 0 ? 'text-rose-900' : 'text-slate-900'}`}>
              €{summaryStats.totalOutstanding.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 p-6">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search partners, contacts, countries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 border-slate-200 rounded-xl bg-slate-50 focus-visible:ring-indigo-500 shadow-sm"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Partner Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Travel Agent">Travel Agent</SelectItem>
                  <SelectItem value="Tour Operator">Tour Operator</SelectItem>
                  <SelectItem value="DMC">DMC</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-44 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-80">
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-40 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="de">DE</SelectItem>
                  <SelectItem value="nl">NL</SelectItem>
                  <SelectItem value="fr">FR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Select value={commissionFilter} onValueChange={setCommissionFilter}>
                <SelectTrigger className="w-48 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Commission Model" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="net_rate">Net Rate</SelectItem>
                  <SelectItem value="commission">Commission %</SelectItem>
                </SelectContent>
              </Select>

              <Select value={starFilter} onValueChange={setStarFilter}>
                <SelectTrigger className="w-36 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="any">Any ★</SelectItem>
                  <SelectItem value="1">1★+</SelectItem>
                  <SelectItem value="2">2★+</SelectItem>
                  <SelectItem value="3">3★+</SelectItem>
                  <SelectItem value="4">4★+</SelectItem>
                  <SelectItem value="5">5★</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md font-medium text-slate-700">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="trade_show">Trade Show</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="rezgo">Rezgo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-slate-50 px-4 h-11 rounded-xl border border-slate-200">
                <Checkbox
                  id="active-bookings"
                  checked={hasActiveBookings}
                  onCheckedChange={setHasActiveBookings}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="active-bookings" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Has Active Bookings
                </label>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-4 h-11 rounded-xl border border-slate-200">
                <Checkbox
                  id="outstanding"
                  checked={hasOutstanding}
                  onCheckedChange={setHasOutstanding}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="outstanding" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Has Outstanding Balance
                </label>
              </div>

              <Button
                variant="outline"
                onClick={resetFilters}
                className="ml-auto h-11 px-6 rounded-xl font-semibold shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
          {isLoading ? (
            <LoadingState message="Loading partners..." />
          ) : paginatedData.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No partners found</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">Add your first trade partner or adjust your filters.</p>
              <Button
                onClick={() => window.location.href = createPageUrl('PartnerProfile') + '?new=true'}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm border-0 transition-colors gap-2 h-11"
              >
                <Plus className="w-4 h-4" />
                Add New Partner
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Logo</th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('company')}
                      >
                        <div className="flex items-center gap-1">Partner <SortIcon column="company" /></div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('country')}
                      >
                        <div className="flex items-center gap-1">Country <SortIcon column="country" /></div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Lang</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Contacts</th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('bookings')}
                      >
                        <div className="flex items-center gap-1">Bookings <SortIcon column="bookings" /></div>
                      </th>
                      <th
                        className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('lifetime')}
                      >
                        <div className="flex items-center justify-end gap-1">Lifetime Value <SortIcon column="lifetime" /></div>
                      </th>
                      <th
                        className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('outstanding')}
                      >
                        <div className="flex items-center justify-end gap-1">Outstanding <SortIcon column="outstanding" /></div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('stars')}
                      >
                        <div className="flex items-center gap-1">★ <SortIcon column="stars" /></div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((partner, idx) => (
                      <tr
                        key={partner.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        onClick={() => window.location.href = createPageUrl('PartnerProfile') + '?id=' + partner.id}
                      >
                        <td className="px-6 py-4">
                          <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-bold">
                              {(partner.display_name || 'P')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{partner.display_name}</div>
                            <div className="text-sm font-medium text-slate-500 rounded-md bg-slate-100 px-2 py-0.5 inline-block mt-1">{partner.customer_number}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            {partner.tags?.includes('Travel Agent') && (
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0 rounded-lg">Travel Agent</Badge>
                            )}
                            {partner.tags?.includes('Tour Operator') && (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0 rounded-lg">Tour Operator</Badge>
                            )}
                            {partner.tags?.includes('DMC') && (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-0 rounded-lg">DMC</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-700">
                            {partner.billing_country || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {partner.preferred_language && (
                            <Badge variant="outline" className="text-slate-600 uppercase border-slate-200 bg-white">
                              {partner.preferred_language}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {partner.partner_status === 'active' && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 rounded-lg shadow-sm">Active</Badge>
                          )}
                          {partner.partner_status === 'lead' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 rounded-lg shadow-sm">Prospect</Badge>
                          )}
                          {partner.status === 'Inactive' && (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300 border-0 rounded-lg shadow-sm">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {partner.contactsCount > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg px-2">
                                  <Users className="w-4 h-4 mr-2" />
                                  {partner.contactsCount}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 rounded-xl shadow-lg border-slate-200 p-0 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                  <h4 className="font-bold text-slate-900 text-sm">Contacts ({partner.contactsCount})</h4>
                                  {partner.contacts.map(contact => (
                                    <div key={contact.id} className="text-xs border-b border-slate-100 pb-2">
                                      <div className="font-medium">{contact.contact_name}</div>
                                      {contact.role_title && <div className="text-slate-500">{contact.role_title}</div>}
                                      {contact.email && (
                                        <a href={`mailto:${contact.email}`} className="text-whi-purple">
                                          {contact.email}
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          {partner.bookingsCount > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = createPageUrl('PartnerProfile') + '?id=' + partner.id + '&tab=bookings'}
                              className="text-whi-purple hover:bg-whi-subtle"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {partner.bookingsCount}
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                          €{partner.lifetimeValue.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {partner.outstanding > 0 ? (
                            <span className="text-sm font-semibold text-red-600">
                              €{partner.outstanding.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= (partner.star_rating || 0)
                                  ? 'fill-whi text-whi'
                                  : 'text-slate-300'
                                  }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = createPageUrl('PartnerProfile') + '?id=' + partner.id}
                              className="p-1 h-auto text-whi-purple hover:bg-whi-subtle"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto text-whi-purple hover:bg-whi-subtle"
                              title="Send Email"
                              onClick={(e) => {
                                e.stopPropagation();
                                const email = partner.email || partner.contacts?.[0]?.email;
                                if (email) {
                                  window.location.href = `mailto:${email}`;
                                } else {
                                  toast.error('No email address found for this partner');
                                }
                              }}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto text-whi-purple hover:bg-whi-subtle"
                              title="Call"
                              onClick={(e) => {
                                e.stopPropagation();
                                const phone = partner.phone || partner.contacts?.[0]?.phone;
                                if (phone) {
                                  window.location.href = `tel:${phone}`;
                                } else {
                                  toast.error('No phone number found for this partner');
                                }
                              }}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto text-whi-purple hover:bg-whi-subtle"
                              title="Create Booking"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = createPageUrl('BookingDetail') + '?type=b2b&partner_id=' + partner.id;
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPartnerToDelete(partner);
                                setDeleteDialogOpen(true);
                              }}
                              className="p-1 h-auto text-red-600 hover:bg-red-50"
                              title="Delete Partner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-500">
                  Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 rounded-lg shadow-sm font-medium"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 rounded-lg shadow-sm font-medium"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && partnerToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200/60">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete {partnerToDelete.display_name}?</h3>
            <p className="text-slate-500 mb-6 font-medium text-sm">
              This action cannot be undone. All data associated with this partner will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setPartnerToDelete(null);
                }}
                className="flex-1 rounded-xl h-11 font-semibold text-slate-700 shadow-sm"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletePartnerMutation.mutate(partnerToDelete.id)}
                className="flex-1 rounded-xl h-11 font-semibold shadow-sm"
              >
                Delete Partner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}