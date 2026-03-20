// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';

export default function CustomersIndex() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', 'index'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  const countries = useMemo(() => {
    const unique = [...new Set(customers.map(c => c.billing_country).filter(Boolean))];
    return unique.sort();
  }, [customers]);

  const filtered = useMemo(() => {
    let result = customers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
      (c.display_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.customer_number?.toLowerCase().includes(q) ||
        c.billing_city?.toLowerCase().includes(q) ||
        c.billing_country?.toLowerCase().includes(q))
      );
    }

    if (countryFilter) {
      result = result.filter(c => c.billing_country === countryFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.type === typeFilter);
    }

    if (showNeedsReview) {
      result = result.filter(c => c.name_needs_review);
    }

    return result.sort((a, b) => (a.customer_number || '').localeCompare(b.customer_number || ''));
  }, [customers, search, countryFilter, typeFilter, showNeedsReview]);

  const summaryStats = useMemo(() => ({
    total: customers.length,
    individuals: customers.filter(c => c.type === 'individual').length,
    business: customers.filter(c => c.type === 'business').length,
  }), [customers]);

  const rowsPerPage = 25;
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('customers').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Customers
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">All B2C customer accounts</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-sm font-semibold text-indigo-900/60 uppercase tracking-widest mb-1">Total Customers</div>
              <div className="text-4xl font-black text-indigo-900">{summaryStats.total}</div>
            </div>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-sm font-semibold text-emerald-900/60 uppercase tracking-widest mb-1">Individuals</div>
              <div className="text-4xl font-black text-emerald-900">{summaryStats.individuals}</div>
            </div>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-purple-50 to-fuchsia-50 p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-sm font-semibold text-purple-900/60 uppercase tracking-widest mb-1">Business / Partners</div>
              <div className="text-4xl font-black text-purple-900">{summaryStats.business}</div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by name, email, number, city, country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 border-slate-200 rounded-xl bg-slate-50 focus-visible:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>
            <Select value={countryFilter} onValueChange={(val) => setCountryFilter(val === '__none__' ? '' : val)}>
              <SelectTrigger className="w-40 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-slate-200">
                <SelectItem value="__none__">All Countries</SelectItem>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 backdrop-blur-md">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-slate-200">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowNeedsReview(!showNeedsReview)}
              variant={showNeedsReview ? 'default' : 'outline'}
              className={`h-11 rounded-xl px-4 gap-2 font-medium shadow-sm transition-colors ${showNeedsReview ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}
            >
              <AlertCircle className="w-4 h-4" />
              Needs Review {showNeedsReview && `(${filtered.filter(c => c.name_needs_review).length})`}
            </Button>
            <Button className="h-11 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white ml-auto px-6 font-semibold shadow-sm border-0">
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 overflow-hidden">
          {paginatedData.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="mb-6 text-lg font-medium">No customers found</p>
              <Button className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm border-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Partner</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Country</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Terms</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((customer) => (
                      <tr key={customer.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{customer.customer_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {customer.name_needs_review && (
                              <AlertCircle className="w-4 h-4 text-amber-500" title="Name appears to be an email address — please update" />
                            )}
                            <span className="text-slate-900 font-medium">{customer.display_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={customer.type === 'business' ? 'default' : 'secondary'} className={customer.type === 'business' ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-0' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-0'}>
                            {customer.type === 'business' ? 'Business' : 'Individual'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {customer.partner_status === 'active' && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0">Active Partner</Badge>
                          )}
                          {customer.partner_status === 'lead' && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0">Lead</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {customer.email ? (
                            <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-xs text-sm transition-colors">
                              {customer.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{customer.billing_country || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{customer.payment_terms || '—'}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Link href={createPageUrl('CustomerProfile') + '?id=' + customer.id}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-xs font-semibold shadow-sm"
                              >
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete Customer"
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
      {deleteDialogOpen && customerToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200/60">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete {customerToDelete.display_name}?</h3>
            <p className="text-slate-500 mb-6 font-medium text-sm">
              This action cannot be undone. All data associated with this customer will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setCustomerToDelete(null);
                }}
                className="flex-1 rounded-xl h-11 font-semibold text-slate-700 shadow-sm"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteCustomerMutation.mutate(customerToDelete.id)}
                className="flex-1 rounded-xl h-11 font-semibold shadow-sm"
              >
                Delete Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}