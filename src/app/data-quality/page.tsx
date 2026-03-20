// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';

export default function DataQuality() {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'data-quality'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => (await supabase.from('customers').update(data).eq('id', id).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditingId(null);
      toast.success('Record updated');
    }
  });

  // Tab 1: Name Issues
  const nameIssues = useMemo(() => {
    return customers
      .filter(c => c.name_needs_review)
      .sort((a, b) => (a.customer_number || '').localeCompare(b.customer_number || ''));
  }, [customers]);

  // Tab 2: Missing Email (business only)
  const missingEmail = useMemo(() => {
    return customers
      .filter(c => c.type === 'business' && !c.email)
      .sort((a, b) => (a.customer_number || '').localeCompare(b.customer_number || ''));
  }, [customers]);

  // Tab 3: Missing Address (business only)
  const missingAddress = useMemo(() => {
    return customers
      .filter(c => c.type === 'business' && !c.billing_address && !c.billing_city)
      .sort((a, b) => (a.customer_number || '').localeCompare(b.customer_number || ''));
  }, [customers]);

  const handleSaveEdit = (id, customer, newDisplayName) => {
    const data = { display_name: newDisplayName };
    if (!newDisplayName.includes('@')) {
      data.name_needs_review = false;
    }
    updateMutation.mutate({ id, data });
  };

  const EmptyState = ({ icon: Icon, message }) => (
    <div className="p-12 text-center">
      <Icon className="w-12 h-12 text-green-500 mx-auto mb-4" />
      <p className="text-slate-600">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Data Quality
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Records flagged for review</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm p-6 relative overflow-hidden">
          <Tabs defaultValue="names" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-slate-100/80 p-1 rounded-xl">
              <TabsTrigger value="names" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Name Issues
                {nameIssues.length > 0 && (
                  <Badge className="ml-2 bg-amber-100/80 text-amber-800 text-xs shadow-none border-0">{nameIssues.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="email" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Missing Email
                {missingEmail.length > 0 && (
                  <Badge className="ml-2 bg-amber-100/80 text-amber-800 text-xs shadow-none border-0">{missingEmail.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="address" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Missing Address
                {missingAddress.length > 0 && (
                  <Badge className="ml-2 bg-amber-100/80 text-amber-800 text-xs shadow-none border-0">{missingAddress.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Name Issues */}
            <TabsContent value="names" className="mt-6">
              {nameIssues.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="All clear ✓ — No name issues found" />
              ) : (
                <div className="border border-slate-200/60 shadow-sm rounded-xl overflow-hidden bg-white/70 backdrop-blur-md">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">#</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Name</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Type</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Email</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Country</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nameIssues.map((customer) => (
                        <tr key={customer.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-sm text-whi-purple">{customer.customer_number}</td>
                          <td className="px-4 py-3">
                            {editingId === customer.id ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(customer.id, customer, editValue)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(customer.id, customer, editValue);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                className="h-8"
                              />
                            ) : (
                              <span className="text-amber-700 font-medium">{customer.display_name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={customer.type === 'business' ? 'default' : 'outline'}>
                              {customer.type === 'business' ? 'Business' : 'Individual'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{customer.email || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{customer.billing_country || '—'}</td>
                          <td className="px-4 py-3 flex gap-2">
                            {editingId !== customer.id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingId(customer.id);
                                    setEditValue(customer.display_name);
                                  }}
                                  className="text-whi-purple border-whi-purple/30 hover:bg-whi-purple/10 h-7"
                                >
                                  Fix
                                </Button>
                                <Link href={createPageUrl('CustomerProfile') + '?id=' + customer.id}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-whi-purple hover:bg-whi-purple/10 h-7"
                                  >
                                    View
                                  </Button>
                                </Link>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Missing Email */}
            <TabsContent value="email" className="mt-6">
              {missingEmail.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="All clear ✓ — All business accounts have email" />
              ) : (
                <div className="border border-slate-200/60 shadow-sm rounded-xl overflow-hidden bg-white/70 backdrop-blur-md">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">#</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Company</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Country</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Phone</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Website</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingEmail.map((customer) => (
                        <tr key={customer.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-sm text-whi-purple">{customer.customer_number}</td>
                          <td className="px-4 py-3">
                            <Link href={createPageUrl('CustomerProfile') + '?id=' + customer.id} className="text-whi-purple hover:underline">
                              {customer.display_name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{customer.billing_country || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{customer.phone || '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            {customer.website ? (
                              <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-whi-purple hover:underline">
                                Visit
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={createPageUrl('CustomerProfile') + '?id=' + customer.id}>
                              <Button variant="outline" size="sm" className="text-whi-purple border-whi-purple/30 hover:bg-whi-purple/10 h-7">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Missing Address */}
            <TabsContent value="address" className="mt-6">
              {missingAddress.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="All clear ✓ — All business accounts have addresses" />
              ) : (
                <div className="border border-slate-200/60 shadow-sm rounded-xl overflow-hidden bg-white/70 backdrop-blur-md">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">#</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Company</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Email</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Country</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingAddress.map((customer) => (
                        <tr key={customer.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-sm text-whi-purple">{customer.customer_number}</td>
                          <td className="px-4 py-3">
                            <Link href={createPageUrl('CustomerProfile') + '?id=' + customer.id} className="text-whi-purple hover:underline">
                              {customer.display_name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {customer.email ? (
                              <a href={`mailto:${customer.email}`} className="text-whi-purple hover:underline">
                                {customer.email}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{customer.billing_country || '—'}</td>
                          <td className="px-4 py-3">
                            <Link href={createPageUrl('CustomerProfile') + '?id=' + customer.id}>
                              <Button variant="outline" size="sm" className="text-whi-purple border-whi-purple/30 hover:bg-whi-purple/10 h-7">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}