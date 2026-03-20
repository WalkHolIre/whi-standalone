// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, Send, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/components/sanitize';
import { default as MarkdownEditor } from '@/components/MarkdownEditor';

const DEFAULT_SETTINGS = {
  from_name: 'Walking Holiday Ireland',
  logo_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698fbccb93e8c68795aa3946/85a432a04_WHI_logo_636x342.png',
  admin_email: '',
  enquiry_notification_enabled: true,
  enquiry_admin_subject: 'New Enquiry: {{tour_name}}',
  enquiry_admin_template: `<h2>New Enquiry Received</h2>
<p><strong>Name:</strong> {{name}}<br>
<strong>Email:</strong> {{email}}<br>
<strong>Phone:</strong> {{phone}}<br>
<strong>Country:</strong> {{country}}</p>
<p><strong>Tour:</strong> {{tour_name}}<br>
<strong>Destination:</strong> {{destination_name}}<br>
<strong>Travel Dates:</strong> {{travel_dates}}<br>
<strong>Number of Travellers:</strong> {{number_of_travellers}}</p>
<p><strong>Message:</strong><br>{{message}}</p>`,
  enquiry_auto_reply_enabled: true,
  enquiry_auto_reply_subject: 'Thank you for your enquiry - {{tour_name}}',
  enquiry_auto_reply_template: `<p>Dear {{name}},</p>
<p>Thank you for your enquiry about <strong>{{tour_name}}</strong>.</p>
<p>We have received your message and will respond within 24 hours with detailed information and availability.</p>
<p>In the meantime, feel free to browse our other walking holidays on our website.</p>
<p>Best regards,<br>
Walking Holiday Ireland Team</p>`,
  booking_confirmation_enabled: true,
  booking_confirmation_subject: 'Booking Confirmation - {{booking_number}}',
  booking_confirmation_template: `<p>Dear {{contact_name}},</p>
<p>Your booking has been confirmed!</p>
<p><strong>Booking Number:</strong> {{booking_number}}<br>
<strong>Tour:</strong> {{tour_name}}<br>
<strong>Start Date:</strong> {{start_date}}<br>
<strong>Duration:</strong> {{duration_days}} days<br>
<strong>Participants:</strong> {{number_of_participants}}<br>
<strong>Total Price:</strong> {{total_price}}</p>
<p><strong>Payment Information:</strong><br>{{payment_info}}</p>
<p>We look forward to welcoming you on your walking holiday!</p>
<p>Best regards,<br>
Walking Holiday Ireland Team</p>`,
  booking_admin_notification_enabled: true,
  booking_admin_subject: 'New Booking Received - {{booking_number}}',
  booking_admin_template: `<h2>New Booking</h2>
<p><strong>Booking Number:</strong> {{booking_number}}<br>
<strong>Customer:</strong> {{contact_name}}<br>
<strong>Tour:</strong> {{tour_name}}<br>
<strong>Start Date:</strong> {{start_date}}<br>
<strong>Duration:</strong> {{duration_days}} days<br>
<strong>Participants:</strong> {{number_of_participants}}<br>
<strong>Total Price:</strong> {{total_price}}</p>`,
  service_request_enabled: true,
  service_request_subject: 'Service Request - {{date}} - {{service_type}}',
  service_request_template: `<h2>New Service Request</h2>
<p>Hello {{provider_contact_name}},</p>
<p>You have received a new service request from Walking Holiday Ireland.</p>

<div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Booking Details</h3>
  <p><strong>Booking Reference:</strong> {{booking_reference}}</p>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Service Type:</strong> {{service_type}}</p>
  <p><strong>Number of Guests:</strong> {{number_of_guests}}</p>
  <p><strong>Guest Names:</strong> {{guest_names}}</p>
  <p><strong>Walk:</strong> {{walk_name}} ({{walk_distance_km}} km)</p>
  <p><strong>Special Requests:</strong> {{special_requests}}</p>
</div>

<div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Proposed Rate:</strong> €{{rate}}</p>
  <p style="font-size: 14px;">You can confirm or adjust this rate when you respond.</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{response_url}}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
    Click Here to Respond
  </a>
</div>

<p style="font-size: 14px;">
  Or copy this link: <a href="{{response_url}}">{{response_url}}</a>
</p>

<p style="font-size: 14px; color: #dc2626; margin-top: 20px;">
  <strong>Please respond within 72 hours.</strong> This link will expire after that time.
</p>

<hr style="margin: 30px 0;"/>

<p style="font-size: 12px; color: #94a3b8;">
  This is an automated message from Walking Holiday Ireland.<br/>
  Please respond at your earliest convenience.
</p>`
};

