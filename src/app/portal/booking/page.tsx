// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createPageUrl } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Users, MapPin, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PartnerBookingView() {
  const router = useRouter();
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  const bookingId = paramsId;
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Auth check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (!currentUser) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Find partner contact
        const { data: contacts } = await supabase.from('partner_contacts').select('*').eq('email', currentUser.email).eq('is_portal_user', true);
        const contactsList = contacts || [];

        if (contactsList.length === 0) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const partnerContact = contactsList[0];
        setContact(partnerContact);

        // Get partner
        const { data: partners } = await supabase.from('partners').select('*').eq('id', partnerContact.partner_id);
        const partnersList = partners || [];
        setPartner(partnersList[0]);

        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setAccessDenied(true);
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  // Fetch booking
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*').match({ id: bookingId });
      const results = data || [];
      return results[0];
    },
    enabled: !loading && !accessDenied && !!bookingId
  });

  // Fetch partner booking
  const { data: partnerBooking } = useQuery({
    queryKey: ['partner-booking', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('partner_bookings').select('*').match({ booking_id: bookingId });
      const result = data || [];
      return result[0];
    },
    enabled: !loading && !accessDenied && !!bookingId
  });

  // Verify partner access
  useEffect(() => {
    if (partnerBooking && partner && partnerBooking.partner_id !== partner.id) {
      setAccessDenied(true);
    }
  }, [partnerBooking, partner]);

  // Fetch guests
  const { data: guests = [] } = useQuery({
    queryKey: ['booking-guests', bookingId],
    queryFn: async () => {
      // TODO: booking_guests table does not exist - implement proper guest storage
      return [];
    },
    enabled: !loading && !accessDenied && !!bookingId
  });

  // Fetch invoice
  const { data: invoice } = useQuery({
    queryKey: ['partner-invoice', partnerBooking?.id],
    queryFn: async () => {
      const { data } = await supabase.from('partner_invoices').select('*').eq('partner_booking_id', partnerBooking.id);
      const results = data || [];
      return results[0];
    },
    enabled: !loading && !accessDenied && !!partnerBooking
  });

  const getStatusColor = (status) => {
    const colors = {
      'Enquiry': 'bg-slate-700 text-slate-700',
      'Provisional': 'bg-yellow-900/30 text-yellow-400',
      'Confirmed': 'bg-green-900/30 text-green-400',
      'Active': 'bg-blue-900/30 text-blue-400',
      'Completed': 'bg-slate-50 text-slate-700',
      'Cancelled': 'bg-red-900/30 text-red-400'
    };
    return colors[status] || 'bg-slate-700 text-slate-700';
  };

  const getInvoiceStatusColor = (status) => {
    const colors = {
      'Issued': 'bg-blue-900/30 text-blue-400',
      'Paid': 'bg-green-900/30 text-green-400',
      'Overdue': 'bg-red-900/30 text-red-400',
      'Cancelled': 'bg-slate-50 text-slate-400'
    };
    return colors[status] || 'bg-slate-700 text-slate-700';
  };

  if (loading || bookingLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 bg-slate-200" />
          <Skeleton className="h-96 bg-slate-200" />
        </div>
      </div>
    );
  }

  if (accessDenied || !booking || !partnerBooking) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/60 rounded-2xl shadow-sm">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-slate-400 mb-6">
                You don't have permission to view this booking.
              </p>
              <Button
                onClick={() => router.push(createPageUrl('PartnerPortal'))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Back to Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const invoiceAmount = partnerBooking.b2b_price_applied * (booking.number_of_walkers || 1);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(createPageUrl('PartnerPortal'))}
            className="text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Booking Details</h1>
            <p className="text-slate-400 mt-1">Reference: {booking.booking_reference || booking.id.slice(0, 8)}</p>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {booking.status}
          </Badge>
        </div>

        {/* Booking Information */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Booking Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Booking Reference</p>
                <p className="text-slate-900 font-medium">{booking.booking_reference || booking.id.slice(0, 8)}</p>
              </div>
              {partnerBooking.partner_reference && (
                <div>
                  <p className="text-sm text-slate-400">Your Reference</p>
                  <p className="text-slate-900 font-medium">{partnerBooking.partner_reference}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-400">Customer Name</p>
                <p className="text-slate-900 font-medium">{booking.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Customer Email</p>
                <p className="text-slate-900 font-medium">{booking.customer_email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tour Details */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Tour Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Tour Name</p>
              <p className="text-lg text-slate-900 font-medium">{booking.tour_name}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </p>
                <p className="text-slate-900 font-medium">
                  {booking.start_date ? format(new Date(booking.start_date), 'dd MMM yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date
                </p>
                <p className="text-slate-900 font-medium">
                  {booking.end_date ? format(new Date(booking.end_date), 'dd MMM yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Number of Guests
                </p>
                <p className="text-slate-900 font-medium text-lg">{booking.number_of_walkers || 1}</p>
              </div>
            </div>
            {booking.special_requests && (
              <div>
                <p className="text-sm text-slate-400">Special Requests</p>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg mt-1">{booking.special_requests}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest Details */}
        {guests.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Guest Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {guests.map((guest, index) => (
                  <div key={guest.id} className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-slate-900 font-medium">Guest {index + 1}: {guest.guest_name}</span>
                      {guest.room_type && (
                        <Badge variant="outline" className="bg-slate-700 text-slate-700 border-slate-300">
                          {guest.room_type}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {guest.date_of_birth && (
                        <div>
                          <p className="text-slate-400">Date of Birth</p>
                          <p className="text-slate-800">{format(new Date(guest.date_of_birth), 'dd MMM yyyy')}</p>
                        </div>
                      )}
                      {guest.dietary_requirements && (
                        <div>
                          <p className="text-slate-400">Dietary Requirements</p>
                          <p className="text-slate-800">{guest.dietary_requirements}</p>
                        </div>
                      )}
                      {guest.special_requests && (
                        <div className="md:col-span-2">
                          <p className="text-slate-400">Special Requests</p>
                          <p className="text-slate-800">{guest.special_requests}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Information */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Invoice Amount</p>
                <p className="text-2xl text-slate-900 font-bold">€{invoiceAmount.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {booking.number_of_walkers || 1} guest{(booking.number_of_walkers || 1) > 1 ? 's' : ''} × €{partnerBooking.b2b_price_applied.toLocaleString()}
                </p>
              </div>
              {invoice && (
                <>
                  <div>
                    <p className="text-sm text-slate-400">Invoice Status</p>
                    <Badge className={`${getInvoiceStatusColor(invoice.status)} mt-2`}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Invoice Number</p>
                    <p className="text-slate-900 font-medium font-mono">{invoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Due Date</p>
                    <p className="text-slate-900 font-medium">
                      {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  {invoice.pdf_url && (
                    <div className="md:col-span-2">
                      <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-700">
                          Download Invoice PDF
                        </Button>
                      </a>
                    </div>
                  )}
                </>
              )}
              {!invoice && (
                <div>
                  <p className="text-sm text-slate-400">Invoice Status</p>
                  <p className="text-slate-400 text-sm mt-1">Invoice not yet generated</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}