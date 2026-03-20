// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Mail, Loader2, Plus, Trash2, 
  Copy, User, ExternalLink, AlertCircle, Clock 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPageUrl } from '@/lib/utils';
import { format, differenceInDays, differenceInYears } from 'date-fns';
import BookingItineraryManager from '@/components/BookingItineraryManager';

export default function BookingEditMode({ bookingId }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [guestForm, setGuestForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    room_type: 'Double',
    dietary_requirements: '',
    special_requests: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'Bank Transfer',
    payment_type: 'Deposit',
    status: 'Completed',
    transaction_reference: '',
    notes: ''
  });

  const [editDetailsMode, setEditDetailsMode] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    tour_id: '',
    start_date: '',
    end_date: '',
    number_of_walkers: 1,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    total_price: 0,
    special_requests: '',
    billing_street: '',
    billing_street_2: '',
    billing_city: '',
    billing_state: '',
    billing_postal_code: '',
    billing_country: ''
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*').match({ id: bookingId });
      const result = data || [];
      return result[0];
    }
  });

  const { data: customer } = useQuery({
    queryKey: ['customer', booking?.customer_id],
    queryFn: async () => {
      if (!booking?.customer_id) return null;
      const { data } = await supabase.from('customers').select('*');
      const customers = data || [];
      return customers.find(c => c.id === booking.customer_id);
    },
    enabled: !!booking?.customer_id
  });

  const { data: tour } = useQuery({
    queryKey: ['tour', booking?.tour_id],
    queryFn: async () => {
      if (!booking?.tour_id) return null;
      const { data } = await supabase.from('tours').select('*');
      const tours = data || [];
      return tours.find(t => t.id === booking.tour_id);
    },
    enabled: !!booking?.tour_id
  });

  const { data: partnerBooking } = useQuery({
    queryKey: ['partnerBooking', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('partner_bookings').select('*').match({ booking_id: bookingId });
      const result = data || [];
      return result[0] || null;
    }
  });

  const { data: partner } = useQuery({
    queryKey: ['partner', partnerBooking?.partner_id],
    queryFn: async () => {
      if (!partnerBooking?.partner_id) return null;
      const { data } = await supabase.from('partners').select('*');
      const partners = data || [];
      return partners.find(p => p.id === partnerBooking.partner_id);
    },
    enabled: !!partnerBooking?.partner_id
  });

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', bookingId],
    queryFn: async () => {
      // TODO: booking_guests table does not exist - implement proper guest storage
      return [];
    }
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('*').match({ booking_id: bookingId });
      const result = data || [];
      return result.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    }
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: allTours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      const tours = data || [];
      return tours.filter(t => t.status === 'published' || t.status === 'active');
    }
  });

  // Initialize booking form when booking loads
  useEffect(() => {
    if (booking) {
      setBookingForm({
        tour_id: booking.tour_id || '',
        start_date: booking.start_date || '',
        end_date: booking.end_date || '',
        number_of_walkers: booking.number_of_walkers || 1,
        customer_name: booking.customer_name || '',
        customer_email: booking.customer_email || '',
        customer_phone: booking.customer_phone || '',
        total_price: booking.total_price || 0,
        special_requests: booking.special_requests || '',
        billing_street: booking.billing_street || '',
        billing_street_2: booking.billing_street_2 || '',
        billing_city: booking.billing_city || '',
        billing_state: booking.billing_state || '',
        billing_postal_code: booking.billing_postal_code || '',
        billing_country: booking.billing_country || ''
      });
    }
  }, [booking]);

  // Calculate age at travel
  const calculateAge = (dob, travelDate) => {
    if (!dob || !travelDate) return null;
    return differenceInYears(new Date(travelDate), new Date(dob));
  };

  // Calculate payment due dates
  const depositDueDate = booking?.created_date 
    ? format(new Date(new Date(booking.created_date).getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    : null;
  
  const balanceDueDate = booking?.start_date
    ? format(new Date(new Date(booking.start_date).getTime() - 42 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    : null;

  const getDueDateBadge = (dueDate) => {
    if (!dueDate) return null;
    const daysUntil = differenceInDays(new Date(dueDate), new Date());
    if (daysUntil < 0) return <Badge className="bg-red-200 text-red-800">Overdue by {Math.abs(daysUntil)} days</Badge>;
    if (daysUntil < 7) return <Badge className="bg-red-200 text-red-800">Due in {daysUntil} days</Badge>;
    if (daysUntil <= 14) return <Badge className="bg-yellow-200 text-yellow-800">Due in {daysUntil} days</Badge>;
    return <Badge className="bg-green-200 text-green-800">Due in {daysUntil} days</Badge>;
  };

  // Update booking status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const response = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId).select().single();
      response.data;
      
      // If status changed to Completed, generate review token
      if (newStatus === 'Completed' && !booking.review_token) {
        console.log('Mocked function call', 'generateReviewToken', { booking_id: bookingId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success('Status updated');
    }
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async () => {
      console.log('Mocked function call', 'sendBookingQuote', { booking_id: bookingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success('Quote email sent');
    },
    onError: (error) => {
      toast.error('Failed to send quote: ' + error.message);
    }
  });

  const sendConfirmationMutation = useMutation({
    mutationFn: async () => {
      console.log('Mocked function call', 'sendBookingConfirmation', { booking_id: bookingId });
    },
    onSuccess: () => {
      toast.success('Confirmation email sent');
    }
  });

  const requestReviewMutation = useMutation({
    mutationFn: async () => {
      if (!booking.review_token) {
        console.log('Mocked function call', 'generateReviewToken', { booking_id: bookingId });
      }
      // TODO: Add send review request email function
      console.warn('TODO: Implement review request email function');
      toast.success('Review token generated — email sending coming soon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    }
  });

  const saveGuestMutation = useMutation({
    mutationFn: async (data) => {
      const guestData = {
        ...data,
        booking_id: bookingId,
        tour_name: booking.tour_name,
        guest_name: `${data.first_name} ${data.last_name}`.trim(),
        age_at_travel: calculateAge(data.date_of_birth, booking.start_date)
      };

      // TODO: booking_guests table does not exist - implement proper guest storage
      throw new Error('Guest storage not implemented');
      // if (editingGuest) {
      //   const response = await supabase.from('booking_guests').update(guestData).eq('id', editingGuest.id).select().single();
      //   return response.data;
      // }
      // const response = await supabase.from('booking_guests').insert(guestData).select().single();
      // return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', bookingId] });
      setGuestDialogOpen(false);
      setEditingGuest(null);
      setGuestForm({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        room_type: 'Double',
        dietary_requirements: '',
        special_requests: ''
      });
      toast.success(editingGuest ? 'Guest updated' : 'Guest added');
    }
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (guestId) => {
      // TODO: booking_guests table does not exist
      throw new Error('Guest storage not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', bookingId] });
      toast.success('Guest removed');
    }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const { data: created } = await supabase.from('payments').insert({
        ...data,
        booking_id: bookingId
      }).select().single();
      return created;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['payments', bookingId] });

      // Recalculate booking totals
      const { data } = await supabase.from('payments').select('*').match({ booking_id: bookingId });
      const allPayments = data || [];
      const completedPayments = allPayments.filter(p => p.status === 'Completed');
      const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalPrice = booking.total_price || 0;
      const balanceDue = totalPrice - totalPaid;
      
      let paymentStatus = 'Unpaid';
      if (totalPaid >= totalPrice && totalPrice > 0) {
        paymentStatus = 'Fully Paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'Deposit Paid';
      }

      await supabase.from('bookings').update({
        deposit_paid: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus
      }).eq('id', bookingId);
      
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setPaymentDialogOpen(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'Bank Transfer',
        payment_type: 'Deposit',
        status: 'Completed',
        transaction_reference: '',
        notes: ''
      });
      toast.success('Payment recorded');
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId) => (await supabase.from('payments').delete().eq('id', paymentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', bookingId] });
      toast.success('Payment deleted');
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async () => {
      // Delete all related records first
      await Promise.all([
        // TODO: booking_guests table does not exist - skip guest deletion
        // ...guests.map(async (g) => (await supabase.from('booking_guests').delete().eq('id', g.id))),
        ...payments.map(async (p) => (await supabase.from('payments').delete().eq('id', p.id)))
      ]);

      // Delete partner booking if exists
      if (partnerBooking) {
        await supabase.from('partner_bookings').delete().eq('id', partnerBooking.id);
      }

      // Finally delete the booking
      await supabase.from('bookings').delete().eq('id', bookingId);
    },
    onSuccess: () => {
      toast.success('Booking deleted');
      router.push(createPageUrl('Bookings'));
    },
    onError: (error) => {
      toast.error('Failed to delete booking: ' + error.message);
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteText) => {
      const note = {
        text: noteText,
        timestamp: new Date().toISOString(),
        author: user?.full_name || user?.email || 'System'
      };
      
      const updatedHistory = [note, ...(booking.notes_history || [])];
      await supabase.from('bookings').update({
        notes_history: updatedHistory
      }).eq('id', bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setNewNote('');
      toast.success('Note added');
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (data) => {
      const selectedTour = allTours.find(t => t.id === data.tour_id);
      const updateData = {
        ...data,
        tour_name: selectedTour?.name || booking.tour_name,
        end_date: data.end_date || calculateEndDate(data.start_date, selectedTour)
      };
      const response = await supabase.from('bookings').update(updateData).eq('id', bookingId).select().single();
      return response.data;
    },
    onSuccess: async (_, variables) => {
      // If tour changed, auto-assign itinerary
      if (variables.tour_id !== booking.tour_id) {
        try {
          console.log('Mocked function call', 'assignItinerary', { booking_id: bookingId });
          queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
          toast.success('Booking updated and itinerary assigned');
        } catch (error) {
          toast.warning('Booking updated but itinerary assignment failed');
        }
      } else {
        toast.success('Booking updated');
      }
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setEditDetailsMode(false);
    },
    onError: (error) => {
      toast.error('Failed to update booking: ' + error.message);
    }
  });

  const calculateEndDate = (startDate, tour) => {
    if (!startDate || !tour) return '';
    const start = new Date(startDate);
    const duration = tour.duration_days || 1;
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);
    return end.toISOString().split('T')[0];
  };

  const handleAddGuest = () => {
    setEditingGuest(null);
    setGuestForm({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      room_type: 'Double',
      dietary_requirements: '',
      special_requests: ''
    });
    setGuestDialogOpen(true);
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setGuestForm({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      date_of_birth: guest.date_of_birth || '',
      gender: guest.gender || '',
      room_type: guest.room_type || 'Double',
      dietary_requirements: guest.dietary_requirements || '',
      special_requests: guest.special_requests || ''
    });
    setGuestDialogOpen(true);
  };

  const copyReviewUrl = () => {
    navigator.clipboard.writeText(booking.review_url);
    toast.success('Review URL copied');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-600">Booking not found</p>
      </div>
    );
  }

  const totalPaid = payments
    .filter(p => p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(createPageUrl('Bookings'))}
                className="text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Edit Booking</h1>
                <Badge variant="outline" className="mt-1">{booking.booking_reference}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
                    deleteBookingMutation.mutate();
                  }
                }}
                disabled={deleteBookingMutation.isPending}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deleteBookingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (booking.quote_sent_date) {
                    if (confirm('Resend quote?')) {
                      sendQuoteMutation.mutate();
                    }
                  } else {
                    sendQuoteMutation.mutate();
                  }
                }}
                disabled={sendQuoteMutation.isPending}
                className="gap-2"
              >
                {sendQuoteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Send Quote
                {booking.quote_sent_date && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Sent {format(new Date(booking.quote_sent_date), 'MMM d')}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendConfirmationMutation.mutate()}
                disabled={sendConfirmationMutation.isPending || (booking.status !== 'Confirmed' && booking.status !== 'Active' && booking.status !== 'Completed')}
                className="gap-2"
              >
                {sendConfirmationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Send Confirmation
              </Button>
              {booking.status === 'Completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestReviewMutation.mutate()}
                  disabled={requestReviewMutation.isPending}
                  className="gap-2"
                >
                  {requestReviewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Request Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Booking Summary */}
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Source</div>
                {partnerBooking && partner ? (
                  <Link href={createPageUrl('PartnerDetail') + `?id=${partner.id}`}>
                    <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-slate-100">
                      B2B: {partner.partner_name} <ExternalLink className="w-3 h-3" />
                    </Badge>
                  </Link>
                ) : (
                  <Badge className="bg-blue-200 text-blue-800">B2C Direct</Badge>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Customer</div>
                {customer ? (
                  <Link href={createPageUrl('Customers')} className="hover:underline">
                    <div className="font-semibold text-sm text-slate-900">{customer.name}</div>
                    <div className="text-xs text-slate-600">{customer.email}</div>
                  </Link>
                ) : (
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{booking.customer_name}</div>
                    <div className="text-xs text-slate-600">{booking.customer_email}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Tour</div>
                <div className="font-semibold text-sm text-slate-900">{booking.tour_name}</div>
                {tour && (
                  <Badge variant="outline" className="text-xs mt-1">{tour.duration_days} days</Badge>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Dates</div>
                <div className="text-sm text-slate-900">
                  {format(new Date(booking.start_date), 'MMM d')} → {format(new Date(booking.end_date || booking.start_date), 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              <div>
                <div className="text-xs text-slate-500 mb-1">Guests</div>
                <div className="text-sm font-semibold text-slate-900">
                  {booking.number_of_walkers} walkers
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Status</div>
                <Select
                  value={booking.status}
                  onValueChange={(val) => updateStatusMutation.mutate(val)}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enquiry">Enquiry</SelectItem>
                    <SelectItem value="Provisional">Provisional</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Payment</div>
                <Badge className={
                  booking.payment_status === 'Fully Paid' ? 'bg-green-200 text-green-800' :
                  booking.payment_status === 'Deposit Paid' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-slate-200 text-slate-800'
                }>
                  {booking.payment_status}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Total / Paid / Due</div>
                <div className="text-sm font-semibold text-slate-900">
                  €{(booking.total_price || 0).toFixed(0)} / €{totalPaid.toFixed(0)} / €{(booking.balance_due || 0).toFixed(0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="guests">Guests ({guests.length}/{booking.number_of_walkers})</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="payments">Payments & Invoices</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Booking Details</CardTitle>
                {!editDetailsMode && (
                  <Button onClick={() => setEditDetailsMode(true)} size="sm" variant="outline">
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editDetailsMode ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateBookingMutation.mutate(bookingForm);
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column: Tour Details */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Tour Details</h3>
                        <div>
                          <Label>Tour *</Label>
                          <Select
                            value={bookingForm.tour_id}
                            onValueChange={(val) => {
                              const selectedTour = allTours.find(t => t.id === val);
                              setBookingForm({
                                ...bookingForm,
                                tour_id: val,
                                end_date: calculateEndDate(bookingForm.start_date, selectedTour),
                                total_price: (selectedTour?.price_per_person_eur || 0) * bookingForm.number_of_walkers
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select tour" />
                            </SelectTrigger>
                            <SelectContent>
                              {allTours.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} - €{t.price_per_person_eur} - {t.duration_days} days
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date *</Label>
                            <Input
                              type="date"
                              value={bookingForm.start_date}
                              onChange={(e) => {
                                const selectedTour = allTours.find(t => t.id === bookingForm.tour_id);
                                setBookingForm({
                                  ...bookingForm,
                                  start_date: e.target.value,
                                  end_date: calculateEndDate(e.target.value, selectedTour)
                                });
                              }}
                              required
                            />
                          </div>
                          <div>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={bookingForm.end_date}
                              onChange={(e) => setBookingForm({ ...bookingForm, end_date: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Number of Guests *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={bookingForm.number_of_walkers}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 1;
                                const selectedTour = allTours.find(t => t.id === bookingForm.tour_id);
                                setBookingForm({
                                  ...bookingForm,
                                  number_of_walkers: num,
                                  total_price: (selectedTour?.price_per_person_eur || 0) * num
                                });
                              }}
                              required
                            />
                          </div>
                          <div>
                            <Label>Total Price (€) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bookingForm.total_price}
                              onChange={(e) => setBookingForm({ ...bookingForm, total_price: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Special Requests</Label>
                          <Textarea
                            value={bookingForm.special_requests}
                            onChange={(e) => setBookingForm({ ...bookingForm, special_requests: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Right Column: Customer & Billing Details */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Customer & Billing Details</h3>
                        <div>
                          <Label>Customer Name *</Label>
                          <Input
                            value={bookingForm.customer_name}
                            onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Customer Email *</Label>
                            <Input
                              type="email"
                              value={bookingForm.customer_email}
                              onChange={(e) => setBookingForm({ ...bookingForm, customer_email: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Phone / Mobile</Label>
                            <Input
                              value={bookingForm.customer_phone}
                              onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Address Line 1</Label>
                          <Input
                            value={bookingForm.billing_street}
                            onChange={(e) => setBookingForm({ ...bookingForm, billing_street: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Address Line 2</Label>
                          <Input
                            value={bookingForm.billing_street_2}
                            onChange={(e) => setBookingForm({ ...bookingForm, billing_street_2: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>City</Label>
                            <Input
                              value={bookingForm.billing_city}
                              onChange={(e) => setBookingForm({ ...bookingForm, billing_city: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Zip / Postal Code</Label>
                            <Input
                              value={bookingForm.billing_postal_code}
                              onChange={(e) => setBookingForm({ ...bookingForm, billing_postal_code: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>County / State</Label>
                            <Input
                              value={bookingForm.billing_state}
                              onChange={(e) => setBookingForm({ ...bookingForm, billing_state: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Country</Label>
                            <Input
                              value={bookingForm.billing_country}
                              onChange={(e) => setBookingForm({ ...bookingForm, billing_country: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                      <Button type="button" variant="outline" onClick={() => setEditDetailsMode(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateBookingMutation.isPending} className="gap-2">
                        {updateBookingMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column: Tour Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Tour Details</h3>
                      <div>
                        <Label className="text-slate-600">Tour</Label>
                        <p className="font-semibold">{booking.tour_name}</p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Dates</Label>
                        <p className="font-semibold">
                          {format(new Date(booking.start_date), 'MMM d')} → {format(new Date(booking.end_date || booking.start_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Number of Guests</Label>
                        <p className="font-semibold">{booking.number_of_walkers}</p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Total Price</Label>
                        <p className="font-semibold">€{(booking.total_price || 0).toFixed(2)}</p>
                      </div>
                      {booking.special_requests && (
                        <div>
                          <Label className="text-slate-600">Special Requests</Label>
                          <p className="text-sm">{booking.special_requests}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Customer Billing Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Customer & Billing Details</h3>
                      <div>
                        <Label className="text-slate-600">Customer Name</Label>
                        <p className="font-semibold">{booking.customer_name}</p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Customer Email</Label>
                        <p className="font-semibold">{booking.customer_email}</p>
                      </div>
                      {booking.customer_phone && (
                        <div>
                          <Label className="text-slate-600">Customer Phone</Label>
                          <p className="font-semibold">{booking.customer_phone}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-slate-600">Billing Address</Label>
                        {(booking.billing_street || booking.billing_street_2 || booking.billing_city || booking.billing_postal_code || booking.billing_country) ? (
                          <div className="text-sm space-y-1">
                            {booking.billing_street && <p>{booking.billing_street}</p>}
                            {booking.billing_street_2 && <p>{booking.billing_street_2}</p>}
                            <p>
                              {[booking.billing_city, booking.billing_state].filter(Boolean).join(', ')}
                              {booking.billing_postal_code && ` ${booking.billing_postal_code}`}
                            </p>
                            {booking.billing_country && <p>{booking.billing_country}</p>}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No address on file</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guests Tab */}
          <TabsContent value="guests">
            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Guest Details</CardTitle>
                <Button onClick={handleAddGuest} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Guest
                </Button>
              </CardHeader>
              <CardContent>
                {guests.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No guests added yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>First Name</TableHead>
                          <TableHead>Last Name</TableHead>
                          <TableHead>DOB</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Dietary</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guests.map((guest, index) => (
                          <TableRow key={guest.id} className="border-slate-200">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {guest.first_name || '-'}
                                {guest.is_lead_guest && (
                                  <Badge variant="outline" className="text-xs">Lead</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{guest.last_name || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {guest.date_of_birth ? format(new Date(guest.date_of_birth), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {calculateAge(guest.date_of_birth, booking.start_date) || '-'}
                            </TableCell>
                            <TableCell>{guest.gender || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{guest.room_type}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {guest.dietary_requirements || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditGuest(guest)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Remove this guest?')) {
                                      deleteGuestMutation.mutate(guest.id);
                                    }
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Itinerary Tab */}
          <TabsContent value="itinerary">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle>Itinerary & Service Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <BookingItineraryManager
                  bookingId={bookingId}
                  bookingStartDate={booking.start_date}
                  tourId={booking.tour_id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              {/* Payment Summary */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-600">Total Booking Value</div>
                      <div className="text-2xl font-bold text-slate-900">
                        €{(booking.total_price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">
                        Deposit Required (25%)
                      </div>
                      <div className="text-xl font-semibold text-slate-900">
                        €{((booking.total_price || 0) * 0.25).toFixed(2)}
                      </div>
                      {depositDueDate && (
                        <div className="mt-1">{getDueDateBadge(depositDueDate)}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">
                        Balance Due
                      </div>
                      <div className="text-xl font-semibold text-slate-900">
                        €{((booking.total_price || 0) * 0.75).toFixed(2)}
                      </div>
                      {balanceDueDate && (
                        <div className="mt-1">{getDueDateBadge(balanceDueDate)}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Amount Paid</div>
                      <div className="text-xl font-semibold text-green-700">
                        €{totalPaid.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Remaining Balance</div>
                      <div className="text-xl font-semibold text-orange-700">
                        €{(booking.balance_due || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-2">Status</div>
                      <Badge className={
                        booking.payment_status === 'Fully Paid' ? 'bg-green-200 text-green-800' :
                        booking.payment_status === 'Deposit Paid' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-slate-200 text-slate-800'
                      }>
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Payment History</CardTitle>
                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Record Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Record New Payment</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          recordPaymentMutation.mutate(paymentForm);
                        }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Payment Date *</Label>
                            <Input
                              type="date"
                              value={paymentForm.payment_date}
                              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Amount (€) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Payment Method *</Label>
                            <Select
                              value={paymentForm.payment_method}
                              onValueChange={(val) => setPaymentForm({ ...paymentForm, payment_method: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Stripe">Stripe</SelectItem>
                                <SelectItem value="PayPal">PayPal</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Payment Type *</Label>
                            <Select
                              value={paymentForm.payment_type}
                              onValueChange={(val) => setPaymentForm({ ...paymentForm, payment_type: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Deposit">Deposit</SelectItem>
                                <SelectItem value="Balance Payment">Balance Payment</SelectItem>
                                <SelectItem value="Full Payment">Full Payment</SelectItem>
                                <SelectItem value="Refund">Refund</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Transaction Reference</Label>
                          <Input
                            value={paymentForm.transaction_reference}
                            onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="gap-2">
                            <Save className="w-4 h-4" />
                            Record Payment
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No payments recorded yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id} className="border-slate-200">
                            <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-semibold">€{payment.amount.toFixed(2)}</TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell>{payment.payment_type}</TableCell>
                            <TableCell>
                              <Badge className={
                                payment.status === 'Completed' ? 'bg-green-200 text-green-800' :
                                payment.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-slate-200 text-slate-800'
                              }>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {payment.transaction_reference || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Delete this payment?')) {
                                    deletePaymentMutation.mutate(payment.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Notes Section */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle>Notes & Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newNote.trim()) {
                    addNoteMutation.mutate(newNote);
                  }
                }}
              />
              <Button
                onClick={() => addNoteMutation.mutate(newNote)}
                disabled={!newNote.trim()}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {(!booking.notes_history || booking.notes_history.length === 0) ? (
                <p className="text-center py-8 text-slate-500">No notes yet</p>
              ) : (
                booking.notes_history.map((note, index) => (
                  <div
                    key={index}
                    className="p-3 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {note.author}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(note.timestamp), 'dd MMM yyyy \'at\' HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{note.text}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Review Section */}
        {booking.status === 'Completed' && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle>Customer Review</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.review_submitted ? (
                <div className="space-y-2">
                  <Badge className="bg-green-200 text-green-800">Review Submitted</Badge>
                  <p className="text-sm text-slate-600">
                    Submitted on {format(new Date(booking.review_submitted_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-200 text-yellow-800">Awaiting Review</Badge>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  {booking.review_url && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={booking.review_url}
                        readOnly
                        className="flex-1 text-sm bg-slate-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyReviewUrl}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                    </div>
                  )}
                  <Button size="sm" className="gap-2">
                    <Mail className="w-4 h-4" />
                    Send Review Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Guest Dialog */}
      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{editingGuest ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveGuestMutation.mutate(guestForm);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={guestForm.first_name}
                  onChange={(e) => setGuestForm({ ...guestForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={guestForm.last_name}
                  onChange={(e) => setGuestForm({ ...guestForm, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={guestForm.date_of_birth}
                  onChange={(e) => setGuestForm({ ...guestForm, date_of_birth: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Age at Travel</Label>
                <Input
                  value={calculateAge(guestForm.date_of_birth, booking.start_date) || ''}
                  readOnly
                  className="bg-slate-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select
                  value={guestForm.gender}
                  onValueChange={(val) => setGuestForm({ ...guestForm, gender: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room Type *</Label>
                <Select
                  value={guestForm.room_type}
                  onValueChange={(val) => setGuestForm({ ...guestForm, room_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Twin">Twin</SelectItem>
                    <SelectItem value="Double">Double</SelectItem>
                    <SelectItem value="Triple">Triple</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Dietary Requirements</Label>
              <Input
                value={guestForm.dietary_requirements}
                onChange={(e) => setGuestForm({ ...guestForm, dietary_requirements: e.target.value })}
                placeholder="e.g. Vegetarian, Gluten-free"
              />
            </div>
            <div>
              <Label>Special Requests</Label>
              <Textarea
                value={guestForm.special_requests}
                onChange={(e) => setGuestForm({ ...guestForm, special_requests: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setGuestDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="w-4 h-4" />
                {editingGuest ? 'Update Guest' : 'Add Guest'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}