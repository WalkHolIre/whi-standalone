// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPageUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Edit, Trash2, Loader2, FileText, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PartnerDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);
  
  const partnerId = paramsId;
  const isEditMode = !!partnerId;

  const [formData, setFormData] = useState({
    partner_name: '',
    partner_type: 'Rate Card Partner',
    default_commission_rate: 0,
    payment_terms: '',
    active: true,
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_county_state: '',
    billing_postcode: '',
    billing_country: '',
    vat_number: '',
    notes: ''
  });

  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showRateCardDialog, setShowRateCardDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editingRateCard, setEditingRateCard] = useState(null);

  // Fetch partner data
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('*').match({ id: partnerId });
      const partners = data || [];
      const p = partners[0];
      if (p) setFormData(p);
      return p;
    },
    enabled: isEditMode
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['partner-contacts', partnerId],
    queryFn: async () => { const { data } = await supabase.from('partner_contacts').select('*').match({ partner_id: partnerId }); return data || []; },
    enabled: isEditMode
  });

  // Fetch rate cards
  const { data: rateCards = [] } = useQuery({
    queryKey: ['partner-rate-cards', partnerId],
    queryFn: async () => {
      // TODO: partner_rate_cards table does not exist - implement proper rate card storage
      return [];
    },
    enabled: isEditMode
  });

  // Fetch tours
  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => { const { data } = await supabase.from('tours').select('*'); return data || []; }
  });

  // Fetch partner bookings
  const { data: partnerBookings = [] } = useQuery({
    queryKey: ['partner-bookings', partnerId],
    queryFn: async () => { const { data } = await supabase.from('partner_bookings').select('*').match({ partner_id: partnerId }); return data || []; },
    enabled: isEditMode
  });

  // Fetch bookings
  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings', 'partner', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*');
      return data || [];
    },
    enabled: isEditMode
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['partner-invoices', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('partner_invoices').select('*').match({ partner_id: partnerId });
      return data || [];
    },
    enabled: isEditMode
  });

  const bookings = allBookings.filter(b =>
    partnerBookings.some(pb => pb.booking_id === b.id)
  );

  // Calculate commission summary
  const commissionSummary = partnerBookings.reduce((acc, pb) => {
    if (pb.pricing_model === 'Commission') {
      acc.total += pb.commission_amount || 0;
      acc[pb.commission_status] = (acc[pb.commission_status] || 0) + (pb.commission_amount || 0);
    }
    return acc;
  }, { total: 0, Pending: 0, Invoiced: 0, Paid: 0 });

  const rateCardRevenue = partnerBookings
    .filter(pb => pb.pricing_model === 'Rate Card')
    .reduce((sum, pb) => sum + (pb.b2b_price_applied || 0), 0);

  // Mutations
  const savePartnerMutation = useMutation({
    mutationFn: async (data) => isEditMode
      ? (await supabase.from('partners').update(data).eq('id', partnerId).select().single()).data
      : (await supabase.from('partners').insert(data).select().single()).data,
    onSuccess: (result) => {
      toast.success(isEditMode ? 'Partner updated' : 'Partner created');
      if (!isEditMode) {
        router.push(createPageUrl('PartnerDetail') + '?id=' + result.id);
      }
      queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    }
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async () => {
      return await supabase.from('partners').delete().eq('id', partnerId);
    },
    onSuccess: () => {
      toast.success('Partner deleted');
      router.push(createPageUrl('Partners'));
    }
  });

  const markInvoicePaidMutation = useMutation({
    mutationFn: (invoiceId) => supabase.from('partner_invoices').update({
      status: 'Paid'
    }).eq('id', invoiceId).select().single(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-invoices', partnerId] });
      toast.success('Invoice marked as paid');
    }
  });

  const handleSave = () => {
    if (!formData.partner_name) {
      toast.error('Partner name is required');
      return;
    }
    savePartnerMutation.mutate(formData);
  };

  if (isEditMode && partnerLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
        <Skeleton className="h-96 w-full bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(createPageUrl('Partners'))}
            className="text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? formData.partner_name : 'New Partner'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={savePartnerMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savePartnerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            {isEditMode && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Delete this partner?')) deletePartnerMutation.mutate();
                }}
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Partner Info */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-slate-900">Partner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Partner Name *</Label>
                    <Input
                      value={formData.partner_name}
                      onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-900"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Partner Type</Label>
                    <Select
                      value={formData.partner_type}
                      onValueChange={(value) => setFormData({ ...formData, partner_type: value })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Commission Partner">Commission Partner</SelectItem>
                        <SelectItem value="Rate Card Partner">Rate Card Partner</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(formData.partner_type === 'Commission Partner' || formData.partner_type === 'Both') && (
                  <div>
                    <Label className="text-slate-700">Default Commission Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.default_commission_rate}
                      onChange={(e) => setFormData({ ...formData, default_commission_rate: parseFloat(e.target.value) })}
                      className="bg-slate-50 border-slate-200 text-slate-900"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">Payment Terms</Label>
                    <Input
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder="e.g., Net 30"
                      className="bg-slate-50 border-slate-200 text-slate-900"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700">Status</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                      />
                      <span className="text-slate-700">{formData.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700">Billing Address</Label>
                  <div className="space-y-2 mt-1">
                    <Input
                      value={formData.billing_address_line1}
                      onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
                      placeholder="Address Line 1"
                      className="bg-slate-50 border-slate-200 text-slate-900"
                    />
                    <Input
                      value={formData.billing_address_line2}
                      onChange={(e) => setFormData({ ...formData, billing_address_line2: e.target.value })}
                      placeholder="Address Line 2"
                      className="bg-slate-50 border-slate-200 text-slate-900"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={formData.billing_city}
                        onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                        placeholder="City"
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                      <Input
                        value={formData.billing_county_state}
                        onChange={(e) => setFormData({ ...formData, billing_county_state: e.target.value })}
                        placeholder="County/State"
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={formData.billing_postcode}
                        onChange={(e) => setFormData({ ...formData, billing_postcode: e.target.value })}
                        placeholder="Postcode"
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                      <Input
                        value={formData.billing_country}
                        onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                        placeholder="Country"
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700">VAT Number</Label>
                  <Input
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    className="bg-slate-50 border-slate-200 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="bg-slate-50 border-slate-200 text-slate-900"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contacts */}
            {isEditMode && (
              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-900">Contacts</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingContact(null);
                      setShowContactDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </CardHeader>
                <CardContent>
                  {contacts.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">No contacts yet</p>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map(contact => (
                        <div key={contact.id} className="bg-slate-50 p-4 rounded-lg flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{contact.contact_name}</p>
                              {contact.is_primary && (
                                <Badge className="bg-blue-900/30 text-blue-400">Primary</Badge>
                              )}
                              {contact.is_portal_user && (
                                <Badge className="bg-purple-900/30 text-purple-400">Portal Access</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400">{contact.role_title}</p>
                            <p className="text-sm text-slate-400">{contact.email}</p>
                            {contact.phone && <p className="text-sm text-slate-400">{contact.phone}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingContact(contact);
                                setShowContactDialog(true);
                              }}
                              className="text-slate-400 hover:text-slate-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Rate Cards */}
            {isEditMode && (
              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-900">Rate Card</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingRateCard(null);
                      setShowRateCardDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rate
                  </Button>
                </CardHeader>
                <CardContent>
                  {rateCards.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">No rate cards yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-400">Tour</TableHead>
                          <TableHead className="text-slate-400 text-right">B2B Price</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rateCards.map(rc => {
                          const tour = tours.find(t => t.id === rc.tour_id);
                          return (
                            <TableRow key={rc.id} className="border-slate-200">
                              <TableCell className="text-slate-800">{tour?.name || 'Unknown'}</TableCell>
                              <TableCell className="text-right text-slate-800">€{rc.b2b_price}</TableCell>
                              <TableCell>
                                <Badge variant={rc.active ? "default" : "secondary"}>
                                  {rc.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRateCard(rc);
                                    setShowRateCardDialog(true);
                                  }}
                                  className="text-slate-400"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          {isEditMode && (
            <div className="space-y-6">
              {/* Revenue Summary */}
              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="text-slate-900">Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-400 text-sm">Total B2B Revenue</Label>
                    <p className="text-2xl font-bold text-slate-900">
                      €{rateCardRevenue.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-sm">Total Bookings</Label>
                    <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Summary */}
              {(formData.partner_type === 'Commission Partner' || formData.partner_type === 'Both') && (
                <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Commission Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-slate-400 text-sm">Total Commission</Label>
                      <p className="text-2xl font-bold text-slate-900">
                        €{commissionSummary.total.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Pending:</span>
                        <span className="text-sm text-amber-400">€{commissionSummary.Pending.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Invoiced:</span>
                        <span className="text-sm text-blue-400">€{commissionSummary.Invoiced.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Paid:</span>
                        <span className="text-sm text-green-400">€{commissionSummary.Paid.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Booking History */}
              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardHeader>
                  <CardTitle className="text-slate-900">Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">No bookings yet</p>
                  ) : (
                    <div className="space-y-2">
                      {bookings.slice(0, 5).map(booking => (
                        <div
                          key={booking.id}
                          className="bg-slate-50 p-3 rounded cursor-pointer hover:bg-slate-700"
                          onClick={() => window.location.href = createPageUrl('BookingDetail') + '?id=' + booking.id}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-slate-800">{booking.booking_reference}</p>
                              <p className="text-xs text-slate-400">{booking.tour_name}</p>
                            </div>
                            <Badge className="text-xs">{booking.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">
                            {booking.start_date && format(new Date(booking.start_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Invoices Section */}
        {isEditMode && (
          <div className="mt-6">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No invoices yet</p>
                    <p className="text-sm mt-1">Invoices are auto-generated 37 days before departure</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-400">Invoice #</TableHead>
                          <TableHead className="text-slate-400">Date</TableHead>
                          <TableHead className="text-slate-400">Due Date</TableHead>
                          <TableHead className="text-slate-400">Amount</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400">Booking Ref</TableHead>
                          <TableHead className="text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map(invoice => {
                          const booking = allBookings.find(b => b.id === invoice.booking_id);
                          const statusColors = {
                            'Issued': 'bg-blue-900/30 text-blue-400',
                            'Paid': 'bg-green-900/30 text-green-400',
                            'Overdue': 'bg-red-900/30 text-red-400',
                            'Cancelled': 'bg-slate-50 text-slate-400'
                          };
                          return (
                            <TableRow key={invoice.id} className="border-slate-200">
                              <TableCell className="text-slate-700 font-mono text-sm">
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-slate-700 font-medium">
                                €{invoice.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[invoice.status]}>
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {booking?.booking_reference || booking?.id.slice(0, 8) || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {invoice.pdf_url && (
                                    <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-slate-50 border-slate-300 text-slate-700"
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        PDF
                                      </Button>
                                    </a>
                                  )}
                                  {(invoice.status === 'Issued' || invoice.status === 'Overdue') && (
                                    <Button
                                      size="sm"
                                      onClick={() => markInvoicePaidMutation.mutate(invoice.id)}
                                      disabled={markInvoicePaidMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Mark Paid
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <ContactDialog
        open={showContactDialog}
        onClose={() => setShowContactDialog(false)}
        partnerId={partnerId}
        contact={editingContact}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['partner-contacts', partnerId] });
          setShowContactDialog(false);
        }}
      />

      {/* Rate Card Dialog */}
      <RateCardDialog
        open={showRateCardDialog}
        onClose={() => setShowRateCardDialog(false)}
        partnerId={partnerId}
        rateCard={editingRateCard}
        tours={tours}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['partner-rate-cards', partnerId] });
          setShowRateCardDialog(false);
        }}
      />
    </div>
  );
}

function ContactDialog({ open, onClose, partnerId, contact, onSuccess }) {
  const [formData, setFormData] = useState({
    contact_name: '',
    role_title: '',
    email: '',
    phone: '',
    is_primary: false,
    is_portal_user: false
  });

  React.useEffect(() => {
    if (contact) {
      setFormData(contact);
    } else {
      setFormData({
        contact_name: '',
        role_title: '',
        email: '',
        phone: '',
        is_primary: false,
        is_portal_user: false
      });
    }
  }, [contact, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => contact
      ? (await supabase.from('partner_contacts').update(data).eq('id', contact.id).select().single()).data
      : (await supabase.from('partner_contacts').insert({ ...data, partner_id: partnerId }).select().single()).data,
    onSuccess: () => {
      toast.success(contact ? 'Contact updated' : 'Contact added');
      onSuccess();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await supabase.from('partner_contacts').delete().eq('id', contact.id);
    },
    onSuccess: () => {
      toast.success('Contact deleted');
      onSuccess();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 text-slate-900">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-slate-700">Name *</Label>
            <Input
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700">Role/Title</Label>
            <Input
              value={formData.role_title}
              onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700">Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700">Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_primary}
              onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
            />
            <Label className="text-slate-700">Primary Contact</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_portal_user}
              onCheckedChange={(checked) => setFormData({ ...formData, is_portal_user: checked })}
            />
            <Label className="text-slate-700">Portal Access</Label>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            {contact && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Delete this contact?')) deleteMutation.mutate();
                }}
                className="border-red-600 text-red-400"
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RateCardDialog({ open, onClose, partnerId, rateCard, tours, onSuccess }) {
  const [formData, setFormData] = useState({
    tour_id: '',
    b2b_price: 0,
    notes: '',
    active: true
  });

  React.useEffect(() => {
    if (rateCard) {
      setFormData(rateCard);
    } else {
      setFormData({
        tour_id: '',
        b2b_price: 0,
        notes: '',
        active: true
      });
    }
  }, [rateCard, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // TODO: partner_rate_cards table does not exist - implement proper rate card storage
      throw new Error('Rate card storage not implemented');
    },
    onSuccess: () => {
      toast.success(rateCard ? 'Rate card updated' : 'Rate card added');
      onSuccess();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // TODO: partner_rate_cards table does not exist
      throw new Error('Rate card storage not implemented');
    },
    onSuccess: () => {
      toast.success('Rate card deleted');
      onSuccess();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 text-slate-900">
        <DialogHeader>
          <DialogTitle>{rateCard ? 'Edit Rate Card' : 'Add Rate Card'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-slate-700">Tour *</Label>
            <Select
              value={formData.tour_id}
              onValueChange={(value) => setFormData({ ...formData, tour_id: value })}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                <SelectValue placeholder="Select tour" />
              </SelectTrigger>
              <SelectContent>
                {tours.map(tour => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-700">B2B Price (EUR) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.b2b_price}
              onChange={(e) => setFormData({ ...formData, b2b_price: parseFloat(e.target.value) })}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label className="text-slate-700">Active</Label>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            {rateCard && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Delete this rate card?')) deleteMutation.mutate();
                }}
                className="border-red-600 text-red-400"
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}