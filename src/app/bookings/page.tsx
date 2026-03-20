// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BOOKING_STATUSES } from '@/components/bookingStatuses';
import {
  Plus,
  Search,
  Calendar,
  Users,
  Mail,
  Phone,
  Euro,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  Download,
  Send
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
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [confirmEmailBookingId, setConfirmEmailBookingId] = useState(null);
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: async () => { const { data, error } = await supabase.from('bookings').select('*').order('created_date', { ascending: false }); if (error) throw error; return data; },
  });

  const { data: partnerBookings = [] } = useQuery({
    queryKey: ['partner-bookings'],
    queryFn: async () => { const { data, error } = await supabase.from('partner_bookings').select('*'); if (error) throw error; return data || []; }
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => { const { data, error } = await supabase.from('partners').select('*'); if (error) throw error; return data || []; }
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => { const { data, error } = await supabase.from('payments').select('*'); if (error) throw error; return data || []; }
  });

  // Enrich bookings with partner info and calculate balance
  const enrichedBookings = bookings?.map(booking => {
    const partnerBooking = partnerBookings.find(pb => pb.booking_id === booking.id);
    const partner = partnerBooking ? partners.find(p => p.id === partnerBooking.partner_id) : null;

    // Calculate amount paid from Payment records
    const bookingPayments = payments.filter(p => p.booking_id === booking.id && p.status === 'Completed');
    const amountPaid = bookingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = (booking.total_price || 0) - amountPaid;

    // Check if payment is overdue (start_date - 42 days has passed)
    const isOverdue = booking.start_date && balanceDue > 0 ? (() => {
      const startDate = new Date(booking.start_date);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() - 42);
      return new Date() > dueDate;
    })() : false;

    return {
      ...booking,
      partner_booking: partnerBooking,
      partner: partner,
      source: partner ? partner.partner_name : (booking.booking_source || 'Website Direct'),
      calculated_balance: balanceDue,
      is_overdue: isOverdue
    };
  }) || [];

  const filteredBookings = enrichedBookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.tour_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.partner?.partner_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || booking.payment_status === paymentFilter;
    const matchesSource = sourceFilter === 'all' ||
      (sourceFilter === 'direct' && !booking.partner) ||
      (sourceFilter === 'partner' && booking.partner);
    const matchesPartner = partnerFilter === 'all' || booking.partner?.id === partnerFilter;

    // Date range filter
    const matchesDateRange = (() => {
      if (!booking.start_date) return true;
      const startDate = new Date(booking.start_date);
      if (dateFromFilter && startDate < new Date(dateFromFilter)) return false;
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (startDate > toDate) return false;
      }
      return true;
    })();

    // Year filter
    const matchesYear = yearFilter === 'all' || !booking.start_date ||
      new Date(booking.start_date).getFullYear() === parseInt(yearFilter);

    return matchesSearch && matchesStatus && matchesPayment && matchesSource && matchesPartner && matchesDateRange && matchesYear;
  });

  const getStatusColor = (status) => {
    const colors = {
      [BOOKING_STATUSES.ENQUIRY]: 'bg-slate-50 text-slate-700 border border-slate-200',
      [BOOKING_STATUSES.PROVISIONAL]: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      [BOOKING_STATUSES.CONFIRMED]: 'bg-green-50 text-green-700 border border-green-200',
      [BOOKING_STATUSES.CANCELLED]: 'bg-red-50 text-red-700 border border-red-200',
      [BOOKING_STATUSES.COMPLETED]: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700';
  };

  const getPaymentColor = (status) => {
    const colors = {
      unpaid: 'bg-red-50 text-red-700',
      deposit_paid: 'bg-yellow-50 text-yellow-700',
      fully_paid: 'bg-green-50 text-green-700',
      refunded: 'bg-slate-50 text-slate-700',
    };
    return colors[status] || 'bg-slate-50 text-slate-700';
  };

  const getStatusIcon = (status) => {
    const icons = {
      [BOOKING_STATUSES.ENQUIRY]: AlertCircle,
      [BOOKING_STATUSES.PROVISIONAL]: Clock,
      [BOOKING_STATUSES.CONFIRMED]: CheckCircle2,
      [BOOKING_STATUSES.CANCELLED]: XCircle,
      [BOOKING_STATUSES.COMPLETED]: CheckCircle2,
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      const { error } = await supabase.from('bookings').update({ status: BOOKING_STATUSES.CONFIRMED }).eq('id', bookingId);
      if (error) throw error;
      // TODO: Migrate email service to SendGrid/Resend
      // await sendBookingConfirmation(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking confirmed and email sent!');
    },
    onError: (error) => {
      toast.error('Failed to confirm booking: ' + error.message);
    }
  });

  const handleConfirmBooking = (e, bookingId) => {
    e.preventDefault();
    e.stopPropagation();
    confirmBookingMutation.mutate(bookingId);
  };

  const exportToCSV = () => {
    const headers = ['Ref', 'Customer', 'Email', 'Tour', 'Start Date', 'Guests', 'Status', 'Source', 'Partner Name', 'Partner Reference', 'Total Price', 'Balance Due', 'Payment Status'];
    const rows = filteredBookings.map(b => [
      b.booking_reference || b.id.slice(0, 8),
      b.customer_name || '',
      b.customer_email || '',
      b.tour_name || '',
      b.start_date ? format(new Date(b.start_date), 'yyyy-MM-dd') : '',
      b.number_of_walkers || 0,
      b.status || '',
      b.source || '',
      b.partner?.partner_name || '',
      b.partner_booking?.partner_reference || '',
      b.total_price || 0,
      b.calculated_balance || 0,
      b.payment_status || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Bookings exported to CSV');
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Bookings
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Manage customer reservations and confirmations</p>
          </div>
          <div className="flex gap-3 relative z-10 w-full md:w-auto">
            <Button onClick={exportToCSV} className="rounded-xl shadow-sm h-11 border-slate-200 text-slate-700 bg-white/50 backdrop-blur-sm border hover:bg-slate-100 px-6 gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Link href={createPageUrl('BookingDetail')}>
              <Button className="rounded-xl shadow-sm h-11 text-white bg-indigo-600 hover:bg-indigo-700 font-semibold px-6 border-0 gap-2">
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Total Bookings</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">
                    {bookings?.length || 0}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-2xl">
                  <Calendar className="w-8 h-8 text-indigo-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest">Confirmed</p>
                  <p className="text-3xl font-black text-emerald-700 mt-2">
                    {bookings?.filter(b => b.status === BOOKING_STATUSES.CONFIRMED).length || 0}
                  </p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest">Pending</p>
                  <p className="text-3xl font-black text-amber-700 mt-2">
                    {bookings?.filter(b => b.status === BOOKING_STATUSES.PROVISIONAL || b.status === BOOKING_STATUSES.ENQUIRY).length || 0}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-2xl">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">Revenue</p>
                  <p className="text-3xl font-black text-indigo-900 mt-2">
                    €{bookings?.reduce((sum, b) => sum + (b.amount_paid_eur || 0), 0).toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-2xl">
                  <Euro className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-visible relative">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by customer name, email, reference, or tour..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-colors shadow-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={BOOKING_STATUSES.ENQUIRY}>{BOOKING_STATUSES.ENQUIRY}</SelectItem>
                  <SelectItem value={BOOKING_STATUSES.PROVISIONAL}>{BOOKING_STATUSES.PROVISIONAL}</SelectItem>
                  <SelectItem value={BOOKING_STATUSES.CONFIRMED}>{BOOKING_STATUSES.CONFIRMED}</SelectItem>
                  <SelectItem value={BOOKING_STATUSES.CANCELLED}>{BOOKING_STATUSES.CANCELLED}</SelectItem>
                  <SelectItem value={BOOKING_STATUSES.COMPLETED}>{BOOKING_STATUSES.COMPLETED}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full lg:w-40 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Deposit Paid">Deposit Paid</SelectItem>
                  <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full lg:w-40 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="direct">Website Direct</SelectItem>
                  <SelectItem value="partner">Travel Agency</SelectItem>
                </SelectContent>
              </Select>
              {sourceFilter === 'partner' && (
                <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                  <SelectTrigger className="w-full lg:w-48 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 rounded-xl">
                    <SelectValue placeholder="Partner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partners</SelectItem>
                    {partners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.partner_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || sourceFilter !== 'all' || partnerFilter !== 'all' || dateFromFilter || dateToFilter || yearFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setSourceFilter('all');
                  setPartnerFilter('all');
                  setDateFromFilter('');
                  setDateToFilter('');
                  setYearFilter('all');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 self-start"
              >
                Clear All Filters
              </Button>
            )}

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setYearFilter('all')}
                  className={yearFilter === 'all' ? 'btn-whi-primary' : 'btn-whi-outline'}
                >
                  All Years
                </Button>
                <Button
                  size="sm"
                  onClick={() => setYearFilter(String(currentYear))}
                  className={yearFilter === String(currentYear) ? 'btn-whi-primary' : 'btn-whi-outline'}
                >
                  {currentYear}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setYearFilter(String(currentYear - 1))}
                  className={yearFilter === String(currentYear - 1) ? 'btn-whi-primary' : 'btn-whi-outline'}
                >
                  {currentYear - 1}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setYearFilter(String(currentYear - 2))}
                  className={yearFilter === String(currentYear - 2) ? 'btn-whi-primary' : 'btn-whi-outline'}
                >
                  {currentYear - 2}
                </Button>
              </div>

              <div className="flex gap-2 flex-1">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    placeholder="From date"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    placeholder="To date"
                  />
                </div>
                {(dateFromFilter || dateToFilter) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDateFromFilter('');
                      setDateToFilter('');
                    }}
                    className="btn-whi-outline"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {isLoading ? (
          <LoadingState message="Loading bookings..." />
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Link key={booking.id} href={createPageUrl('BookingDetail') + '?id=' + booking.id}>
                <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer overflow-hidden mb-4">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900 mb-1">
                              {booking.customer_name}
                            </h3>
                            <p className="text-sm text-slate-600 font-mono">
                              Ref: {booking.booking_reference || booking.id.slice(0, 8)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={`${getStatusColor(booking.status)} border`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(booking.status)}
                                {booking.status}
                              </span>
                            </Badge>
                            <Badge className={getPaymentColor(booking.payment_status)}>
                              {booking.payment_status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium text-slate-900">{booking.tour_name || 'Tour not specified'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="w-4 h-4" />
                            {booking.number_of_walkers} guest{booking.number_of_walkers !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4" />
                            {booking.customer_email}
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            {booking.partner ? (
                              <a
                                href={createPageUrl('PartnerDetail') + '?id=' + booking.partner.id}
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {booking.source}
                              </a>
                            ) : (
                              <span>{booking.source}</span>
                            )}
                          </div>
                        </div>

                        {booking.start_date && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            Travel: {format(new Date(booking.start_date), 'MMM d, yyyy')}
                            {booking.end_date && ` - ${format(new Date(booking.end_date), 'MMM d, yyyy')}`}
                          </div>
                        )}
                      </div>

                      <div className="lg:text-right space-y-2 lg:min-w-[200px]">
                        <div>
                          <p className="text-sm text-slate-600">Total Price</p>
                          <p className="text-2xl font-bold text-slate-900">
                            €{(booking.total_price || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex lg:justify-end gap-2 text-xs">
                            <span className={booking.is_overdue ? 'text-red-600 font-medium' : 'text-slate-600'}>
                              Balance Due: €{(booking.calculated_balance || 0).toLocaleString()}
                              {booking.is_overdue && ' (Overdue)'}
                            </span>
                          </div>
                          {(booking.status === BOOKING_STATUSES.ENQUIRY || booking.status === BOOKING_STATUSES.PROVISIONAL) && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmEmailBookingId(booking.id);
                              }}
                              disabled={confirmBookingMutation.isPending}
                              className="btn-whi-primary gap-2 w-full mt-2"
                            >
                              <Send className="w-3 h-3" />
                              Confirm Booking
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No bookings found</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first booking'}
              </p>
              {!searchQuery && statusFilter === 'all' && paymentFilter === 'all' && (
                <Link href={createPageUrl('BookingDetail')}>
                  <Button className="btn-whi-primary gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Booking
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={!!confirmEmailBookingId} onOpenChange={() => setConfirmEmailBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Booking Confirmation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a confirmation email to the customer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmEmailBookingId) {
                confirmBookingMutation.mutate(confirmEmailBookingId);
              }
              setConfirmEmailBookingId(null);
            }}>
              Yes, Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}