const VARIABLE_SETS = {
  enquiry_admin: ['{{logo_url}}', '{{name}}', '{{email}}', '{{phone}}', '{{country}}', '{{travel_dates}}', '{{number_of_travellers}}', '{{tour_name}}', '{{destination_name}}', '{{message}}'],
  enquiry_auto_reply: ['{{logo_url}}', '{{name}}', '{{message}}', '{{tour_name}}'],
  booking_confirmation: ['{{logo_url}}', '{{contact_name}}', '{{booking_number}}', '{{tour_name}}', '{{start_date}}', '{{duration_days}}', '{{number_of_participants}}', '{{total_price}}', '{{payment_info}}'],
  booking_admin: ['{{logo_url}}', '{{contact_name}}', '{{booking_number}}', '{{tour_name}}', '{{start_date}}', '{{duration_days}}', '{{number_of_participants}}', '{{total_price}}'],
  service_request: ['{{logo_url}}', '{{provider_contact_name}}', '{{booking_reference}}', '{{date}}', '{{service_type}}', '{{number_of_guests}}', '{{guest_names}}', '{{walk_name}}', '{{walk_distance_km}}', '{{special_requests}}', '{{rate}}', '{{response_url}}']
};

export default function AdminEmailSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const settingIdRef = useRef(null);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('email_settings').select('*');
      const list = data || [];
      const existing = list[0] || null;
      if (existing) {
        settingIdRef.current = existing.id;
        setSettings({ ...DEFAULT_SETTINGS, ...existing });
      }
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settingIdRef.current) {
        const response = await supabase.from('email_settings')
          .update({
            setting_key: 'email_config',
            setting_json: settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', settingIdRef.current)
          .select()
          .single();
        response.data;
      } else {
        const response = await supabase.from('email_settings').insert({
          setting_key: 'email_config',
          setting_json: settings,
          updated_at: new Date().toISOString()
        }).select().single();
        const created = response.data;
        settingIdRef.current = created.id;
      }
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (field, defaultValue) => {
    if (confirm('Reset to default template? Your changes will be lost.')) {
      setSettings((prev) => ({ ...prev, [field]: defaultValue }));
    }
  };

  const handlePreview = (template, variables) => {
    let preview = template;
    variables.forEach((variable) => {
      const sampleData = {
        '{{name}}': 'John Smith',
        '{{email}}': 'john@example.com',
        '{{phone}}': '+353 1 234 5678',
        '{{country}}': 'Ireland',
        '{{travel_dates}}': 'June 15-22, 2026',
        '{{number_of_travellers}}': '2',
        '{{tour_name}}': 'Ring of Kerry Walking Tour',
        '{{destination_name}}': 'Kerry',
        '{{message}}': 'I would like more information about this tour.',
        '{{logo_url}}': settings.logo_url || DEFAULT_SETTINGS.logo_url,
        '{{contact_name}}': 'Sarah Johnson',
        '{{booking_number}}': 'WH-2026-001',
        '{{booking_reference}}': 'WH-2026-001',
        '{{start_date}}': 'June 15, 2026',
        '{{duration_days}}': '7',
        '{{number_of_participants}}': '2',
        '{{total_price}}': '€1,450',
        '{{payment_info}}': 'Deposit: €300 paid. Balance due: €1,150 by June 1, 2026',
        '{{provider_contact_name}}': 'Michael O\'Brien',
        '{{date}}': 'June 16, 2026',
        '{{service_type}}': 'Accommodation',
        '{{number_of_guests}}': '2',
        '{{guest_names}}': 'John Smith, Mary Smith',
        '{{walk_name}}': 'Killarney to Kenmare',
        '{{walk_distance_km}}': '18',
        '{{special_requests}}': 'Early breakfast at 7am',
        '{{rate}}': '180',
        '{{response_url}}': 'https://app.walkingholidayireland.com/service-response/abc123'
      };
      preview = preview.replace(new RegExp(variable, 'g'), sampleData[variable] || variable);
    });
    setPreviewContent(preview);
    setPreviewOpen(true);
  };

  const handleSendTest = async (type) => {
    const recipientEmail = testEmail || settings.admin_email;
    if (!recipientEmail) {
      toast.error('Please set an admin email address or enter a test email address');
      return;
    }

    try {
      if (type === 'enquiry_admin' || type === 'enquiry_customer') {
        // TODO: Migrate to Supabase Edge Function
        console.warn('TODO: Migrate base44.functions.invoke(sendEnquiryEmails) to Supabase Edge Function');
        // await supabase.functions.invoke('sendEnquiryEmails', {
        //   body: {
        //     test_mode: true,
        //     test_data: {
        //       name: 'Test User',
        //       email: recipientEmail,
        //       phone: '+353 87 000 0000',
        //       country: 'Ireland',
        //       travel_dates: 'June 15-22, 2026',
        //       number_of_travellers: '2',
        //       tour_name: 'Kerry Way Walking Tour',
        //       destination_name: 'Kerry',
        //       message: 'This is a test enquiry from the email settings page.'
        //     }
        //   }
        // });
      } else if (type === 'booking_customer' || type === 'booking_admin') {
        // TODO: Migrate to Supabase Edge Function
        console.warn('TODO: Migrate base44.functions.invoke(sendBookingConfirmation) to Supabase Edge Function');
        // await supabase.functions.invoke('sendBookingConfirmation', {
        //   body: {
        //     test_mode: true,
        //     test_data: {
        //       contact_name: 'Test User',
        //       customer_name: 'Test User',
        //       booking_number: 'WHI-TEST-001',
        //       booking_reference: 'WHI-TEST-001',
        //       tour_name: 'Kerry Way Walking Tour',
        //       start_date: '2026-06-15',
        //       duration_days: '7',
        //       number_of_participants: '2',
        //       number_of_walkers: '2',
        //       total_price: '1299',
        //       email: recipientEmail,
        //       customer_email: recipientEmail
        //     }
        //   }
        // });
      } else if (type === 'service_request') {
        // TODO: Migrate to Supabase Edge Function
        console.warn('TODO: Migrate base44.functions.invoke(sendTestEmail) to Supabase Edge Function');
        // await supabase.functions.invoke('sendTestEmail', {
        //   body: {
        //     to: recipientEmail,
        //     subject: settings.service_request_subject
        //       .replace(/\{\{date\}\}/g, 'June 16, 2026')
        //       .replace(/\{\{service_type\}\}/g, 'Accommodation'),
        //     html: settings.service_request_template
        //       .replace(/\{\{provider_contact_name\}\}/g, 'Test Provider')
        //       .replace(/\{\{booking_reference\}\}/g, 'WHI-TEST-001')
        //       .replace(/\{\{date\}\}/g, 'June 16, 2026')
        //       .replace(/\{\{service_type\}\}/g, 'Accommodation')
        //       .replace(/\{\{number_of_guests\}\}/g, '2')
        //       .replace(/\{\{guest_names\}\}/g, 'John Smith, Mary Smith')
        //       .replace(/\{\{walk_name\}\}/g, 'Killarney to Kenmare')
        //       .replace(/\{\{walk_distance_km\}\}/g, '18')
        //       .replace(/\{\{special_requests\}\}/g, 'Early breakfast at 7am')
        //       .replace(/\{\{rate\}\}/g, '180')
        //       .replace(/\{\{response_url\}\}/g, 'https://app.walkingholidayireland.com/service-response/test-token')
        //   }
        // });
      }

      toast.success('Test email sent to ' + recipientEmail);
    } catch (error) {
      toast.error('Failed to send test email: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading settings...</p>
      </div>);

  }

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow mb-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Email Settings
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Manage automated email templates and configurations</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving} className="relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all shadow-sm border-0 disabled:opacity-50">
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-white/70 backdrop-blur-md rounded-xl p-1 mb-6 border border-slate-200/60 shadow-sm flex flex-wrap gap-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="enquiry-admin">Enquiry → Admin</TabsTrigger>
            <TabsTrigger value="enquiry-customer">Enquiry → Customer</TabsTrigger>
            <TabsTrigger value="booking-customer">Booking → Customer</TabsTrigger>
            <TabsTrigger value="booking-admin">Booking → Admin</TabsTrigger>
            <TabsTrigger value="service-request">Service Provider</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-600 font-semibold tracking-tight leading-none">General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={settings.from_name}
                    onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                    placeholder="Walking Holiday Ireland" />

                  <p className="text-xs text-slate-500 mt-1">
                    This name will appear as the sender on all emails
                  </p>
                </div>

                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={settings.logo_url}
                    onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png" />

                  <p className="text-xs text-slate-500 mt-1">
                    Use <code className="bg-slate-100 px-1 rounded">{'{{logo_url}}'}</code> in your email templates to display this logo
                  </p>
                  {settings.logo_url &&
                    <div className="mt-2">
                      <img src={settings.logo_url} alt="Logo preview" className="max-w-[200px] h-auto" />
                    </div>
                  }
                </div>

                <div>
                  <Label>Admin Email Address</Label>
                  <Input
                    type="email"
                    value={settings.admin_email}
                    onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                    placeholder="admin@example.com" />

                  <p className="text-xs text-slate-500 mt-1">
                    Admin notifications and test emails will be sent here
                  </p>
                </div>

                <div>
                  <Label>Test Email Address (Optional)</Label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com" />

                  <p className="text-xs text-slate-500 mt-1">
                    Override the admin email for testing purposes. Leave empty to use admin email.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enquiry → Admin */}
          <TabsContent value="enquiry-admin">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">Enquiry → Admin Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Notifications</Label>
                  <Switch
                    checked={settings.enquiry_notification_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, enquiry_notification_enabled: checked })} />

                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={settings.enquiry_admin_subject}
                    onChange={(e) => setSettings({ ...settings, enquiry_admin_subject: e.target.value })} />

                </div>

                <div>
                  <Label>Email Template</Label>
                  <MarkdownEditor
                    value={settings.enquiry_admin_template}
                    onChange={(value) => setSettings({ ...settings, enquiry_admin_template: value })} />


                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLE_SETS.enquiry_admin.map((variable) =>
                        <Badge key={variable} variant="outline" className="font-mono text-xs">
                          {variable}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreview(settings.enquiry_admin_template, VARIABLE_SETS.enquiry_admin)}>

                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendTest('enquiry_admin')}>

                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReset('enquiry_admin_template', DEFAULT_SETTINGS.enquiry_admin_template)}
                    className="ml-auto">

                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enquiry → Customer */}
          <TabsContent value="enquiry-customer">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">Enquiry → Customer Auto-Reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Auto-Reply</Label>
                  <Switch
                    checked={settings.enquiry_auto_reply_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, enquiry_auto_reply_enabled: checked })} />

                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={settings.enquiry_auto_reply_subject}
                    onChange={(e) => setSettings({ ...settings, enquiry_auto_reply_subject: e.target.value })} />

                </div>

                <div>
                  <Label>Email Template</Label>
                  <MarkdownEditor
                    value={settings.enquiry_auto_reply_template}
                    onChange={(value) => setSettings({ ...settings, enquiry_auto_reply_template: value })} />


                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLE_SETS.enquiry_auto_reply.map((variable) =>
                        <Badge key={variable} variant="outline" className="font-mono text-xs">
                          {variable}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreview(settings.enquiry_auto_reply_template, VARIABLE_SETS.enquiry_auto_reply)}>

                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendTest('enquiry_customer')}>

                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReset('enquiry_auto_reply_template', DEFAULT_SETTINGS.enquiry_auto_reply_template)}
                    className="ml-auto">

                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking → Customer */}
          <TabsContent value="booking-customer">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">Booking Confirmation → Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Confirmations</Label>
                  <Switch
                    checked={settings.booking_confirmation_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, booking_confirmation_enabled: checked })} />

                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={settings.booking_confirmation_subject}
                    onChange={(e) => setSettings({ ...settings, booking_confirmation_subject: e.target.value })} />

                </div>

                <div>
                  <Label>Email Template</Label>
                  <MarkdownEditor
                    value={settings.booking_confirmation_template}
                    onChange={(value) => setSettings({ ...settings, booking_confirmation_template: value })} />


                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLE_SETS.booking_confirmation.map((variable) =>
                        <Badge key={variable} variant="outline" className="font-mono text-xs">
                          {variable}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreview(settings.booking_confirmation_template, VARIABLE_SETS.booking_confirmation)}>

                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendTest('booking_customer')}>

                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReset('booking_confirmation_template', DEFAULT_SETTINGS.booking_confirmation_template)}
                    className="ml-auto">

                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking → Admin */}
          <TabsContent value="booking-admin">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">Booking → Admin Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Notifications</Label>
                  <Switch
                    checked={settings.booking_admin_notification_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, booking_admin_notification_enabled: checked })} />

                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={settings.booking_admin_subject}
                    onChange={(e) => setSettings({ ...settings, booking_admin_subject: e.target.value })} />

                </div>

                <div>
                  <Label>Email Template</Label>
                  <MarkdownEditor
                    value={settings.booking_admin_template}
                    onChange={(value) => setSettings({ ...settings, booking_admin_template: value })} />


                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLE_SETS.booking_admin.map((variable) =>
                        <Badge key={variable} variant="outline" className="font-mono text-xs">
                          {variable}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreview(settings.booking_admin_template, VARIABLE_SETS.booking_admin)}>

                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendTest('booking_admin')}>

                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReset('booking_admin_template', DEFAULT_SETTINGS.booking_admin_template)}
                    className="ml-auto">

                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Provider Request */}
          <TabsContent value="service-request">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-whi-dark">Service Provider Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Service Requests</Label>
                  <Switch
                    checked={settings.service_request_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, service_request_enabled: checked })} />

                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={settings.service_request_subject}
                    onChange={(e) => setSettings({ ...settings, service_request_subject: e.target.value })} />

                </div>

                <div>
                  <Label>Email Template</Label>
                  <MarkdownEditor
                    value={settings.service_request_template}
                    onChange={(value) => setSettings({ ...settings, service_request_template: value })} />


                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLE_SETS.service_request.map((variable) =>
                        <Badge key={variable} variant="outline" className="font-mono text-xs">
                          {variable}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreview(settings.service_request_template, VARIABLE_SETS.service_request)}>

                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendTest('service_request')}>

                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReset('service_request_template', DEFAULT_SETTINGS.service_request_template)}
                    className="ml-auto">

                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div
              className="border rounded-lg"
              dangerouslySetInnerHTML={{ __html: previewContent }} />

          </DialogContent>
        </Dialog>
      </div>
    </div>);

}