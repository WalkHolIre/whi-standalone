// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Star, Edit2, Save, X, Plus, Mail, Phone, Globe, MapPin, Pencil,
  FileText, Calendar, Receipt, TrendingUp, ArrowUpRight, Download, Eye, Trash2,
  Send, AlertCircle, CheckCircle, Clock, Users, Building2, Upload, Tag, ChevronRight,
  Facebook, Instagram, Linkedin, Twitter, Youtube
} from
  'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/lib/utils';
import { LoadingState } from '@/components/LoadingState';

export default function PartnerProfile() {
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = React.useState('');
  const [urlParams, setUrlParams] = React.useState(new URLSearchParams(''));

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setParamsId(params.get('id'));
    setUrlParams(params);
  }, []);

  const partnerId = paramsId;
  const defaultTab = urlParams.get('tab') || 'bookings';

  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [newNote, setNewNote] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [editingContactData, setEditingContactData] = useState({});
  const [newContact, setNewContact] = useState(null);
  const [deleteContactId, setDeleteContactId] = useState(null);
  const [deleteNoteId, setDeleteNoteId] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [expandedNote, setExpandedNote] = useState(null);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoResizeOpen, setLogoResizeOpen] = useState(false);
  const [logoScale, setLogoScale] = useState(100);
  const [socialInputs, setSocialInputs] = useState({
    social_facebook: '',
    social_instagram: '',
    social_linkedin: '',
    social_twitter: '',
    social_youtube: ''
  });

  // Fetch partner data
  const { data: partner, isLoading } = useQuery({
    queryKey: ['customer', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('*').eq('id', partnerId).single();
      return data;
    },
    enabled: !!partnerId
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    }
  });

  // Fetch partner bookings through the PartnerBooking join table
  const { data: partnerBookingLinks = [] } = useQuery({
    queryKey: ['partner-booking-links', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('partner_bookings').select('*').match({ partner_id: partnerId });
      return data || [];
    },
    enabled: !!partnerId
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['partner-bookings', partnerBookingLinks],
    queryFn: async () => {
      if (partnerBookingLinks.length === 0) return [];
      const { data } = await supabase.from('bookings').select('*');
      const allBookings = data || [];
      const bookingIds = partnerBookingLinks.map(pb => pb.booking_id);
      return allBookings.filter(b => bookingIds.includes(b.id));
    },
    enabled: partnerBookingLinks.length > 0
  });

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ['customer-notes', partnerId],
    queryFn: async () => {
      // TODO: customer_notes table does not exist - implement proper notes storage
      return [];
    },
    enabled: !!partnerId
  });

  // Fetch partner contacts
  const { data: partnerContacts = [] } = useQuery({
    queryKey: ['partner-contacts', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('partner_contacts').select('*').match({ partner_id: partnerId });
      return data || [];
    },
    enabled: !!partnerId
  });

  // Fetch partner rate cards
  const { data: rateCards = [] } = useQuery({
    queryKey: ['partner-ratecards', partnerId],
    queryFn: async () => {
      // TODO: partner_rate_cards table does not exist - implement proper rate card storage
      return [];
    },
    enabled: !!partnerId
  });

  // Fetch all tours
  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  // Fetch partner invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['partner-invoices', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('partner_invoices').select('*');
      const allInvoices = data || [];
      return allInvoices.filter(inv => inv.partner_id === partnerId);
    },
    enabled: !!partnerId
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates) => (await supabase.from('customers').update(updates).eq('id', partnerId).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', partnerId] });
      toast.success('Saved ✓');
    }
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteText) => {
      // TODO: customer_notes table does not exist - implement proper notes storage
      toast.error('Note storage not yet implemented');
      throw new Error('Note storage not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', partnerId] });
      setNewNote('');
      setShowNewNoteModal(false);
      toast.success('Note added');
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      // TODO: customer_notes table does not exist
      throw new Error('Note storage not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', partnerId] });
      toast.success('Note deleted');
    }
  });

  // Contact mutations
  const createContactMutation = useMutation({
    mutationFn: async (contactData) => (await supabase.from('partner_contacts').insert({ ...contactData, partner_id: partnerId }).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-contacts', partnerId] });
      setNewContact(null);
      setEditingContact(null);
      toast.success('Saved ✓');
    }
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }) => (await supabase.from('partner_contacts').update(data).eq('id', id).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-contacts', partnerId] });
      setEditingContact(null);
      toast.success('Saved ✓');
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId) => (await supabase.from('partner_contacts').delete().eq('id', contactId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-contacts', partnerId] });
      toast.success('Contact deleted');
    }
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async () => {
      return await supabase.from('customers').delete().eq('id', partnerId);
    },
    onSuccess: () => {
      toast.success('Partner deleted');
      setTimeout(() => {
        window.location.href = createPageUrl('PartnersIndex');
      }, 500);
    }
  });

  const handleSave = (field, value) => {
    updateMutation.mutate({ [field]: value });
  };

  const isValidUrl = (str) => {
    if (!str) return true; // empty is OK
    try {
      new URL(str.startsWith('http') ? str : 'https://' + str);
      return true;
    } catch {
      return false;
    }
  };

  const handleBusinessDetailsSave = () => {
    if (editValues.website && !isValidUrl(editValues.website)) {
      toast.error('Please enter a valid website URL');
      return;
    }
    updateMutation.mutate(editValues);
    setEditMode(false);
  };

  const handleStarRating = (rating) => {
    updateMutation.mutate({ star_rating: rating });
  };

  const toggleStatus = () => {
    const statuses = ['active', 'lead'];
    const currentStatusMapping = {
      'active': 'lead',
      'lead': 'active'
    };
    const newStatus = currentStatusMapping[partner.partner_status] || 'active';
    updateMutation.mutate({ partner_status: newStatus });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const tags = partner.tags || [];
    if (!tags.includes(newTag.trim())) {
      updateMutation.mutate({ tags: [...tags, newTag.trim()] });
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove) => {
    const tags = (partner.tags || []).filter((t) => t !== tagToRemove);
    updateMutation.mutate({ tags });
  };

  const handleContactSave = (contactData) => {
    if (editingContact) {
      updateContactMutation.mutate({ id: editingContact.id, data: contactData });
    } else {
      createContactMutation.mutate(contactData);
    }
  };

  const handleContactDelete = (contactId) => {
    if (confirm('Delete this contact?')) {
      deleteContactMutation.mutate(contactId);
    }
  };

  useEffect(() => {
    if (partner && editMode) {
      setEditValues({
        company_name: partner.company_name || '',
        display_name: partner.display_name || '',
        website: partner.website || '',
        billing_country: partner.billing_country || '',
        preferred_language: partner.preferred_language || 'en',
        billing_address: partner.billing_address || '',
        billing_city: partner.billing_city || '',
        billing_postal: partner.billing_postal || '',
        vat_number: partner.vat_number || '',
        payment_terms: partner.payment_terms || 'Net 30',
        source: partner.source || ''
      });
    }
  }, [partner, editMode]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Confirmed': 'bg-green-100 text-green-800',
      'Provisional': 'bg-amber-100 text-amber-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Completed': 'bg-slate-100 text-slate-800',
      'Enquiry': 'bg-blue-100 text-blue-800'
    };
    return styles[status] || 'bg-slate-100 text-slate-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <LoadingState message="Loading partner details..." />
      </div>);

  }

  const isNewMode = urlParams.get('new') === 'true' && !partnerId;

  if (!partner && !isNewMode) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="text-slate-600">Partner not found</p>
      </div>);
  }

  if (isNewMode) {
    return <NewPartnerForm queryClient={queryClient} />;
  }

  const lifetimeValue = bookings.filter((b) => ['Confirmed', 'Active', 'Completed'].includes(b.status)).
    reduce((sum, b) => sum + (b.total_price || 0), 0);
  const outstandingBalance = bookings.reduce((sum, b) => sum + (b.balance_due || 0), 0);
  const lastBooking = bookings.length > 0 ? [...bookings].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0] : null;
  const sortedNotes = [...notes].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white text-slate-900 px-8 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-m text-slate-600">
          <a href={createPageUrl('PartnersIndex')} className="text-whi-purple hover:text-whi">Partners</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{partner.display_name}</span>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* ACTION BUTTONS ROW */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-3">
            <Button
              onClick={() => {
                window.location.href = createPageUrl('BookingDetail') + '?type=new&partner=' + partnerId;
              }}
              className="bg-whi hover:bg-whi-hover text-white rounded-lg font-semibold px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
            <Button
              onClick={() => {
                window.location.href = createPageUrl('AdminTourEditor') + '?new=true';
              }}
              className="border-2 border-whi-purple text-whi-purple hover:bg-whi-purple-subtle rounded-lg font-semibold"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Tour
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowConvertModal(true)}
              className="border-2 border-whi-purple text-whi-purple hover:bg-whi-purple-subtle rounded-lg font-semibold"
              variant="outline"
            >
              Switch to B2C
            </Button>
            <Button
              onClick={() => setShowDeleteModal(true)}
              className="border-2 border-whi text-whi hover:bg-whi-subtle rounded-lg font-semibold"
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Partner
            </Button>
          </div>
        </div>

        {/* ROW 1: Combined Partner Info Card */}
        <Card className="col-span-10">
          <CardContent className="p-6">
            <div className="grid grid-cols-12 gap-8">
              {/* LEFT - Logo Section */}
              <div className="col-span-12 sm:col-span-3 flex flex-col items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setLogoResizeOpen(true)}
                    className="cursor-pointer group"
                  >
                    <Avatar className="w-40 h-40 ring-2 ring-whi-purple hover:ring-whi transition-all bg-white">
                      {partner.logo_url && <img src={partner.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />}
                      <AvatarFallback className="bg-whi-purple text-white text-5xl font-bold">
                        {getInitials(partner.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  {/* Upload Icon Button - Top Right */}
                  <label className="absolute -top-1 -right-1 cursor-pointer bg-slate-400 hover:bg-slate-500 text-white p-2 rounded-full shadow-lg transition-colors flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingLogo(true);
                        try {
                          const fileName = `${Date.now()}-${file.name}`;
                          const { data, error: uploadError } = await supabase.storage.from('partner-logos').upload(fileName, file);
                          if (uploadError) throw uploadError;
                          const { data: { publicUrl } } = supabase.storage.from('partner-logos').getPublicUrl(fileName);
                          await updateMutation.mutateAsync({ logo_url: publicUrl });
                          toast.success('Logo updated');
                        } catch (error) {
                          console.error('Logo upload error:', error);
                          toast.error('Failed to upload logo: ' + (error?.message || 'Unknown error'));
                        } finally {
                          setUploadingLogo(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Upload className="w-4 h-4" />
                  </label>
                </div>

                {/* Partner Name & Type */}
                <div className="text-center space-y-2 w-full">
                  <h2 className="text-lg font-bold text-whi-dark">{partner.display_name}</h2>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {partner.tags?.includes('Travel Agent') &&
                      <Badge className="bg-whi-purple-subtle text-whi-purple text-xs">Travel Agent</Badge>
                    }
                    {partner.tags?.includes('Tour Operator') &&
                      <Badge className="bg-whi-purple-subtle text-whi-purple text-xs">Tour Operator</Badge>
                    }
                  </div>
                </div>

                {/* Status Badge - Clickable */}
                <button
                  onClick={toggleStatus}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${partner.partner_status === 'active' ?
                      'bg-green-500/20 text-green-700 hover:bg-green-500/30' :
                      partner.partner_status === 'lead' ?
                        'bg-whi-subtle text-whi hover:bg-whi-subtle/80' :
                        'bg-slate-500/20 text-slate-700 hover:bg-slate-500/30'}`
                  }>
                  {partner.partner_status === 'active' ? 'Active' : partner.partner_status === 'lead' ? 'Prospect' : 'Inactive'}
                </button>

                {/* Star Rating */}
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) =>
                    <Star
                      key={rating}
                      className={`w-4 h-4 cursor-pointer transition-colors ${rating <= (partner.star_rating || 0) ?
                          'fill-whi text-whi' :
                          'text-slate-300 hover:text-slate-400'}`
                      }
                      onClick={() => handleStarRating(rating)} />
                  )}
                </div>

              </div>

              {/* RIGHT - Details Section */}
              <div className="col-span-12 sm:col-span-9 space-y-6">
                {/* Edit Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-whi-dark">Partner Information</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (editMode) {
                        handleBusinessDetailsSave();
                      } else {
                        setEditMode(true);
                      }
                    }}
                    className="text-whi-purple hover:bg-whi-subtle rounded-lg h-8 px-3">
                    {editMode ? <><Save className="w-3 h-3 mr-1" /> Save</> : <><Pencil className="w-3 h-3 mr-1" /> Edit</>}
                  </Button>
                </div>

                {/* Address & Contact */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block uppercase tracking-wide">Full Address</label>
                    {editMode ?
                      <Textarea
                        value={[editValues.billing_address, editValues.billing_city, editValues.billing_postal].filter(Boolean).join(', ')}
                        onChange={(e) => setEditValues({ ...editValues, billing_address: e.target.value })}
                        rows={2}
                        className="text-sm" /> :
                      <span className="text-sm text-slate-800">{[partner.billing_address, partner.billing_city, partner.billing_postal].filter(Boolean).join(', ') || '—'}</span>
                    }
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block uppercase tracking-wide">Country</label>
                    {editMode ?
                      <Input
                        value={editValues.billing_country}
                        onChange={(e) => setEditValues({ ...editValues, billing_country: e.target.value })}
                        className="text-sm" /> :
                      <span className="text-sm text-slate-800">{partner.billing_country || '—'}</span>
                    }
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block uppercase tracking-wide">Phone</label>
                    <span className="text-sm text-slate-800">{partner.phone || '—'}</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block uppercase tracking-wide">Email</label>
                    <span className="text-sm text-slate-800">{partner.email || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 font-semibold mb-2 block uppercase tracking-wide">Website</label>
                    {editMode ?
                      <Input
                        value={editValues.website}
                        onChange={(e) => setEditValues({ ...editValues, website: e.target.value })}
                        className="text-sm"
                        placeholder="https://..." /> :
                      partner.website ?
                        <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-sm text-whi-purple hover:text-whi flex items-center gap-1">
                          {partner.website} <Globe className="w-3 h-3" />
                        </a> :
                        <span className="text-sm text-slate-800">—</span>
                    }
                  </div>
                </div>

                {/* Business Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block uppercase tracking-wide">Reg. Number</label>
                    <span className="text-sm font-mono text-slate-800">{partner.customer_number || '—'}</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block uppercase tracking-wide">VAT Number</label>
                    {editMode ?
                      <Input
                        value={editValues.vat_number}
                        onChange={(e) => setEditValues({ ...editValues, vat_number: e.target.value })}
                        className="text-sm font-mono" /> :
                      <span className="text-sm font-mono text-slate-800">{partner.vat_number || '—'}</span>
                    }
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block uppercase tracking-wide">Payment Terms</label>
                    {editMode ?
                      <Select value={editValues.payment_terms} onValueChange={(v) => setEditValues({ ...editValues, payment_terms: v })}>
                        <SelectTrigger className="text-sm h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 14">Net 14</SelectItem>
                          <SelectItem value="Net 7">Net 7</SelectItem>
                          <SelectItem value="Proforma">Proforma</SelectItem>
                        </SelectContent>
                      </Select> :
                      <span className="text-sm text-slate-800">{partner.payment_terms || 'Net 30'}</span>
                    }
                  </div>
                </div>

                {/* Tags & Social */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block uppercase tracking-wide">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {(partner.tags || []).map((tag, idx) =>
                        <Badge key={idx} className="bg-whi-mauve-subtle text-whi-mauve text-xs">
                          {tag}
                          <X className="w-2 h-2 cursor-pointer ml-1 hover:text-red-600" onClick={() => removeTag(tag)} />
                        </Badge>
                      )}
                      <div className="flex gap-1 items-center">
                        <Input
                          placeholder="Add..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                          className="h-6 w-20 text-xs" />
                        <Button size="sm" onClick={addTag} className="h-6 px-2 bg-whi hover:bg-whi-hover rounded-lg">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-semibold mb-2 flex items-center justify-between uppercase tracking-wide">
                      Social Media
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSocialInputs({
                            social_facebook: partner.social_facebook || '',
                            social_instagram: partner.social_instagram || '',
                            social_linkedin: partner.social_linkedin || '',
                            social_twitter: partner.social_twitter || '',
                            social_youtube: partner.social_youtube || ''
                          });
                          setShowSocialModal(true);
                        }}
                        className="h-6 px-2 text-whi-purple hover:bg-whi-subtle"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </label>
                    <div className="flex gap-3">
                      {partner.social_facebook && (
                        <a href={partner.social_facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {partner.social_instagram && (
                        <a href={partner.social_instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700">
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {partner.social_linkedin && (
                        <a href={partner.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {partner.social_twitter && (
                        <a href={partner.social_twitter} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:text-slate-700">
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {partner.social_youtube && (
                        <a href={partner.social_youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700">
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                      {!partner.social_facebook && !partner.social_instagram && !partner.social_linkedin && !partner.social_twitter && !partner.social_youtube && (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Quick Info - Bottom of Card */}
            <div className="border-t border-slate-200 pt-4 mt-4 grid grid-cols-2 gap-8">
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Partner Code:</span>
                  <span className="font-mono font-semibold text-slate-800">{partner.customer_number || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Member Since:</span>
                  <span className="text-slate-800">{new Date(partner.created_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROW 2: Contacts (30%) + Notes (70%) */}
        <div className="grid grid-cols-10 gap-6">
          {/* LEFT 30% - Contacts */}
          <Card className="col-span-10 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-whi-dark flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Contacts
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setNewContact({ contact_name: '', email: '', phone: '', role_title: '', is_primary: false })}
                className="bg-whi hover:bg-whi-hover">

                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {/* PartnerContact records */}
              {partnerContacts.map((contact) =>
                <div key={contact.id} className="p-3 bg-white rounded-lg border border-slate-200">
                  {editingContact?.id === contact.id ?
                    <div className="space-y-2">
                      <Input
                        placeholder="First & Last Name"
                        value={editingContactData.contact_name || ''}
                        onChange={(e) => setEditingContactData({ ...editingContactData, contact_name: e.target.value })} />

                      <Input
                        placeholder="Job Title"
                        value={editingContactData.role_title || ''}
                        onChange={(e) => setEditingContactData({ ...editingContactData, role_title: e.target.value })} />

                      <Input
                        placeholder="Email"
                        value={editingContactData.email || ''}
                        onChange={(e) => setEditingContactData({ ...editingContactData, email: e.target.value })} />

                      <Input
                        placeholder="Phone"
                        value={editingContactData.phone || ''}
                        onChange={(e) => setEditingContactData({ ...editingContactData, phone: e.target.value })} />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            handleContactSave(editingContactData);
                          }}
                          className="bg-whi hover:bg-whi-hover">

                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingContact(null);
                          setEditingContactData({});
                        }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteContactId(contact.id)}
                          className="text-red-600 hover:bg-red-50">

                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div> :

                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-whi-purple text-white font-semibold text-sm">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-slate-900">{contact.contact_name}</p>
                            {contact.is_primary && <Star className="w-3 h-3 fill-whi text-whi" />}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingContact(contact);
                              setEditingContactData({
                                contact_name: contact.contact_name || '',
                                role_title: contact.role_title || '',
                                email: contact.email || '',
                                phone: contact.phone || ''
                              });
                            }}
                            className="h-6 w-6 p-0">

                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                        {contact.role_title && <p className="text-xs text-slate-600">{contact.role_title}</p>}
                        {contact.email &&
                          <a href={`mailto:${contact.email}`} className="text-xs text-whi-purple hover:text-whi flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </a>
                        }
                        {contact.phone &&
                          <a href={`tel:${contact.phone}`} className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </a>
                        }
                      </div>
                    </div>
                  }
                </div>
              )}

              {/* New Contact Form */}
              {newContact &&
                <div className="p-3 bg-whi-subtle rounded-lg border-2 border-dashed border-whi">
                  <div className="space-y-2">
                    <Input
                      placeholder="First & Last Name"
                      value={newContact.contact_name}
                      onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })} />

                    <Input
                      placeholder="Job Title"
                      value={newContact.role_title}
                      onChange={(e) => setNewContact({ ...newContact, role_title: e.target.value })} />

                    <Input
                      placeholder="Email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />

                    <Input
                      placeholder="Phone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          // Validation
                          if (!newContact.contact_name || newContact.contact_name.trim().length < 2) {
                            toast.error('Please enter a valid contact name');
                            return;
                          }
                          if (!newContact.email && !newContact.phone) {
                            toast.error('Please provide at least an email address or phone number');
                            return;
                          }
                          if (newContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email)) {
                            toast.error('Please enter a valid email address');
                            return;
                          }
                          handleContactSave(newContact);
                          setNewContact(null);
                          setEditingContact(null);
                        }}
                        disabled={!newContact.contact_name}
                        className="bg-whi hover:bg-whi-hover">

                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setNewContact(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              }

              {partnerContacts.length === 0 && !newContact &&
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">⚠ No contacts added yet</p>
                </div>
              }
            </CardContent>
          </Card>

          {/* RIGHT 70% - Notes Table */}
          <Card className="col-span-10 lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-whi-dark flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Notes
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowNewNoteModal(true)}
                className="bg-whi hover:bg-whi-hover">

                <Plus className="w-4 h-4 mr-1" />
                Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {sortedNotes.length === 0 ?
                <p className="text-center py-8 text-slate-500 text-sm">
                  No notes yet for this partner.
                </p> :

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-whi-dark text-white">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Date</th>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Added By</th>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Note</th>
                        <th className="text-center p-3 text-xs font-semibold uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedNotes.map((note) =>
                        <tr key={note.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-3 text-sm text-slate-600">
                            {new Date(note.created_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-sm">{note.author_name}</td>
                          <td className="p-3 text-sm">
                            {note.note_text.length > 80 ? note.note_text.substring(0, 80) + '...' : note.note_text}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedNote(note)}
                                className="text-whi-purple hover:bg-whi-subtle">

                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteNoteId(note.id)}
                                className="text-red-600 hover:bg-red-50">

                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              }
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: Tabbed Panel */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-200 px-6">
              <TabsList className="bg-transparent">
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="ratecard">Rate Card</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Bookings */}
            <TabsContent value="bookings" className="p-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-whi-dark">{bookings.length}</div>
                  <div className="text-sm text-slate-600">Total Bookings</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-whi-dark">{formatCurrency(lifetimeValue)}</div>
                  <div className="text-sm text-slate-600">Lifetime Value</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(outstandingBalance)}
                  </div>
                  <div className="text-sm text-slate-600">Outstanding Balance</div>
                </div>
              </div>

              {/* Bookings Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-whi-dark text-white">
                      <th className="text-left p-3 text-xs uppercase">Booking Ref</th>
                      <th className="text-left p-3 text-xs uppercase">Tour</th>
                      <th className="text-left p-3 text-xs uppercase">Departure</th>
                      <th className="text-left p-3 text-xs uppercase">Pax</th>
                      <th className="text-left p-3 text-xs uppercase">Status</th>
                      <th className="text-right p-3 text-xs uppercase">Value</th>
                      <th className="text-right p-3 text-xs uppercase">Balance</th>
                      <th className="text-center p-3 text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 &&
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No bookings yet for this partner</p>
                        </td>
                      </tr>
                    }
                    {bookings.map((booking) =>
                      <tr key={booking.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-3">
                          <a
                            href={createPageUrl('BookingDetail') + '?id=' + booking.id}
                            target="_blank"
                            className="text-whi-purple hover:text-whi font-mono text-sm">

                            {booking.booking_reference}
                          </a>
                        </td>
                        <td className="p-3 text-sm">{booking.tour_name}</td>
                        <td className="p-3 text-sm">{new Date(booking.start_date).toLocaleDateString()}</td>
                        <td className="p-3 text-sm">{booking.number_of_walkers}</td>
                        <td className="p-3">
                          <Badge className={getStatusBadge(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-right">{formatCurrency(booking.total_price)}</td>
                        <td className="p-3 text-sm text-right">
                          <span className={booking.balance_due > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                            {formatCurrency(booking.balance_due)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="ghost" title="View">
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Tab 2: Invoices */}
            <TabsContent value="invoices" className="p-6">
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-whi-dark text-white">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Invoice #</th>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Date</th>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Period</th>
                        <th className="text-right p-3 text-xs font-semibold uppercase">Amount</th>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-3 text-sm font-mono text-whi-purple">{invoice.invoice_number || invoice.id.slice(0, 8)}</td>
                          <td className="p-3 text-sm">{new Date(invoice.created_date).toLocaleDateString()}</td>
                          <td className="p-3 text-sm">{invoice.period || '—'}</td>
                          <td className="p-3 text-sm text-right font-semibold">{formatCurrency(invoice.amount || 0)}</td>
                          <td className="p-3">
                            <Badge className={invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                              {invoice.status || 'Pending'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Tab 4: Rate Card */}
            <TabsContent value="ratecard" className="p-6">
              {rateCards.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No rate cards configured</p>
                  <p className="text-sm mt-2">Custom pricing per tour for this partner</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-whi-dark text-white">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Tour</th>
                        <th className="text-right p-3 text-xs font-semibold uppercase">Standard Price</th>
                        <th className="text-right p-3 text-xs font-semibold uppercase">Partner Price</th>
                        <th className="text-center p-3 text-xs font-semibold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateCards.map((rc) => {
                        const tour = tours.find(t => t.id === rc.tour_id);
                        return (
                          <tr key={rc.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-3 text-sm">{tour?.name || 'Unknown Tour'}</td>
                            <td className="p-3 text-sm text-right">{formatCurrency(tour?.price_per_person_eur || 0)}</td>
                            <td className="p-3 text-sm text-right font-semibold text-whi">{formatCurrency(rc.b2b_price || 0)}</td>
                            <td className="p-3 text-center">
                              <Badge className={rc.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                                {rc.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Convert to B2C Modal */}
      {showConvertModal &&
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200/60">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Switch to B2C Customer?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will move <strong>{partner.display_name}</strong> to the B2C Customer list and remove trade pricing.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConvertModal(false)}
                className="flex-1">

                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateMutation.mutate({ is_partner: false, partner_status: '' });
                  setShowConvertModal(false);
                  setTimeout(() => {
                    window.location.href = createPageUrl('PartnersIndex');
                  }, 1000);
                }}
                className="flex-1">

                Confirm
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Delete Partner Modal */}
      {showDeleteModal &&
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200/60">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Delete {partner.display_name}?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1">

                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deletePartnerMutation.mutate();
                  setShowDeleteModal(false);
                }}
                className="flex-1">

                Delete
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Logo Resize Modal - Crop/Pan Interface */}
      {logoResizeOpen &&
        <Dialog open={logoResizeOpen} onOpenChange={setLogoResizeOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Adjust Logo Display</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                <div
                  className="w-48 h-48 rounded-full overflow-hidden border-4 border-whi-purple flex items-center justify-center bg-slate-100"
                  style={{ position: 'relative' }}
                >
                  {partner.logo_url && (
                    <img
                      key={partner.logo_url}
                      src={partner.logo_url}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                      style={{
                        transform: `scale(${logoScale / 100})`,
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Zoom: {logoScale}%</label>
                  <span className="text-xs text-slate-500">50% - 150%</span>
                </div>
                <Input
                  type="range"
                  min="50"
                  max="150"
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
                <p>Use the slider to zoom in or out. The frame shows how your logo will appear.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLogoResizeOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setLogoResizeOpen(false);
                  toast.success('Logo zoom updated');
                }}
                className="bg-whi hover:bg-whi-hover rounded-lg"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }

      {/* Social Media Modal */}
      {showSocialModal &&
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200/60">
            <h3 className="text-lg font-semibold text-whi-dark mb-4">Edit Social Media Links</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  Facebook
                </label>
                <Input
                  value={socialInputs.social_facebook}
                  onChange={(e) => setSocialInputs({ ...socialInputs, social_facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  Instagram
                </label>
                <Input
                  value={socialInputs.social_instagram}
                  onChange={(e) => setSocialInputs({ ...socialInputs, social_instagram: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-blue-700" />
                  LinkedIn
                </label>
                <Input
                  value={socialInputs.social_linkedin}
                  onChange={(e) => setSocialInputs({ ...socialInputs, social_linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-slate-900" />
                  Twitter/X
                </label>
                <Input
                  value={socialInputs.social_twitter}
                  onChange={(e) => setSocialInputs({ ...socialInputs, social_twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-600" />
                  YouTube
                </label>
                <Input
                  value={socialInputs.social_youtube}
                  onChange={(e) => setSocialInputs({ ...socialInputs, social_youtube: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowSocialModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateMutation.mutate(socialInputs);
                  setShowSocialModal(false);
                }}
                className="flex-1 bg-whi hover:bg-whi-hover"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Delete Contact Confirmation Dialog */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact from the partner record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteContactId) {
                  deleteContactMutation.mutate(deleteContactId);
                }
                setDeleteContactId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteNoteId) {
                  deleteNoteMutation.mutate(deleteNoteId);
                }
                setDeleteNoteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

// ─── New Partner Creation Form ──────────────────────────────────────────────

function NewPartnerForm({ queryClient }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    partner_name: '',
    billing_country: '',
    billing_city: '',
    billing_address_line1: '',
    billing_address_line2: '',
    billing_postcode: '',
    vat_number: '',
    b2b_discount_percent: 0,
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.partner_name.trim()) {
      toast.error('Partner name is required');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('partners').insert(form).select().single();
      if (error) throw error;
      toast.success('Partner created');
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.push(`/partners/profile?id=${data.id}`);
    } catch (err) {
      toast.error('Failed to create partner: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/partners')} className="gap-1 text-slate-500 hover:text-slate-700 mb-4">
            <X className="w-4 h-4" /> Back to Partners
          </Button>
          <h1 className="text-2xl font-bold text-whi-purple">Add New Trade Partner</h1>
          <p className="text-slate-500 text-sm mt-1">Create a new B2B trade partner record</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Partner / Company Name *</label>
              <Input
                value={form.partner_name}
                onChange={(e) => handleChange('partner_name', e.target.value)}
                placeholder="e.g. Wanderlust Travel GmbH"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Country</label>
                <Input
                  value={form.billing_country}
                  onChange={(e) => handleChange('billing_country', e.target.value)}
                  placeholder="e.g. Germany"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">City</label>
                <Input
                  value={form.billing_city}
                  onChange={(e) => handleChange('billing_city', e.target.value)}
                  placeholder="e.g. Munich"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Address Line 1</label>
              <Input
                value={form.billing_address_line1}
                onChange={(e) => handleChange('billing_address_line1', e.target.value)}
                placeholder="Street address"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Postcode</label>
                <Input
                  value={form.billing_postcode}
                  onChange={(e) => handleChange('billing_postcode', e.target.value)}
                  placeholder="e.g. 80331"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">VAT Number</label>
                <Input
                  value={form.vat_number}
                  onChange={(e) => handleChange('vat_number', e.target.value)}
                  placeholder="e.g. DE123456789"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">B2B Discount %</label>
              <Input
                type="number"
                value={form.b2b_discount_percent}
                onChange={(e) => handleChange('b2b_discount_percent', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="mt-1 w-32"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => router.push('/partners')}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !form.partner_name.trim()}
                style={{ backgroundColor: '#F17E00', color: 'white', fontWeight: 'bold', height: 40, padding: '0 24px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving || !form.partner_name.trim() ? 0.5 : 1 }}
              >
                <Building2 style={{ width: 16, height: 16 }} />
                {saving ? 'Creating...' : 'Create Partner'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}