// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Search, Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { createPageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import NewPartnerBookingForm from '@/components/NewPartnerBookingForm';

export default function PartnerPortal() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [partnerContact, setPartnerContact] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('start_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          toast.error('You are not authenticated');
          router.push(createPageUrl('Home'));
          return;
        }
        setUser(currentUser);

        // Find partner contact by email
        const { data: contacts } = await supabase.from('partner_contacts').select('*').eq('email', currentUser.email).eq('is_portal_user', true);
        const contactsList = contacts || [];

        if (contactsList.length === 0) {
          toast.error('You do not have access to the partner portal');
          router.push(createPageUrl('Home'));
          return;
        }

        const contact = contactsList[0];
        setPartnerContact(contact);

        // Get partner details
        const { data: partners } = await supabase.from('partners').select('*').eq('id', contact.partner_id);
        const partnersList = partners || [];

        if (partnersList.length > 0) {
          setPartner(partnersList[0]);
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        router.push(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch partner bookings
  const { data: partnerBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['partner-bookings', partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data } = await supabase.from('partner_bookings').select('*').eq('partner_id', partner.id);
      return data || [];
    },
    enabled: !!partner?.id
  });

  // Fetch all bookings for this partner
  const { data: allBookings = [], isLoading: allBookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings-for-partner', partner?.id],
    queryFn: async () => {
      if (!partner?.id || partnerBookings.length === 0) return [];

      const bookingIds = partnerBookings.map(pb => pb.booking_id);
      const { data } = await supabase.from('bookings').select('*');
      const bookings = data || [];

      return bookings.filter(b => bookingIds.includes(b.id));
    },
    enabled: !!partner?.id && partnerBookings.length > 0
  });

  const handleBookingSuccess = () => {
    refetchBookings();
  };

  // Calculate stats
  const currentYear = new Date().getFullYear();
  const bookingsThisYear = allBookings.filter(b => {
    const year = new Date(b.start_date).getFullYear();
    return year === currentYear;
  });

  const totalRevenue = bookingsThisYear.reduce((sum, booking) => {
    const pb = partnerBookings.find(pb => pb.booking_id === booking.id);
    return sum + (pb?.b2b_price_applied || booking.total_price || 0);
  }, 0);

  const pendingBookings = bookingsThisYear.filter(b =>
    b.status === 'Enquiry' || b.status === 'Provisional'
  );

  // Filter and sort bookings
  const filteredBookings = bookingsThisYear
    .filter(booking => {
      const matchesSearch =
        booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.tour_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal, bVal;

      if (sortField === 'start_date') {
        aVal = new Date(a.start_date).getTime();
        bVal = new Date(b.start_date).getTime();
      } else if (sortField === 'customer_name') {
        aVal = a.customer_name || '';
        bVal = b.customer_name || '';
      } else if (sortField === 'tour_name') {
        aVal = a.tour_name || '';
        bVal = b.tour_name || '';
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading || bookingsLoading || allBookingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6 lg:p-8">
        <Card className="max-w-md bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400">You do not have access to the partner portal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-white to-slate-50 rounded-lg p-8 border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome, {partner.partner_name}
              </h1>
              <p className="text-slate-400">
                Logged in as {partnerContact.contact_name} ({partnerContact.email})
              </p>
            </div>
            <Button
              onClick={() => setShowBookingForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking Request
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Bookings {currentYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {bookingsThisYear.length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Revenue {currentYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                €{totalRevenue.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">
                Pending Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {pendingBookings.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Table */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-slate-900">Bookings for {currentYear}</CardTitle>

            {/* Filters */}
            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-slate-50 border-slate-200 text-slate-900">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Enquiry">Enquiry</SelectItem>
                  <SelectItem value="Provisional">Provisional</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No bookings found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400">Our Ref</TableHead>
                      <TableHead className="text-slate-400">Partner Ref</TableHead>
                      <TableHead
                        className="text-slate-400 cursor-pointer"
                        onClick={() => toggleSort('customer_name')}
                      >
                        <div className="flex items-center gap-2">
                          Customer Name
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-slate-400 cursor-pointer"
                        onClick={() => toggleSort('tour_name')}
                      >
                        <div className="flex items-center gap-2">
                          Tour Booked
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-slate-400 cursor-pointer"
                        onClick={() => toggleSort('start_date')}
                      >
                        <div className="flex items-center gap-2">
                          Start Date
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-400">End Date</TableHead>
                      <TableHead className="text-slate-400 text-right">Invoice Amount</TableHead>
                      <TableHead className="text-slate-400">Booking Status</TableHead>
                      <TableHead className="text-slate-400">Invoice Status</TableHead>
                      <TableHead className="text-slate-400"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => {
                      const pb = partnerBookings.find(pb => pb.booking_id === booking.id);
                      const invoiceAmount = pb?.b2b_price_applied || booking.total_price || 0;

                      return (
                        <TableRow key={booking.id} className="border-slate-200 hover:bg-slate-800/50">
                          <TableCell className="text-slate-900 font-medium">
                            {booking.booking_number}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {pb?.partner_reference || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {booking.customer_name}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {booking.tour_name}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {booking.start_date ? format(new Date(booking.start_date), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {booking.end_date ? format(new Date(booking.end_date), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-slate-900 text-right font-medium">
                            €{invoiceAmount.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'Confirmed' ? 'bg-green-900/30 text-green-400' :
                                booking.status === 'Cancelled' ? 'bg-red-900/30 text-red-400' :
                                  booking.status === 'Completed' ? 'bg-blue-900/30 text-blue-400' :
                                    'bg-yellow-900/30 text-yellow-400'
                              }`}>
                              {booking.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pb?.commission_status === 'Paid' ? 'bg-green-900/30 text-green-400' :
                                pb?.commission_status === 'Invoiced' ? 'bg-blue-900/30 text-blue-400' :
                                  'bg-slate-50 text-slate-400'
                              }`}>
                              {pb?.commission_status || 'Pending'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(createPageUrl('PartnerBookingView') + `?id=${booking.id}`)}
                              className="text-slate-400 hover:text-slate-900"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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

      {/* New Booking Form Modal */}
      <NewPartnerBookingForm
        open={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        partner={partner}
        partnerContact={partnerContact}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}