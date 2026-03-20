// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Mail, Phone, Star, Plus, X,
  Trash2, ExternalLink, FileText,
  ChevronRight, Calendar, Edit2, Save, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CustomerProfile() {
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = React.useState('');
  React.useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  const customerId = paramsId;

  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').match({ id: customerId });
      const results = data || [];
      return results[0] || null;
    },
    enabled: !!customerId
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['customerBookings', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*').match({ customer_id: customerId });
      return data || [];
    },
    enabled: !!customerId
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['customerNotes', customerId],
    queryFn: async () => {
      // TODO: customer_notes table does not exist - implement proper notes storage
      return [];
    },
    enabled: !!customerId
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['customerActivities', customerId],
    queryFn: async () => {
      // TODO: customer_activities table does not exist - implement proper activity logging
      return [];
    },
    enabled: !!customerId
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('customers').update(data).eq('id', customerId).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      toast.success('Customer updated');
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      // TODO: customer_notes table does not exist - implement proper notes storage
      toast.error('Note storage not yet implemented');
      throw new Error('Note storage not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes', customerId] });
      setNewNote('');
      toast.success('Note added');
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      return await supabase.from('customers').delete().eq('id', customerId);
    },
    onSuccess: () => {
      toast.success('Customer deleted');
      window.location.href = createPageUrl('CustomersIndex');
    }
  });

  const handleFieldEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleFieldSave = () => {
    if (editingField) {
      updateCustomerMutation.mutate({ [editingField]: editValue });
      setEditingField(null);
    }
  };

  const handleStarClick = (rating) => {
    // TODO: star_rating field does not exist in customers table
    toast.error('Rating feature not yet implemented');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !customer.tags?.includes(newTag.trim())) {
      updateCustomerMutation.mutate({ tags: [...(customer.tags || []), newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    updateCustomerMutation.mutate({ tags: customer.tags.filter(t => t !== tag) });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate({
        customer_id: customerId,
        note_text: newNote,
        author_name: user?.full_name || user?.email || 'Unknown',
        author_email: user?.email || ''
      });
    }
  };

  const handleDelete = () => {
    if (deleteConfirmText === customer?.display_name) {
      deleteCustomerMutation.mutate();
    } else {
      toast.error('Name does not match');
    }
  };

  const lifetimeStats = useMemo(() => {
    const totalBookings = bookings.length;
    const totalValue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const outstanding = bookings.reduce((sum, b) => sum + (b.balance_due || 0), 0);
    return { totalBookings, totalValue, outstanding };
  }, [bookings]);

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-600">Loading customer...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    const parts = (name || '').split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0]?.[0] || 'U').toUpperCase();
  };

  const EditableField = ({ label, field, value, type = 'text', locked = false, options = null }) => {
    const isEditing = editingField === field;

    return (
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">{label}</Label>
        {isEditing && !locked ? (
          <div className="flex gap-2">
            {type === 'select' && options ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === 'textarea' ? (
              <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} />
            ) : (
              <Input type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            )}
            <Button size="sm" onClick={handleFieldSave} className="btn-whi-primary">Save</Button>
            <Button size="sm" onClick={() => setEditingField(null)} className="btn-whi-outline">Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <span className="text-sm text-slate-900">{value || '—'}</span>
            {!locked && (
              <Button
                size="icon"
                className="btn-whi-ghost w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleFieldEdit(field, value)}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const sortedNotes = [...notes].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="min-h-screen bg-slate-50/50 transition-colors">
      {/* Breadcrumb */}
      <div className="bg-white/70 backdrop-blur-md text-slate-900 px-8 py-3 border-b border-slate-200/60 relative z-10 shadow-sm">
        <div className="flex items-center gap-2 text-m text-slate-600">
          <Link href={createPageUrl('CustomersIndex')} className="text-whi-purple hover:text-whi">Customers</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{customer.display_name}</span>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* ACTION BUTTONS ROW */}
        <div className="flex justify-end items-center gap-4">
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-whi-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Customer
          </Button>
        </div>

        {/* ROW 1: Combined Customer Info Card */}
        <Card className="col-span-10 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-whi-dark">{customer.display_name}</h2>
                <Button
                  size="sm"
                  className={`mt-2 ${customer.type === 'individual' ? 'btn-whi-primary' : 'btn-whi-secondary'}`}
                  disabled
                >
                  {customer.type === 'individual' ? 'B2C' : 'B2B / Trade Partner'}
                </Button>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) =>
                  <Star
                    key={rating}
                    className={`w-4 h-4 cursor-pointer transition-colors ${rating <= (customer.star_rating || 0) ?
                      'fill-whi text-whi' :
                      'text-slate-300 hover:text-slate-400'}`}
                    onClick={() => handleStarClick(rating)} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* LEFT - Contact Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-whi-dark">Contact Information</h3>
                <EditableField label="First Name" field="first_name" value={customer.first_name} />
                <EditableField label="Last Name" field="last_name" value={customer.last_name} />
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Email</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-900">{customer.email || '—'}</span>
                    {customer.email && (
                      <a href={`mailto:${customer.email}`} className="text-whi-purple hover:underline">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Phone</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-900">{customer.phone || '—'}</span>
                    {customer.phone && (
                      <a href={`tel:${customer.phone}`} className="text-whi-purple hover:underline">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <EditableField label="Nationality / Country" field="nationality" value={customer.nationality} />
                <EditableField label="Country" field="billing_country" value={customer.billing_country} />
                <EditableField label="Address" field="billing_address" value={customer.billing_address} type="textarea" />
                <EditableField label="City" field="billing_city" value={customer.billing_city} />
                <EditableField label="Postal Code" field="billing_postal" value={customer.billing_postal} />
              </div>

              {/* RIGHT - Tags */}
              <div className="pt-0 border-t-0 lg:border-t-0">
                <h3 className="text-lg font-semibold text-whi-dark mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {customer.tags?.map(tag => (
                    <Badge key={tag} className="bg-whi-mauve-subtle text-whi-mauve border-0 cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} />
                  <Button size="icon" onClick={handleAddTag} className="btn-whi-primary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Info - Bottom of Card */}
            <div className="border-t border-slate-200 pt-4 mt-4 grid grid-cols-2 gap-8">
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Created:</span>
                  <span className="text-slate-800">{format(new Date(customer.created_date), 'MMM dd, yyyy')}</span>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Activity:</span>
                  <span className="text-slate-800">{customer.last_activity_date ? format(new Date(customer.last_activity_date), 'MMM dd, yyyy') : '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROW 2: Notes + Bookings */}
        <div className="grid grid-cols-10 gap-6">
          {/* LEFT 50% - Notes */}
          <Card className="col-span-10 lg:col-span-5 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-whi-dark flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Notes
              </CardTitle>
              <Button size="sm" onClick={() => { }} className="btn-whi-primary">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedNotes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                </div>
              ) : (
                sortedNotes.map(note => (
                  <div key={note.id} className="p-3 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{note.author_name}</p>
                        <p className="text-xs text-slate-500">{format(new Date(note.created_date), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{note.note_text}</p>
                  </div>
                ))
              )}

              {/* New Note Form */}
              <div className="p-3 bg-whi-subtle rounded-lg border-2 border-dashed border-whi mt-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button onClick={handleAddNote} className="btn-whi-primary w-full">
                    Post Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT 50% - Bookings Table */}
          <Card className="col-span-10 lg:col-span-5 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-whi-dark flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Bookings
              </CardTitle>
              <Link href={createPageUrl('BookingDetail')}>
                <Button className="btn-whi-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
                  <p className="text-xs text-slate-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-whi-purple">{lifetimeStats.totalBookings}</p>
                </Card>
                <Card className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
                  <p className="text-xs text-slate-600">Lifetime Value</p>
                  <p className="text-2xl font-bold text-whi-purple">€{lifetimeStats.totalValue.toLocaleString()}</p>
                </Card>
                <Card className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
                  <p className="text-xs text-slate-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">€{lifetimeStats.outstanding.toLocaleString()}</p>
                </Card>
              </div>

              {bookings.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500 mb-4">No bookings yet. Start one?</p>
                  <Link href={createPageUrl('BookingDetail')}>
                    <Button className="btn-whi-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Booking
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Booking Ref</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tour</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Departure</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Pax</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(booking => (
                        <tr key={booking.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <a
                              href={createPageUrl('BookingDetail') + '?id=' + booking.id}
                              target="_blank"
                              rel="noreferrer"
                              className="text-whi-purple hover:underline font-mono text-sm"
                            >
                              {booking.booking_reference}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">{booking.tour_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {booking.start_date && format(new Date(booking.start_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">{booking.number_of_walkers}</td>
                          <td className="px-4 py-3">
                            <Badge className={
                              booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'Provisional' ? 'bg-amber-100 text-amber-800' :
                                  booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-slate-100 text-slate-800'
                            }>
                              {booking.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                            €{booking.total_price?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-semibold ${(booking.balance_due || 0) > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                              €{(booking.balance_due || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={createPageUrl('BookingDetail') + '?id=' + booking.id}
                              target="_blank"
                              rel="noreferrer"
                              className="text-whi-purple hover:underline text-sm"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="col-span-10 bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-whi-dark">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No activity recorded yet</p>
            ) : (
              <div className="space-y-4">
                {activities.map(activity => (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activity.activity_type.includes('booking') ? 'bg-whi' :
                      activity.activity_type.includes('email') ? 'bg-whi-purple' :
                        activity.activity_type.includes('profile') ? 'bg-whi-mauve' :
                          'bg-slate-400'
                      }`} />
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          {format(new Date(activity.created_date), 'MMM dd, yyyy HH:mm')}
                        </span>
                        {activity.staff_name && (
                          <>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">{activity.staff_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This action cannot be undone. Type the customer's name to confirm:
            </p>
            <Input
              placeholder={customer.display_name}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDeleteConfirm(false)} className="btn-whi-outline">Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleteConfirmText !== customer.display_name}
              className="btn-whi-destructive"
            >
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}