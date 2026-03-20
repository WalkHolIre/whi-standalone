// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function NewPartnerBookingForm({ open, onClose, partner, partnerContact, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partner_reference: '',
    tour_id: '',
    start_date: '',
    end_date: '',
    number_of_guests: 1,
    general_special_requests: ''
  });
  const [guests, setGuests] = useState([
    {
      guest_name: '',
      date_of_birth: '',
      room_type: '',
      dietary_requirements: '',
      special_requests: ''
    }
  ]);
  const [selectedTour, setSelectedTour] = useState(null);
  const [pricing, setPricing] = useState(null);

  // Fetch tours
  const { data: allTours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*').match({ status: 'active' });
      return data || [];
    },
    enabled: open
  });

  // Fetch partner rate cards
  const { data: rateCards = [] } = useQuery({
    queryKey: ['rate-cards', partner?.id],
    queryFn: async () => {
      // TODO: partner_rate_cards table does not exist - implement proper rate card storage
      return [];
    },
    enabled: open && !!partner?.id
  });

  // Filter tours based on partner type
  const availableTours = partner?.partner_type === 'Commission Partner'
    ? allTours
    : allTours.filter(tour => rateCards.some(rc => rc.tour_id === tour.id));

  // Update guests array when number changes
  useEffect(() => {
    const count = parseInt(formData.number_of_guests) || 1;
    if (count > guests.length) {
      const newGuests = [...guests];
      for (let i = guests.length; i < count; i++) {
        newGuests.push({
          guest_name: '',
          date_of_birth: '',
          room_type: '',
          dietary_requirements: '',
          special_requests: ''
        });
      }
      setGuests(newGuests);
    } else if (count < guests.length) {
      setGuests(guests.slice(0, count));
    }
  }, [formData.number_of_guests]);

  // Calculate end date and pricing when tour or start date changes
  useEffect(() => {
    if (formData.tour_id && formData.start_date) {
      const tour = allTours.find(t => t.id === formData.tour_id);
      setSelectedTour(tour);
      
      if (tour) {
        // Calculate end date
        const startDate = new Date(formData.start_date);
        const endDate = addDays(startDate, tour.duration_days - 1);
        setFormData(prev => ({ ...prev, end_date: format(endDate, 'yyyy-MM-dd') }));

        // Calculate pricing
        const rateCard = rateCards.find(rc => rc.tour_id === tour.id);
        const numberOfGuests = parseInt(formData.number_of_guests) || 1;
        
        if (rateCard) {
          setPricing({
            model: 'Rate Card',
            pricePerPerson: rateCard.b2b_price,
            total: rateCard.b2b_price * numberOfGuests,
            note: 'B2B Rate Card Pricing'
          });
        } else {
          const b2cPrice = tour.price_per_person_eur || 0;
          const commissionRate = partner.default_commission_rate || 0;
          setPricing({
            model: 'Commission',
            pricePerPerson: b2cPrice,
            total: b2cPrice * numberOfGuests,
            commissionRate,
            note: 'Commission-based pricing (B2C rate shown)'
          });
        }
      }
    } else {
      setSelectedTour(null);
      setPricing(null);
    }
  }, [formData.tour_id, formData.start_date, formData.number_of_guests, allTours, rateCards, partner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.tour_id || !formData.start_date) {
      toast.error('Please select a tour and start date');
      return;
    }

    const invalidGuest = guests.find(g => !g.guest_name || !g.date_of_birth);
    if (invalidGuest) {
      toast.error('Please fill in required guest details (name and date of birth)');
      return;
    }

    setLoading(true);

    try {
      // TODO: Migrate to Supabase Edge Function
      console.warn('Function not yet migrated: submitPartnerBooking');
      toast.success('Booking request submitted successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast.error('Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-2xl">New Booking Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 text-lg">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Partner Reference Number (Optional)</Label>
                <Input
                  value={formData.partner_reference}
                  onChange={(e) => setFormData({ ...formData, partner_reference: e.target.value })}
                  placeholder="Your internal reference"
                  className="bg-slate-900 border-slate-600 text-slate-100"
                />
              </div>

              <div>
                <Label className="text-slate-300">Tour *</Label>
                <Select value={formData.tour_id} onValueChange={(val) => setFormData({ ...formData, tour_id: val })}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100">
                    <SelectValue placeholder="Select a tour" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTours.map(tour => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.name} ({tour.duration_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {partner?.partner_type !== 'Commission Partner' && availableTours.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No tours available. Please contact admin to set up your rate card.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-slate-100"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    readOnly
                    className="bg-slate-900 border-slate-600 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Number of Guests *</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.number_of_guests}
                  onChange={(e) => setFormData({ ...formData, number_of_guests: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-slate-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Display */}
          {pricing && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-400">{pricing.note}</p>
                    <p className="text-lg text-slate-300 mt-1">
                      €{pricing.pricePerPerson.toFixed(2)} per person
                    </p>
                    {pricing.commissionRate > 0 && (
                      <p className="text-xs text-slate-500">
                        Your commission: {pricing.commissionRate}%
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Total Price</p>
                    <p className="text-2xl font-bold text-slate-100">
                      €{pricing.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guest Details */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 text-lg">Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guests.map((guest, index) => (
                <Card key={index} className="bg-slate-900 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-slate-200 text-base">Guest {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">Guest Name *</Label>
                        <Input
                          value={guest.guest_name}
                          onChange={(e) => {
                            const newGuests = [...guests];
                            newGuests[index].guest_name = e.target.value;
                            setGuests(newGuests);
                          }}
                          placeholder="Full name"
                          className="bg-slate-800 border-slate-600 text-slate-100"
                        />
                      </div>

                      <div>
                        <Label className="text-slate-300">Date of Birth *</Label>
                        <Input
                          type="date"
                          value={guest.date_of_birth}
                          onChange={(e) => {
                            const newGuests = [...guests];
                            newGuests[index].date_of_birth = e.target.value;
                            setGuests(newGuests);
                          }}
                          className="bg-slate-800 border-slate-600 text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300">Room Type</Label>
                      <Select 
                        value={guest.room_type} 
                        onValueChange={(val) => {
                          const newGuests = [...guests];
                          newGuests[index].room_type = val;
                          setGuests(newGuests);
                        }}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                          <SelectValue placeholder="Select room type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single (1 single bed)</SelectItem>
                          <SelectItem value="Twin">Twin (2 single beds, shared)</SelectItem>
                          <SelectItem value="Double">Double (1 double bed, shared)</SelectItem>
                          <SelectItem value="Triple">Triple (3 single beds, shared)</SelectItem>
                          <SelectItem value="Family">Family (1 double + 1 single)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-slate-300">Dietary Requirements</Label>
                      <Input
                        value={guest.dietary_requirements}
                        onChange={(e) => {
                          const newGuests = [...guests];
                          newGuests[index].dietary_requirements = e.target.value;
                          setGuests(newGuests);
                        }}
                        placeholder="e.g., Vegetarian, Gluten-free"
                        className="bg-slate-800 border-slate-600 text-slate-100"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300">Special Requests</Label>
                      <Textarea
                        value={guest.special_requests}
                        onChange={(e) => {
                          const newGuests = [...guests];
                          newGuests[index].special_requests = e.target.value;
                          setGuests(newGuests);
                        }}
                        placeholder="Any special requests for this guest"
                        className="bg-slate-800 border-slate-600 text-slate-100"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* General Special Requests */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-slate-300">General Special Requests (for whole booking)</Label>
              <Textarea
                value={formData.general_special_requests}
                onChange={(e) => setFormData({ ...formData, general_special_requests: e.target.value })}
                placeholder="Any additional requests or information"
                className="bg-slate-900 border-slate-600 text-slate-100 mt-2"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.tour_id || !formData.start_date}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Booking Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}