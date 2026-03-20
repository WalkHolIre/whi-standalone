// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createPageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, Star, Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function ProviderDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  const providerId = paramsId;
  const isEditMode = !!providerId;

  const [formData, setFormData] = useState({
    name: '',
    type: 'accommodation',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    county: '',
    postal_code: '',
    country: 'Ireland',
    latitude: null,
    longitude: null,
    website: '',
    image: '',
    services_offered: [],
    standard_rate_eur: 0,
    currency: 'EUR',
    payment_terms: '',
    capacity: 0,
    rating: 0,
    status: 'active',
    notes: '',
    language_spoken: [],
    preferred_booking_methods: ['email', 'whatsapp'],
  });

  const [newService, setNewService] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const { data } = await supabase.from('service_providers').select('*').match({ id: providerId });
      const providers = data || [];
      return providers[0] || null;
    },
    enabled: !!providerId,
  });

  useEffect(() => {
    if (provider) {
      setFormData(provider);
    }
  }, [provider]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditMode) {
        const response = await supabase.from('service_providers').update(data).eq('id', providerId).select().single();
        return response.data;
      } else {
        const response = await supabase.from('service_providers').insert(data).select().single();
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success(isEditMode ? 'Provider updated successfully' : 'Provider created successfully');
      router.push(createPageUrl('ServiceProviders'));
    },
    onError: (error) => {
      toast.error('Failed to save provider: ' + error.message);
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async (email) => {
      // TODO: Migrate to Supabase Edge Function
      console.warn('Function not yet migrated: SendEmail');
      throw new Error('SendEmail function not yet migrated to Supabase');
    },
    onSuccess: () => {
      toast.success('Test email sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send test email: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await supabase.from('service_providers').delete().eq('id', providerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success('Provider deleted successfully');
      router.push(createPageUrl('ServiceProviders'));
    },
    onError: (error) => {
      toast.error('Failed to delete provider: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this provider?')) {
      deleteMutation.mutate();
    }
  };

  const handleImageUpload = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      await supabase.storage.from('images').upload(filePath, file, { cacheControl: '3600', upsert: false });
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setFormData({ ...formData, image: publicUrl });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const toggleBookingMethod = (method) => {
    const methods = formData.preferred_booking_methods || [];
    const updated = methods.includes(method)
      ? methods.filter(m => m !== method)
      : [...methods, method];
    setFormData({ ...formData, preferred_booking_methods: updated });
  };

  const addService = () => {
    if (newService.trim()) {
      setFormData({
        ...formData,
        services_offered: [...(formData.services_offered || []), newService.trim()]
      });
      setNewService('');
    }
  };

  const removeService = (index) => {
    const updated = [...(formData.services_offered || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, services_offered: updated });
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setFormData({
        ...formData,
        language_spoken: [...(formData.language_spoken || []), newLanguage.trim()]
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (index) => {
    const updated = [...(formData.language_spoken || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, language_spoken: updated });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 bg-slate-50/50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(createPageUrl('ServiceProviders'))}
              className="bg-white border-slate-300 text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {isEditMode ? 'Edit Provider' : 'Add Provider'}
              </h1>
              <p className="text-slate-700 mt-1">
                {isEditMode ? 'Update provider details' : 'Add a new service provider'}
              </p>
            </div>
          </div>
          {isEditMode && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic & Contact */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="name" className="text-slate-900">Business Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-slate-900">Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accommodation">Accommodation</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="guide">Guide</SelectItem>
                          <SelectItem value="activity">Activity</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-slate-900">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_name" className="text-slate-900">Contact Person</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-900">Email</Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white/50 border-slate-300 text-slate-900"
                        />
                        {isEditMode && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => sendTestEmailMutation.mutate(formData.email)}
                            disabled={sendTestEmailMutation.isPending || !formData.email}
                            className="shrink-0"
                          >
                            {sendTestEmailMutation.isPending ? 'Sending...' : 'Send Test'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-900">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-slate-900">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Location</h3>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-900">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-slate-900">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="county" className="text-slate-900">County</Label>
                      <Input
                        id="county"
                        value={formData.county || ''}
                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code" className="text-slate-900">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-slate-900">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="latitude" className="text-slate-900">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude" className="text-slate-900">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h3>

                  <div className="space-y-2">
                    <Label className="text-slate-900">Image</Label>
                    {formData.image && (
                      <div
                        className="relative w-fit cursor-pointer group"
                        onClick={() => document.getElementById('image-upload').click()}
                      >
                        <img
                          src={formData.image}
                          alt="Provider"
                          className="max-w-[300px] rounded-lg border-2 border-slate-300 group-hover:border-slate-500 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm">
                          Click to change
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        id="image"
                        value={formData.image || ''}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="bg-white/50 border-slate-300 text-slate-900"
                        placeholder="https://... or upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload').click()}
                        className="shrink-0"
                      >
                        Upload
                      </Button>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-900">Services Offered</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.services_offered || []).map((service, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-md px-2 py-1">
                          <span className="text-sm text-slate-900">{service}</span>
                          <button
                            type="button"
                            onClick={() => removeService(idx)}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                        className="bg-white/50 border-slate-300 text-slate-900"
                        placeholder="Type service and press Enter"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addService}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-900">Languages Spoken</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.language_spoken || []).map((lang, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-md px-2 py-1">
                          <span className="text-sm text-slate-900">{lang}</span>
                          <button
                            type="button"
                            onClick={() => removeLanguage(idx)}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newLanguage}
                        onChange={(e) => setNewLanguage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                        className="bg-white border-slate-300 text-slate-900"
                        placeholder="Type language and press Enter"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addLanguage}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-slate-900">Internal Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-white border-slate-300 text-slate-900 min-h-20"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Business Details */}
            <div className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="rate" className="text-slate-900">Standard Rate</Label>
                    <div className="flex gap-2">
                      <Input
                        id="rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.standard_rate_eur || ''}
                        onChange={(e) => setFormData({ ...formData, standard_rate_eur: parseFloat(e.target.value) || 0 })}
                        className="bg-white border-slate-300 text-slate-900"
                      />
                      <Input
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="bg-white border-slate-300 text-slate-900 w-20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms" className="text-slate-900">Payment Terms</Label>
                    <Input
                      id="payment_terms"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-slate-900">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="0"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900">Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          className="transition-colors"
                        >
                          <Star
                            className={`w-6 h-6 ${star <= (formData.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-300'
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-900">Preferred Booking Methods</Label>
                    <div className="space-y-2">
                      {['email', 'whatsapp', 'sms', 'website', 'booking.com', 'telephone'].map((method) => (
                        <div key={method} className="flex items-center gap-2">
                          <Checkbox
                            id={`booking-${method}`}
                            checked={(formData.preferred_booking_methods || []).includes(method)}
                            onCheckedChange={() => toggleBookingMethod(method)}
                          />
                          <label
                            htmlFor={`booking-${method}`}
                            className="text-sm text-slate-900 cursor-pointer capitalize"
                          >
                            {method}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full gap-2 bg-slate-700 text-white hover:bg-slate-800"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(createPageUrl('ServiceProviders'))}
                  className="w-full bg-white border-slate-300 text-slate-900"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}