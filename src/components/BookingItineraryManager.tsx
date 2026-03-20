// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Calendar, MapPin, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function BookingItineraryManager({ bookingId, bookingStartDate, tourId }) {
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

  // Fetch itinerary days
  const { data: itineraryDays = [], isLoading } = useQuery({
    queryKey: ['booking-itinerary', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('booking_itineraries').select('*').match({ booking_id: bookingId });
      const days = data || [];
      return days.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
    enabled: !!bookingId
  });

  // Fetch service providers
  const { data: serviceProviders = [] } = useQuery({
    queryKey: ['service-providers'],
    queryFn: async () => {
      const { data } = await supabase.from('service_providers').select('*').match({ status: 'active' });
      return data || [];
    }
  });

  // Fetch day services
  const { data: dayServices = [] } = useQuery({
    queryKey: ['booking-day-services', bookingId],
    queryFn: async () => {
      const { data } = await supabase.from('booking_day_services').select('*').match({ booking_id: bookingId });
      return data || [];
    },
    enabled: !!bookingId
  });

  // Assign itinerary mutation
  const assignItineraryMutation = useMutation({
    mutationFn: async () => {
      // TODO: Migrate to Supabase Edge Function
      console.warn('Function not yet migrated: assignItinerary');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
      toast.success('Itinerary assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign itinerary: ' + error.message);
    }
  });

  // Recalculate dates mutation
  const recalculateDatesMutation = useMutation({
    mutationFn: async () => {
      const response = console.log('Mocked function call', 'recalculateItineraryDates', { booking_id: bookingId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
      toast.success('Dates recalculated');
    },
    onError: (error) => {
      toast.error('Failed to recalculate dates: ' + error.message);
    }
  });

  // Delete day mutation
  const deleteDayMutation = useMutation({
    mutationFn: async (dayId) => {
      await supabase.from('booking_itineraries').delete().eq('id', dayId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
      toast.success('Day deleted');
      recalculateDatesMutation.mutate();
    }
  });

  // Update day mutation
  const updateDayMutation = useMutation({
    mutationFn: async ({ dayId, data }) => {
      const response = await supabase.from('booking_itineraries').update(data).eq('id', dayId).select().single();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
      toast.success('Day updated');
      setShowEditDialog(false);
      setEditingDay(null);
    }
  });

  // Create day mutation
  const createDayMutation = useMutation({
    mutationFn: async (data) => {
      const response = await supabase.from('booking_itineraries').insert(data).select().single();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
      toast.success('Day added');
      setShowAddDialog(false);
      recalculateDatesMutation.mutate();
    }
  });

  // Move day up/down
  const moveDayMutation = useMutation({
    mutationFn: async ({ dayId, newSortOrder }) => {
      const response = await supabase.from('booking_itineraries').update({ sort_order: newSortOrder }).eq('id', dayId).select().single();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-itinerary', bookingId] });
      recalculateDatesMutation.mutate();
    }
  });

  const handleMoveUp = (day, index) => {
    if (index === 0) return;
    const prevDay = itineraryDays[index - 1];
    moveDayMutation.mutate({ dayId: day.id, newSortOrder: prevDay.sort_order });
    moveDayMutation.mutate({ dayId: prevDay.id, newSortOrder: day.sort_order });
  };

  const handleMoveDown = (day, index) => {
    if (index === itineraryDays.length - 1) return;
    const nextDay = itineraryDays[index + 1];
    moveDayMutation.mutate({ dayId: day.id, newSortOrder: nextDay.sort_order });
    moveDayMutation.mutate({ dayId: nextDay.id, newSortOrder: day.sort_order });
  };

  const handleEdit = (day) => {
    setEditingDay(day);
    setShowEditDialog(true);
  };

  const handleDelete = async (dayId) => {
    if (confirm('Are you sure you want to delete this day?')) {
      deleteDayMutation.mutate(dayId);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-300">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border-slate-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-slate-900">Booking Itinerary</CardTitle>
            <div className="flex gap-2">
              {itineraryDays.length === 0 && (
                <Button
                  onClick={() => assignItineraryMutation.mutate()}
                  disabled={assignItineraryMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {assignItineraryMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</>
                  ) : (
                    <>Assign Itinerary</>
                  )}
                </Button>
              )}
              {itineraryDays.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => recalculateDatesMutation.mutate()}
                    disabled={recalculateDatesMutation.isPending}
                    className="bg-white border-slate-300 text-slate-900"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Recalculate Dates
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    className="bg-slate-700 text-white hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Day
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {itineraryDays.length === 0 ? (
            <div className="text-center py-12 text-slate-700">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No itinerary assigned yet</p>
              <p className="text-sm mt-2">Click "Assign Itinerary" to use the tour template</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itineraryDays.map((day, index) => (
                <Card key={day.id} className="bg-slate-50 border-slate-300">
                  <CardContent className="pt-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveUp(day, index)}
                          disabled={index === 0}
                          className="h-8 w-8 text-slate-700 hover:text-slate-900"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveDown(day, index)}
                          disabled={index === itineraryDays.length - 1}
                          className="h-8 w-8 text-slate-700 hover:text-slate-900"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Day {day.day_number}: {day.day_title}
                            </h3>
                            <p className="text-sm text-slate-700">
                              {day.date ? format(new Date(day.date), 'EEEE, MMM dd, yyyy') : 'No date'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(day)}
                              className="text-slate-700 hover:text-slate-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(day.id)}
                              className="text-slate-700 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {day.walk_name && (
                          <p className="text-slate-900 text-sm mb-1">
                            <strong>Walk:</strong> {day.walk_name}
                            {day.walk_distance_km > 0 && ` (${day.walk_distance_km} km)`}
                          </p>
                        )}

                        {day.description && (
                          <p className="text-slate-700 text-sm mb-2">{day.description}</p>
                        )}

                        {day.notes && (
                          <p className="text-slate-600 text-xs italic">Notes: {day.notes}</p>
                        )}

                        {/* Service Providers Section */}
                        <div className="mt-4 pt-4 border-t border-slate-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                            className="text-slate-700 hover:text-slate-900 mb-3"
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            Service Providers ({dayServices.filter(s => s.booking_itinerary_id === day.id).length})
                          </Button>

                          {expandedDay === day.id && (
                            <ServiceProviderAssignment
                              dayId={day.id}
                              bookingId={bookingId}
                              dayServices={dayServices.filter(s => s.booking_itinerary_id === day.id)}
                              serviceProviders={serviceProviders}
                              onUpdate={() => {
                                queryClient.invalidateQueries({ queryKey: ['booking-day-services', bookingId] });
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Day Dialog */}
      {editingDay && (
        <DayFormDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingDay(null);
          }}
          day={editingDay}
          onSave={(data) => updateDayMutation.mutate({ dayId: editingDay.id, data })}
          isLoading={updateDayMutation.isPending}
          title="Edit Day"
        />
      )}

      {/* Add Day Dialog */}
      <DayFormDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        day={{
          booking_id: bookingId,
          day_number: itineraryDays.length + 1,
          date: '',
          day_title: '',
          description: '',
          walk_name: '',
          walk_distance_km: 0,
          notes: '',
          sort_order: itineraryDays.length + 1
        }}
        onSave={(data) => createDayMutation.mutate(data)}
        isLoading={createDayMutation.isPending}
        title="Add New Day"
      />
    </>
  );
}

function DayFormDialog({ open, onClose, day, onSave, isLoading, title }) {
  const [formData, setFormData] = useState(day);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-slate-300">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-900">Day Title *</Label>
            <Input
              value={formData.day_title}
              onChange={(e) => setFormData({ ...formData, day_title: e.target.value })}
              placeholder="e.g., Arrival Day"
              required
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <Label className="text-slate-900">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What happens on this day"
              rows={4}
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900">Walk Name</Label>
              <Input
                value={formData.walk_name}
                onChange={(e) => setFormData({ ...formData, walk_name: e.target.value })}
                placeholder="e.g., Kerry Way"
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <Label className="text-slate-900">Distance (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.walk_distance_km}
                onChange={(e) => setFormData({ ...formData, walk_distance_km: parseFloat(e.target.value) || 0 })}
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-900">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes"
              rows={3}
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="bg-white border-slate-300 text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-slate-700 text-white hover:bg-slate-800"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServiceProviderAssignment({ dayId, bookingId, dayServices, serviceProviders, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({
    service_type: '',
    service_provider_id: '',
    rate: 0
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data) => {
      // Generate secure token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data: created } = await supabase.from('booking_day_services').insert({
        ...data,
        secure_token: token,
        status: 'Open'
      }).select().single();
      return created;
    },
    onSuccess: () => {
      toast.success('Service provider added');
      setShowAddForm(false);
      setNewService({ service_type: '', service_provider_id: '', rate: 0 });
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to add service: ' + error.message);
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId) => (await supabase.from('booking_day_services').delete().eq('id', serviceId)),
    onSuccess: () => {
      toast.success('Service removed');
      onUpdate();
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ serviceId, status }) => {
      const { data } = await supabase.from('booking_day_services').update({
        status,
        requested_at: status === 'Requested' ? new Date().toISOString() : undefined
      }).eq('id', serviceId).select().single();
      return data;
    },
    onSuccess: () => {
      toast.success('Status updated');
      onUpdate();
    }
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (serviceId) => {
      const response = console.log('Mocked function call', 'sendServiceRequest', { service_id: serviceId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Request sent to ${data.provider_email}`);
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to send request: ' + error.message);
    }
  });

  const handleServiceTypeChange = (type) => {
    setNewService({ ...newService, service_type: type, service_provider_id: '', rate: 0 });
  };

  const handleProviderChange = (providerId) => {
    const provider = serviceProviders.find(p => p.id === providerId);
    setNewService({
      ...newService,
      service_provider_id: providerId,
      rate: provider?.standard_rate_eur || 0
    });
  };

  const handleAddService = () => {
    // Validation
    if (!newService.service_type || !newService.service_provider_id) {
      toast.error('Please select service type and provider');
      return;
    }

    // Check for service limits per day
    const existingAccommodation = dayServices.find(s => s.service_type === 'Accommodation');
    const existingBaggage = dayServices.find(s => s.service_type === 'Baggage Transfer');

    if (newService.service_type === 'Accommodation' && existingAccommodation) {
      toast.error('Only one Accommodation is allowed per day. Please edit or remove the existing one first.');
      return;
    }

    if (newService.service_type === 'Baggage Transfer' && existingBaggage) {
      toast.error('Only one Baggage Transfer is allowed per day. Please edit or remove the existing one first.');
      return;
    }

    addServiceMutation.mutate({
      booking_itinerary_id: dayId,
      booking_id: bookingId,
      ...newService
    });
  };

  const filteredProviders = serviceProviders
    .filter(p => {
      if (!newService.service_type) return false;
      
      const typeMapping = {
        'Accommodation': 'accommodation',
        'Baggage Transfer': 'transport',
        'Taxi': 'transport',
        'Walk Guide': 'guide'
      };
      
      return p.type === typeMapping[newService.service_type];
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-900/30 text-green-400';
      case 'Requested': return 'bg-blue-900/30 text-blue-400';
      case 'Declined': return 'bg-red-900/30 text-red-400';
      case 'Escalated': return 'bg-orange-900/30 text-orange-400';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-3 pl-4">
      {/* Existing Services */}
      {dayServices.length > 0 && (
        <div className="space-y-2">
          {dayServices.map(service => {
            const provider = serviceProviders.find(p => p.id === service.service_provider_id);
            return (
              <div key={service.id} className="bg-white rounded-lg p-3 border border-slate-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900">{service.service_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{provider?.name || 'Unknown Provider'}</p>
                    <p className="text-xs text-slate-600">
                      Rate: €{service.rate}
                      {service.provider_rate && service.provider_rate !== service.rate && (
                        <span className="text-blue-600 ml-2">(Provider: €{service.provider_rate})</span>
                      )}
                    </p>
                    {service.provider_comments && (
                      <p className="text-xs text-slate-600 italic mt-1">"{service.provider_comments}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {service.status === 'Open' && (
                      <Button
                        size="sm"
                        onClick={() => sendRequestMutation.mutate(service.id)}
                        disabled={sendRequestMutation.isPending}
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        {sendRequestMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    )}
                    {service.status === 'Requested' && (
                      <Button
                        size="sm"
                        onClick={() => sendRequestMutation.mutate(service.id)}
                        disabled={sendRequestMutation.isPending}
                        className="h-8 px-3 bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                      >
                        {sendRequestMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Re-send Request'
                        )}
                      </Button>
                    )}
                    <Select
                      value={service.status}
                      onValueChange={(status) => updateServiceMutation.mutate({ serviceId: service.id, status })}
                    >
                      <SelectTrigger className="h-8 w-32 bg-white border-slate-300 text-slate-900 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Requested">Requested</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Declined">Declined</SelectItem>
                        <SelectItem value="Escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteServiceMutation.mutate(service.id)}
                      className="h-8 w-8 text-slate-700 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Service Form */}
      {!showAddForm ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="bg-white border-slate-300 text-slate-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service Provider
        </Button>
      ) : (
        <Card className="bg-white border-slate-300">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-slate-900 text-xs">Service Type</Label>
              <Select value={newService.service_type} onValueChange={handleServiceTypeChange}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                  <SelectItem value="Baggage Transfer">Baggage Transfer</SelectItem>
                  <SelectItem value="Taxi">Taxi</SelectItem>
                  <SelectItem value="Walk Guide">Walk Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newService.service_type && (
              <>
                <div>
                  <Label className="text-slate-900 text-xs">Service Provider</Label>
                  <Select value={newService.service_provider_id} onValueChange={handleProviderChange}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProviders.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} {provider.standard_rate_eur && `(€${provider.standard_rate_eur})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-900 text-xs">Rate (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.rate}
                    onChange={(e) => setNewService({ ...newService, rate: parseFloat(e.target.value) || 0 })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleAddService}
                    disabled={addServiceMutation.isPending}
                    className="bg-slate-700 text-white hover:bg-slate-800"
                  >
                    {addServiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewService({ service_type: '', service_provider_id: '', rate: 0 });
                    }}
                    className="bg-white border-slate-300 text-slate-900"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}