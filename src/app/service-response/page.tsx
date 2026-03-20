// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceResponse() {
  
  const [paramsId, setParamsId] = React.useState('');
  const [urlParams, setUrlParams] = React.useState(new URLSearchParams(''));

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setParamsId(params.get('id'));
    setUrlParams(params);
  }, []);

  const token = urlParams.get('token');
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    provider_rate: 0,
    provider_comments: '',
    action: '' // 'accept' or 'decline'
  });

  // Fetch service request by token - uses backend function (no auth required)
  const { data: serviceData, isLoading, error } = useQuery({
    queryKey: ['service-request', token],
    queryFn: async () => {
      // TODO: Migrate to Supabase Edge Function
      console.warn('TODO: Migrate base44.functions.invoke(getServiceRequestByToken) to Supabase Edge Function');
      // const response = await supabase.functions.invoke('getServiceRequestByToken', {
      //   body: { token }
      // });
      // if (!response.data?.success) {
      //   const err = new Error(response.data?.error || 'Invalid or expired token');
      //   if (response.data?.expired) err.expired = true;
      //   throw err;
      // }
      // return response.data;
      return null;
    },
    enabled: !!token,
    retry: false
  });

  useEffect(() => {
    if (serviceData?.service) {
      setFormData({
        provider_rate: serviceData.service.provider_rate || serviceData.service.rate,
        provider_comments: serviceData.service.provider_comments || '',
        action: ''
      });
    }
  }, [serviceData]);

  const submitResponseMutation = useMutation({
    mutationFn: async (data) => {
      // TODO: Migrate to Supabase Edge Function
      console.warn('TODO: Migrate base44.functions.invoke(submitServiceResponse) to Supabase Edge Function');
      // const response = await supabase.functions.invoke('submitServiceResponse', {
      //   body: data
      // });
      // return response.data;
      return null;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      alert('Failed to submit response: ' + error.message);
    }
  });

  const handleSubmit = (action) => {
    if (action === 'accept' && !formData.provider_rate) {
      alert('Please enter a rate');
      return;
    }

    submitResponseMutation.mutate({
      token,
      action,
      provider_rate: parseFloat(formData.provider_rate),
      provider_comments: formData.provider_comments
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !serviceData) {
    const isExpired = error?.response?.status === 410;
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-6 h-6" />
              {isExpired ? 'Link Expired' : 'Invalid or Expired Link'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              {isExpired
                ? 'This service request link has expired (72 hours). Please contact Walking Holiday Ireland directly if you need assistance.'
                : 'This service request link is invalid or has expired. Please contact Walking Holiday Ireland if you need assistance.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { service, booking, day, provider, guests } = serviceData;

  // Check if already responded
  if (service.status === 'Confirmed' || service.status === 'Declined') {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Already Responded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              You have already responded to this service request.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p><strong>Status:</strong> {service.status}</p>
              {service.provider_rate && <p><strong>Your Rate:</strong> €{service.provider_rate}</p>}
              {service.provider_comments && <p><strong>Your Comments:</strong> {service.provider_comments}</p>}
              {service.responded_at && (
                <p className="text-sm text-slate-500 mt-2">
                  Responded: {format(new Date(service.responded_at), 'PPp')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-green-200">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Response Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Thank you for your response! Walking Holiday Ireland has been notified.
            </p>
            <p className="text-sm text-slate-500">
              You can now close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Service Request</h1>
          <p className="text-slate-600">Walking Holiday Ireland</p>
        </div>

        {/* Request Details */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600 text-sm">Booking Reference</Label>
                <p className="font-medium">{booking.booking_reference || booking.id}</p>
              </div>
              <div>
                <Label className="text-slate-600 text-sm">Date</Label>
                <p className="font-medium">{day.date ? format(new Date(day.date), 'EEEE, MMM dd, yyyy') : 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600 text-sm">Service Type</Label>
                <p className="font-medium">{service.service_type}</p>
              </div>
              <div>
                <Label className="text-slate-600 text-sm">Number of Guests</Label>
                <p className="font-medium">{booking.number_of_walkers}</p>
              </div>
            </div>

            {guests.length > 0 && (
              <div>
                <Label className="text-slate-600 text-sm">Guest Names</Label>
                <p className="font-medium">{guests.map(g => g.guest_name).join(', ')}</p>
              </div>
            )}

            {day.walk_name && (
              <div>
                <Label className="text-slate-600 text-sm">Walk Details</Label>
                <p className="font-medium">{day.walk_name} ({day.walk_distance_km} km)</p>
              </div>
            )}

            {day.day_title && (
              <div>
                <Label className="text-slate-600 text-sm">Day Description</Label>
                <p className="font-medium">{day.day_title}</p>
              </div>
            )}

            {booking.special_requests && (
              <div>
                <Label className="text-slate-600 text-sm">Special Requests</Label>
                <p className="text-slate-700 bg-amber-50 p-3 rounded">{booking.special_requests}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Form */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
          <CardHeader>
            <CardTitle>Your Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Your Rate (EUR) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.provider_rate}
                onChange={(e) => setFormData({ ...formData, provider_rate: e.target.value })}
                placeholder="Enter your rate"
                className="mt-1"
              />
              <p className="text-sm text-slate-500 mt-1">
                Proposed rate: €{service.rate}
              </p>
            </div>

            <div>
              <Label>Comments (Optional)</Label>
              <Textarea
                value={formData.provider_comments}
                onChange={(e) => setFormData({ ...formData, provider_comments: e.target.value })}
                placeholder="Any comments or additional information"
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => handleSubmit('accept')}
                disabled={submitResponseMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitResponseMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Accept Request</>
                )}
              </Button>

              <Button
                onClick={() => handleSubmit('decline')}
                disabled={submitResponseMutation.isPending}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}