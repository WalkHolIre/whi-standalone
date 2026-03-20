// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Search, Check, Building, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPageUrl } from '@/lib/utils';
import BookingEditMode from '@/components/BookingEditMode';
import GuestDetailsForm from '@/components/GuestDetailsForm';

export default function BookingDetail() {
  
  const [paramsId, setParamsId] = useState('');
  useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);
  const bookingId = paramsId;
  
  

  // If booking ID exists, show edit mode
  if (bookingId) {
    return <BookingEditMode bookingId={bookingId} />;
  }

  // Otherwise show new booking wizard
  return <NewBookingWizard />;
}

function NewBookingWizard() {
  const router = useRouter();
  const [bookingType, setBookingType] = useState('b2c'); // b2c or b2b
  const [step, setStep] = useState(1); // 1=type, 2=customer/partner, 3=tour, 4=review

  // B2C fields
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    preferred_language: 'English',
    referral_source: '',
    newsletter_opt_in: false
  });
  const [bookingSource, setBookingSource] = useState('Website Direct');

  // B2B fields
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedPartnerContact, setSelectedPartnerContact] = useState(null);
  const [partnerReference, setPartnerReference] = useState('');

  // Tour & booking fields
  const [selectedTour, setSelectedTour] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [guests, setGuests] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Debounced customer search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(customerSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Fetch data
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const { data } = await supabase.from('customers').select('*');
      const allCustomers = data || [];
      const query = debouncedSearch.toLowerCase();
      return allCustomers.filter(c =>
        (c.display_name || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query)
      ).slice(0, 10);
    },
    enabled: debouncedSearch.length >= 2
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('*');
      const all = data || [];
      return all.filter(p => p.active === true);
    },
    enabled: bookingType === 'b2b'
  });

  const { data: partnerContacts = [] } = useQuery({
    queryKey: ['partnerContacts', selectedPartner?.id],
    queryFn: async () => {
      const { data } = await supabase.from('partner_contacts').select('*');
      const all = data || [];
      return all.filter(pc => pc.partner_id === selectedPartner.id);
    },
    enabled: !!selectedPartner
  });

  const { data: allTours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      const all = data || [];
      return all.filter(t => t.status === 'published' || t.status === 'active');
    }
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    }
  });

  // Filter and sort tours
  const tours = React.useMemo(() => {
    if (!allTours || !destinations) return [];

    let filtered = [...allTours];

    // Filter by region
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(t => {
        const dest = destinations.find(d => d.id === t.destination_id);
        return dest?.region_id === selectedRegion;
      });
    }

    // Sort by duration
    return filtered.sort((a, b) => (a.duration_days || 0) - (b.duration_days || 0));
  }, [allTours, selectedRegion, destinations]);

  const { data: languageSites = [] } = useQuery({
    queryKey: ['languageSites'],
    queryFn: async () => {
      const { data } = await supabase.from('language_sites').select('*');
      const all = data || [];
      return all.filter(ls => ls.status === 'active');
    }
  });

  const { data: tourOptions = [] } = useQuery({
    queryKey: ['tourOptions', selectedTour?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tour_options').select('*');
      const all = data || [];
      return all.filter(opt => opt.tour_id === selectedTour.id && opt.available);
    },
    enabled: !!selectedTour
  });

  const { data: partnerRateCards = [] } = useQuery({
    queryKey: ['partnerRateCards', selectedPartner?.id, selectedTour?.id],
    queryFn: async () => {
      // TODO: partner_rate_cards table does not exist - implement proper rate card storage
      return [];
    },
    enabled: bookingType === 'b2b' && !!selectedPartner && !!selectedTour
  });

  // Calculate end date when tour or start date changes
  useEffect(() => {
    if (selectedTour && startDate) {
      const start = new Date(startDate);
      const duration = selectedTour.duration_days || 1;
      const end = new Date(start);
      end.setDate(end.getDate() + duration - 1);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [selectedTour, startDate]);

  // Calculate total price
  useEffect(() => {
    if (!selectedTour) return;

    let basePrice = 0;
    if (bookingType === 'b2b' && partnerRateCards.length > 0) {
      basePrice = partnerRateCards[0].rate_per_person || selectedTour.price_per_person_eur || 0;
    } else {
      basePrice = selectedTour.price_per_person_eur || 0;
    }

    const baseCost = basePrice * numberOfGuests;
    const optionsCost = selectedOptions.reduce((sum, optId) => {
      const opt = tourOptions.find(o => o.id === optId);
      if (!opt) return sum;
      return sum + (opt.pricing_type === 'per_guest' ? opt.price * numberOfGuests : opt.price);
    }, 0);

    setTotalPrice(baseCost + optionsCost);
  }, [selectedTour, numberOfGuests, selectedOptions, bookingType, partnerRateCards, tourOptions]);

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      let customerId = null;
      let customerData = null;

      // Step 1: Create or get customer
      if (bookingType === 'b2c') {
        if (selectedCustomer) {
          customerId = selectedCustomer.id;
          customerData = selectedCustomer;
        } else {
          // Check if customer with email already exists
          const { data } = await supabase.from('customers').select('*');
          const existingCustomers = data || [];
          const existing = existingCustomers.find(c => c.email === newCustomer.email);

          if (existing) {
            // Use existing customer instead of throwing error
            customerId = existing.id;
            customerData = existing;
          } else {
            // Create new customer
            const { data: created } = await supabase.from('customers').insert({
              name: `${newCustomer.first_name} ${newCustomer.last_name}`.trim(),
              email: newCustomer.email,
              phone: newCustomer.phone,
              country: newCustomer.country,
              city: null,
              notes: null,
              tags: []
            }).select().single();
            customerId = created.id;
            customerData = created;
          }
        }
      } else {
        // B2B booking — link to partner directly, no dummy customer needed
        customerData = {
          id: null, // No customer record for B2B
          name: selectedPartnerContact?.contact_name || selectedPartner?.partner_name || 'Partner Guest',
          email: selectedPartnerContact?.email || '',
        };
        customerId = null;
      }

      // Step 2: Generate booking reference using tour code (ensure it's up to date)
      const tourCode = selectedTour.code || 'UNKNOWN';
      const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
      const bookingRef = `${tourCode}-${timestamp}`;

      // Step 3: Create booking
      const bookingData = {
        booking_reference: bookingRef,
        customer_id: bookingType === 'b2c' ? customerId : null,
        customer_name: customerData.display_name || `${customerData.first_name} ${customerData.last_name}`.trim(),
        customer_email: customerData.email,
        customer_phone: customerData.phone || '',
        tour_id: selectedTour.id,
        tour_name: selectedTour.name,
        start_date: startDate,
        end_date: endDate,
        number_of_walkers: numberOfGuests,
        total_price: totalPrice,
        currency: 'EUR',
        deposit_paid: 0,
        balance_due: totalPrice,
        payment_status: 'Unpaid',
        status: 'Enquiry',
        booking_source: bookingType === 'b2c' ? bookingSource : `Travel Agency - ${selectedPartner?.partner_name || 'Partner'}`
      };

      const response = await supabase.from('bookings').insert(bookingData).select().single();
      const booking = response.data;

      // Step 4: If B2B, create PartnerBooking link
      if (bookingType === 'b2b') {
        await supabase.from('partner_bookings').insert({
          partner_id: selectedPartner.id,
          booking_id: booking.id,
          partner_reference: partnerReference,
          b2b_price_applied: null
        });
      }

      // Step 5: Create guest records from guest details form
      // TODO: booking_guests table does not exist - need to create migration or store guests differently
      // for (let i = 0; i < guests.length; i++) {
      //   const g = guests[i];
      //   await supabase.from('booking_guests').insert({...
      // }

      return booking;
    },
    onSuccess: (booking) => {
      toast.success('Booking created successfully');
      router.push(createPageUrl('BookingDetail') + `?id=${booking.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create booking: ' + error.message);
    }
  });

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Validate customer/partner selected
      if (bookingType === 'b2c' && !selectedCustomer && !showNewCustomerForm) {
        toast.error('Please select a customer or create a new one');
        return;
      }
      if (bookingType === 'b2c' && showNewCustomerForm) {
        if (!newCustomer.first_name || !newCustomer.last_name || !newCustomer.email) {
          toast.error('Please fill in required customer fields');
          return;
        }
      }
      if (bookingType === 'b2b') {
        if (!selectedPartner) {
          toast.error('Please select a partner');
          return;
        }
        if (!selectedPartnerContact) {
          toast.error('Please select a partner contact');
          return;
        }
        if (!partnerReference || partnerReference.trim() === '') {
          toast.error('Partner reference is required for travel agency bookings');
          return;
        }
      }
      setStep(3);
    } else if (step === 3) {
      // Validate tour & dates
      if (!selectedTour) {
        toast.error('Please select a tour');
        return;
      }
      if (!startDate) {
        toast.error('Please select a start date');
        return;
      }
      const selectedStart = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedStart < today) {
        toast.error('Start date cannot be in the past');
        return;
      }
      if (numberOfGuests < 1 || numberOfGuests > 50) {
        toast.error('Number of guests must be between 1 and 50');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      // Validate guest details
      if (guests.length === 0 || guests.length < numberOfGuests) {
        toast.error('Please add all guest details');
        return;
      }
      for (let i = 0; i < guests.length; i++) {
        const g = guests[i];
        if (!g.first_name || !g.last_name || !g.date_of_birth || !g.room_type) {
          toast.error(`Guest ${i + 1}: Please fill in all required fields (name, DOB, room type)`);
          return;
        }
      }
      setStep(5);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    createBookingMutation.mutate();
  };

  const countries = ['Ireland', 'United Kingdom', 'Germany', 'Netherlands', 'France', 'Spain', 'Italy', 'USA', 'Canada', 'Australia', 'Other'];
  const referralSources = ['Google Search', 'Social Media', 'Friend/Family', 'Travel Blog', 'Travel Agent Referral', 'Repeat Customer', 'TripAdvisor', 'Walking Forum', 'Other'];
  const b2cSources = ['Website Direct', 'Phone Enquiry', 'Email Enquiry', 'Walk-in', 'Repeat Customer'];

  return (
    <div className="p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Create New Booking</h1>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { num: 1, label: 'Type' },
              { num: 2, label: 'Customer' },
              { num: 3, label: 'Tour' },
              { num: 4, label: 'Guests' },
              { num: 5, label: 'Review' }
            ].map((s, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                  ${step === s.num ? 'bg-blue-100 text-blue-700 font-medium' :
                    step > s.num ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-500'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step === s.num ? 'bg-blue-500 text-white' :
                    step > s.num ? 'bg-green-500 text-white' :
                      'bg-white text-slate-600 border'}`}>
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1 - Booking Type */}
        {step === 1 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Select Booking Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={bookingType} onValueChange={setBookingType}>
                <div className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="b2c" id="b2c" />
                  <Label htmlFor="b2c" className="flex-1 cursor-pointer flex items-center gap-3">
                    <User className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">Direct Booking (B2C)</div>
                      <div className="text-sm text-slate-600">Booking for individual customers</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="b2b" id="b2b" />
                  <Label htmlFor="b2b" className="flex-1 cursor-pointer flex items-center gap-3">
                    <Building className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">Partner Booking (B2B)</div>
                      <div className="text-sm text-slate-600">Booking from travel agency partners</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} style={{ backgroundColor: '#F17E00', color: '#FFFFFF' }} className="hover:bg-whi-hover">
                  Next: Customer Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 - Customer/Partner Selection */}
        {step === 2 && bookingType === 'b2c' && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedCustomer && !showNewCustomerForm && (
                <>
                  <div>
                    <Label>Search Existing Customer</Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search by name or email..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {customers.length > 0 && (
                      <div className="mt-2 border rounded-lg divide-y max-h-64 overflow-y-auto">
                        {customers.map(customer => (
                          <button
                            key={customer.id}
                            onClick={() => setSelectedCustomer(customer)}
                            className="w-full p-3 hover:bg-slate-50 text-left flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold">{customer.display_name}</div>
                              <div className="text-sm text-slate-600">{customer.email}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {customer.country} • {customer.total_bookings || 0} bookings
                              </div>
                            </div>
                            <Check className="w-5 h-5 text-green-600" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="w-full"
                    >
                      Create New Customer
                    </Button>
                  </div>
                </>
              )}

              {selectedCustomer && (
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedCustomer.display_name}</h3>
                      <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                      <p className="text-sm text-slate-600">
                        {selectedCustomer.country} • {selectedCustomer.preferred_language || 'English'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                      Change
                    </Button>
                  </div>
                  <div>
                    <Label>Booking Source</Label>
                    <Select value={bookingSource} onValueChange={setBookingSource}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {b2cSources.map(src => (
                          <SelectItem key={src} value={src}>{src}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {showNewCustomerForm && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">New Customer Details</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewCustomerForm(false)}>
                      Cancel
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input
                        value={newCustomer.first_name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input
                        value={newCustomer.last_name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Country</Label>
                      <Select value={newCustomer.country} onValueChange={(val) => setNewCustomer({ ...newCustomer, country: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Preferred Language</Label>
                      <Select value={newCustomer.preferred_language} onValueChange={(val) => setNewCustomer({ ...newCustomer, preferred_language: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          {languageSites.map(ls => (
                            <SelectItem key={ls.id} value={ls.language_name}>
                              {ls.flag_emoji} {ls.language_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>How did they find us?</Label>
                      <Select value={newCustomer.referral_source} onValueChange={(val) => setNewCustomer({ ...newCustomer, referral_source: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select referral source" />
                        </SelectTrigger>
                        <SelectContent>
                          {referralSources.map(src => (
                            <SelectItem key={src} value={src}>{src}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Booking Source</Label>
                      <Select value={bookingSource} onValueChange={setBookingSource}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {b2cSources.map(src => (
                            <SelectItem key={src} value={src}>{src}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={newCustomer.newsletter_opt_in}
                      onCheckedChange={(checked) => setNewCustomer({ ...newCustomer, newsletter_opt_in: checked })}
                    />
                    <Label htmlFor="newsletter" className="cursor-pointer">Subscribe to newsletter</Label>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} style={{ backgroundColor: '#F17E00', color: '#FFFFFF' }} className="hover:bg-whi-hover">
                  Next: Select Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && bookingType === 'b2b' && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Partner & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Partner *</Label>
                <Select value={selectedPartner?.id || ''} onValueChange={(val) => {
                  const partner = partners.find(p => p.id === val);
                  setSelectedPartner(partner);
                  setSelectedPartnerContact(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.partner_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPartner && (
                <>
                  <div>
                    <Label>Partner Contact</Label>
                    <Select value={selectedPartnerContact?.id || ''} onValueChange={(val) => {
                      const contact = partnerContacts.find(pc => pc.id === val);
                      setSelectedPartnerContact(contact);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerContacts.map(pc => (
                          <SelectItem key={pc.id} value={pc.id}>
                            {pc.contact_name} ({pc.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Partner Reference Number</Label>
                    <Input
                      value={partnerReference}
                      onChange={(e) => setPartnerReference(e.target.value)}
                      placeholder="Partner's booking reference"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} style={{ backgroundColor: '#F17E00', color: '#FFFFFF' }} className="hover:bg-whi-hover">
                  Next: Select Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 - Tour & Dates */}
        {step === 3 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Tour & Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Filter by Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tour * {selectedRegion !== 'all' && <span className="text-xs text-slate-500">(sorted by duration)</span>}</Label>
                <Select value={selectedTour?.id || ''} onValueChange={(val) => {
                  const tour = tours.find(t => t.id === val);
                  setSelectedTour(tour);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tour" />
                  </SelectTrigger>
                  <SelectContent>
                    {tours.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {`${t.name} — €${Math.round(t.price_per_person_eur || 0)} · ${t.duration_days} days`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tours.length === 0 && selectedRegion !== 'all' && (
                  <p className="text-sm text-amber-600 mt-1">No tours available in this region</p>
                )}
              </div>

              {selectedTour && (
                <div className="p-4 border rounded-lg bg-slate-50">
                  <h3 className="font-semibold mb-2">{selectedTour.name}</h3>
                  <div className="text-sm space-y-1">
                    <p>Duration: {selectedTour.duration_days} days</p>
                    <p>Price per person: €{selectedTour.price_per_person_eur}</p>
                    {selectedTour.difficulty_level && (
                      <div className="flex items-center gap-2">
                        <span>Difficulty:</span>
                        <Badge>{selectedTour.difficulty_level}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>End Date (auto-calculated)</Label>
                  <Input
                    type="date"
                    disabled
                    value={endDate}
                    className="bg-slate-100 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <Label>Number of Guests *</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={numberOfGuests}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setNumberOfGuests(Math.min(50, Math.max(1, val)));
                  }}
                  required
                />
              </div>

              {tourOptions.length > 0 && (
                <div>
                  <Label className="mb-2 block">Optional Add-ons</Label>
                  <div className="space-y-2">
                    {tourOptions.map(opt => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`opt-${opt.id}`}
                          checked={selectedOptions.includes(opt.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOptions([...selectedOptions, opt.id]);
                            } else {
                              setSelectedOptions(selectedOptions.filter(id => id !== opt.id));
                            }
                          }}
                        />
                        <Label htmlFor={`opt-${opt.id}`} className="cursor-pointer flex-1">
                          {opt.name} - €{opt.price} {opt.pricing_type === 'per_guest' ? 'per person' : 'total'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border-2 rounded-lg bg-green-50 border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Price:</span>
                  <span className="text-2xl font-bold text-green-700">
                    €{totalPrice.toFixed(2)}
                  </span>
                </div>
                {bookingType === 'b2b' && partnerRateCards.length === 0 && selectedTour && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ No partner rate card found. Using B2C price.
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} style={{ backgroundColor: '#F17E00', color: '#FFFFFF' }} className="hover:bg-whi-hover">
                  Next: Guest Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 - Guest Details */}
        {step === 4 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Guest Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <GuestDetailsForm
                guests={guests}
                onChange={setGuests}
                numberOfGuests={numberOfGuests}
              />

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} style={{ backgroundColor: '#F17E00', color: '#FFFFFF' }} className="hover:bg-whi-hover">
                  Next: Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5 - Review & Submit */}
        {step === 5 && (
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Review Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Booking Type</h3>
                <p className="text-slate-600">
                  {bookingType === 'b2c' ? 'Direct Booking (B2C)' : 'Partner Booking (B2B)'}
                </p>
              </div>

              {bookingType === 'b2c' && (
                <div>
                  <h3 className="font-semibold mb-2">Customer</h3>
                  {selectedCustomer ? (
                    <div>
                      <p>{selectedCustomer.display_name}</p>
                      <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                    </div>
                  ) : (
                    <div>
                      <p>{newCustomer.first_name} {newCustomer.last_name}</p>
                      <p className="text-sm text-slate-600">{newCustomer.email}</p>
                    </div>
                  )}
                </div>
              )}

              {bookingType === 'b2b' && (
                <div>
                  <h3 className="font-semibold mb-2">Partner</h3>
                  <p>{selectedPartner?.partner_name}</p>
                  {selectedPartnerContact && (
                    <p className="text-sm text-slate-600">
                      Contact: {selectedPartnerContact.contact_name}
                    </p>
                  )}
                  {partnerReference && (
                    <p className="text-sm text-slate-600">
                      Ref: {partnerReference}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Tour Details</h3>
                <p>{selectedTour?.name}</p>
                <p className="text-sm text-slate-600">
                  {startDate} to {endDate}
                </p>
                <p className="text-sm text-slate-600">
                  {numberOfGuests} {numberOfGuests === 1 ? 'guest' : 'guests'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Guests</h3>
                <div className="space-y-2">
                  {guests.map((g, i) => (
                    <div key={i} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                      <p className="font-medium">
                        {i + 1}. {g.first_name} {g.last_name} {i === 0 && '(Lead)'}
                      </p>
                      <p className="text-slate-600">
                        DOB: {g.date_of_birth} • {g.room_type} room
                      </p>
                      {g.dietary_requirements && (
                        <p className="text-slate-600 text-xs">
                          Diet: {g.dietary_requirements}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Total Price</h3>
                <p className="text-2xl font-bold text-green-700">
                  €{totalPrice.toFixed(2)}
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createBookingMutation.isPending}
                  style={{ backgroundColor: '#F17E00', color: '#FFFFFF' }}
                  className="gap-2 hover:bg-whi-hover"
                >
                  {createBookingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Booking'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}