// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, X, Plus, GripVertical, AlertTriangle, CheckSquare, Calendar, Building2, Database, Activity, RefreshCw, Globe, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';

const NAV_SECTIONS = [
  { id: 'services', label: 'Tour Services', icon: CheckSquare },
  { id: 'season', label: 'Walking Season', icon: Calendar },
  { id: 'ek', label: 'Route EK Thresholds', icon: Activity },
  { id: 'company', label: 'Company Config', icon: Building2 },
  { id: 'languages', label: 'Languages', icon: Globe },
  { id: 'admin', label: 'Admin Tools', icon: Database },
];

const DEFAULT_EK_THRESHOLDS = [
  { grade: 'Easy', code: 'E', from: 0, to: 23 },
  { grade: 'Moderate', code: 'M', from: 23, to: 28 },
  { grade: 'Challenging', code: 'C', from: 28, to: 32 },
  { grade: 'Challenging+', code: 'P', from: 32, to: 999 },
];

export default function GlobalSettings() {
  const [activeSection, setActiveSection] = useState('services');
  const [saving, setSaving] = useState(false);

  const [includedServices, setIncludedServices] = useState([]);
  const [excludedServices, setExcludedServices] = useState([]);
  const [bestMonths, setBestMonths] = useState([]);
  const [depositPercentage, setDepositPercentage] = useState(30);
  const [bankName, setBankName] = useState('AIB');
  const [bankAccountName, setBankAccountName] = useState('Walking Holiday Ireland');
  const [bankIban, setBankIban] = useState('');
  const [bankBic, setBankBic] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyVat, setCompanyVat] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [ekThresholds, setEkThresholds] = useState(DEFAULT_EK_THRESHOLDS);
  const [recalculating, setRecalculating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [showAddLanguageDialog, setShowAddLanguageDialog] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [langForm, setLangForm] = useState({ language_code: '', language_name: '', flag_emoji: '', site_url: '', status: 'active' });
  const [savingLanguage, setSavingLanguage] = useState(false);

  // Store the record IDs so we can update them directly
  const settingIdsRef = useRef({});

  const [newIncludedItem, setNewIncludedItem] = useState('');
  const [newExcludedItem, setNewExcludedItem] = useState('');
  const [showMigratePartnersDialog, setShowMigratePartnersDialog] = useState(false);
  const [migratePartnersEstimate, setMigratePartnersEstimate] = useState(null);
  const [migrationResults, setMigrationResults] = useState(null);
  const [showRemovePartnersDialog, setShowRemovePartnersDialog] = useState(false);
  const [removePartnersEstimate, setRemovePartnersEstimate] = useState(null);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Load settings once on mount - fetch fresh from DB, never from cache
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('global_settings').select('*');
      const settings = data || [];
      settingIdsRef.current = {};
      for (const s of settings) {
        settingIdsRef.current[s.setting_key || 'company_config'] = s.id;
      }

      const get = (key) => settings.find(s => s.setting_key === key)?.setting_json;

      if (get('included_services')) setIncludedServices(get('included_services'));
      if (get('excluded_services')) setExcludedServices(get('excluded_services'));
      if (get('best_months')) setBestMonths(get('best_months'));
      if (get('ek_thresholds')) setEkThresholds(get('ek_thresholds'));

      const company = get('company_config');
      if (company) {
        if (company.deposit_percentage) setDepositPercentage(company.deposit_percentage);
        if (company.bank_name) setBankName(company.bank_name);
        if (company.bank_account_name) setBankAccountName(company.bank_account_name);
        if (company.bank_iban) setBankIban(company.bank_iban);
        if (company.bank_bic) setBankBic(company.bank_bic);
        if (company.company_address) setCompanyAddress(company.company_address);
        if (company.company_vat) setCompanyVat(company.company_vat);
      }
      setLoaded(true);
    }
    loadSettings();
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    const { data } = await supabase.from('language_sites').select('*');
    const langs = data || [];
    setLanguages(langs);
  };

  const openAddLanguage = () => {
    setEditingLanguage(null);
    setLangForm({ language_code: '', language_name: '', flag_emoji: '', site_url: '', status: 'active' });
    setShowAddLanguageDialog(true);
  };

  const openEditLanguage = (lang) => {
    setEditingLanguage(lang);
    setLangForm({ language_code: lang.language_code, language_name: lang.language_name, flag_emoji: lang.flag_emoji || '', site_url: lang.site_url || '', status: lang.status || 'active' });
    setShowAddLanguageDialog(true);
  };

  const handleSaveLanguage = async () => {
    if (!langForm.language_code || !langForm.language_name || !langForm.site_url) {
      toast.error('Code, name, and site URL are required');
      return;
    }
    setSavingLanguage(true);
    try {
      if (editingLanguage) {
        const response = await supabase.from('language_sites').update(langForm).eq('id', editingLanguage.id).select().single();
        response.data;
        toast.success('Language updated');
      } else {
        const response = await supabase.from('language_sites').insert(langForm).select().single();
        response.data;
        toast.success('Language added');
      }
      await loadLanguages();
      setShowAddLanguageDialog(false);
    } catch (e) {
      toast.error('Failed to save language: ' + e.message);
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleDeleteLanguage = async (lang) => {
    if (!confirm(`Delete language "${lang.language_name}"? This cannot be undone.`)) return;
    await supabase.from('language_sites').delete().eq('id', lang.id);
    await loadLanguages();
    toast.success('Language deleted');
  };

  const [migratingPartners, setMigratingPartners] = useState(false);
  const [removingPartners, setRemovingPartners] = useState(false);

  const handleEstimateMigrate = async () => {
    const { data } = await supabase.from('customers').select('*');
    const customers = data || [];
    const partnerCustomers = customers.filter(c =>
      c.type === 'business' || c.partner_status === 'active' || c.partner_status === 'lead'
    );
    setMigratePartnersEstimate(partnerCustomers.length);
  };

  const handleMigratePartners = async () => {
    setMigratingPartners(true);
    // TODO: Migrate to Supabase Edge Function
    console.warn('TODO: Migrate base44.functions.invoke(migratePartnersFromCustomers) to Supabase Edge Function');
    // const response = await supabase.functions.invoke('migratePartnersFromCustomers');
    setMigratingPartners(false);
    // toast.success(response.data.summary);
    // setMigrationResults(response.data);
    setShowMigratePartnersDialog(false);
    setMigratePartnersEstimate(null);
  };

  const handleEstimateRemove = async () => {
    const { data } = await supabase.from('customers').select('*');
    const customers = data || [];
    const partnerCustomers = customers.filter(c =>
      c.type === 'business' || c.partner_status === 'active' || c.partner_status === 'lead'
    );
    setRemovePartnersEstimate(partnerCustomers.length);
  };

  const handleRemovePartners = async () => {
    setRemovingPartners(true);
    // TODO: Migrate to Supabase Edge Function
    console.warn('TODO: Migrate base44.functions.invoke(removePartnersFromCustomers) to Supabase Edge Function');
    // const response = await supabase.functions.invoke('removePartnersFromCustomers');
    setRemovingPartners(false);
    // toast.success(response.data.summary);
    setShowRemovePartnersDialog(false);
    setRemovePartnersEstimate(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ids = settingIdsRef.current;
      const updates = [];

      // Upsert each setting by key — all data stored in setting_json column
      const upsert = async (key, jsonData) => {
        const row = { setting_key: key, setting_json: jsonData, updated_at: new Date().toISOString() };
        if (ids[key]) {
          const { data: updated } = await supabase.from('global_settings').update({ setting_json: jsonData, updated_at: new Date().toISOString() }).eq('id', ids[key]).select().single();
          return updated;
        } else {
          const { data: created, error } = await supabase.from('global_settings').insert(row).select().single();
          if (error) { console.error('Insert error for', key, error); throw error; }
          ids[key] = created.id;
          return created;
        }
      };

      updates.push(upsert('included_services', includedServices));
      updates.push(upsert('excluded_services', excludedServices));
      updates.push(upsert('best_months', bestMonths));
      updates.push(upsert('ek_thresholds', ekThresholds));
      updates.push(upsert('company_config', {
        deposit_percentage: depositPercentage,
        bank_name: bankName,
        bank_account_name: bankAccountName,
        bank_iban: bankIban,
        bank_bic: bankBic,
        company_address: companyAddress,
        company_vat: companyVat,
      }));

      await Promise.all(updates);
      setHasUnsavedChanges(false);
      toast.success('Global settings saved');
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateEkThreshold = (index, field, value) => {
    const updated = ekThresholds.map((row, i) => {
      if (i !== index) return row;
      const newRow = { ...row, [field]: field === 'to' || field === 'from' ? Number(value) : value };
      return newRow;
    });
    // Cascade: high of row N = low of row N+1
    if (field === 'to' && index < updated.length - 1) {
      updated[index + 1] = { ...updated[index + 1], from: Number(value) };
    }
    setEkThresholds(updated);
    setHasUnsavedChanges(true);
  };

  const handleRecalculateRoutes = async () => {
    setRecalculating(true);
    try {
      // TODO: Migrate to Supabase Edge Function
      console.warn('TODO: Migrate base44.functions.invoke(recalculateAllRoutesDifficulty) to Supabase Edge Function');
      // const response = await supabase.functions.invoke('recalculateAllRoutesDifficulty');
      // toast.success(response.data?.message || 'Routes recalculated successfully');
    } catch (error) {
      toast.error('Failed to recalculate routes: ' + error.message);
    } finally {
      setRecalculating(false);
    }
  };

  // Service list management
  const addIncludedService = () => {
    if (newIncludedItem.trim()) {
      setIncludedServices([...includedServices, newIncludedItem.trim()]);
      setNewIncludedItem('');
      setHasUnsavedChanges(true);
    }
  };

  const addExcludedService = () => {
    if (newExcludedItem.trim()) {
      setExcludedServices([...excludedServices, newExcludedItem.trim()]);
      setNewExcludedItem('');
      setHasUnsavedChanges(true);
    }
  };

  const removeIncludedService = (index) => {
    const newItems = [...includedServices];
    newItems.splice(index, 1);
    setIncludedServices(newItems);
    setHasUnsavedChanges(true);
  };

  const removeExcludedService = (index) => {
    const newItems = [...excludedServices];
    newItems.splice(index, 1);
    setExcludedServices(newItems);
    setHasUnsavedChanges(true);
  };

  const updateIncludedService = (index, value) => {
    const newItems = [...includedServices];
    newItems[index] = value;
    setIncludedServices(newItems);
    setHasUnsavedChanges(true);
  };

  const updateExcludedService = (index, value) => {
    const newItems = [...excludedServices];
    newItems[index] = value;
    setExcludedServices(newItems);
    setHasUnsavedChanges(true);
  };

  const toggleMonth = (month) => {
    if (bestMonths.includes(month)) {
      setBestMonths(bestMonths.filter(m => m !== month));
    } else {
      setBestMonths([...bestMonths, month]);
    }
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = (result, listType) => {
    if (!result.destination) return;

    if (listType === 'included') {
      const newItems = Array.from(includedServices);
      const [reorderedItem] = newItems.splice(result.source.index, 1);
      newItems.splice(result.destination.index, 0, reorderedItem);
      setIncludedServices(newItems);
      setHasUnsavedChanges(true);
    } else if (listType === 'excluded') {
      const newItems = Array.from(excludedServices);
      const [reorderedItem] = newItems.splice(result.source.index, 1);
      newItems.splice(result.destination.index, 0, reorderedItem);
      setExcludedServices(newItems);
      setHasUnsavedChanges(true);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50/50">
        {/* Header */}
        <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
          <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

            <div className="relative z-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Global Settings</h1>
              <p className="text-slate-500 mt-2 font-medium text-lg">Manage settings that apply to all tours</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="relative z-10 gap-2 text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50 rounded-xl h-11 px-6 font-semibold transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="flex gap-6 min-h-[calc(100vh-140px)] px-6 lg:px-8 pb-8">
          {/* Vertical Nav */}
          <nav className="w-64 flex-shrink-0 pt-2 space-y-1">
            {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${activeSection === id
                  ? 'bg-white shadow-sm border border-slate-200/60 text-indigo-700'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${activeSection === id ? 'text-orange-600' : 'text-slate-400'}`} />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 max-w-4xl pt-2">

            {/* Included Services */}
            {activeSection === 'services' && (
              <Card className="bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl mb-6">
                <CardHeader>
                  <CardTitle>What's Included (All Tours)</CardTitle>
                  <CardDescription>Services included in every tour by default</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'included')}>
                    <Droppable droppableId="included-services">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 mb-4">
                          {includedServices.length === 0 ? (
                            <p className="text-sm text-slate-500 italic py-4">No included services yet</p>
                          ) : (
                            includedServices.map((service, index) => (
                              <Draggable key={index} draggableId={`inc-${index}`} index={index}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div {...provided.dragHandleProps} className="flex-shrink-0">
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <Input value={service} onChange={(e) => updateIncludedService(index, e.target.value)} className="flex-1 border-0 bg-transparent" />
                                    <Button variant="ghost" size="icon" onClick={() => removeIncludedService(index)} className="text-red-600 hover:text-red-700 flex-shrink-0">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                  <div className="flex gap-2">
                    <Input value={newIncludedItem} onChange={(e) => setNewIncludedItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addIncludedService()} placeholder="Add a service..." />
                    <Button onClick={addIncludedService} className="text-slate-900 bg-whi hover:bg-whi-hover flex-shrink-0"><Plus className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Excluded Services */}
            {activeSection === 'services' && (
              <Card className="bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl mb-6">
                <CardHeader>
                  <CardTitle>What's Not Included (All Tours)</CardTitle>
                  <CardDescription>Services NOT included in tours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'excluded')}>
                    <Droppable droppableId="excluded-services">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 mb-4">
                          {excludedServices.length === 0 ? (
                            <p className="text-sm text-slate-500 italic py-4">No excluded services yet</p>
                          ) : (
                            excludedServices.map((service, index) => (
                              <Draggable key={index} draggableId={`exc-${index}`} index={index}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div {...provided.dragHandleProps} className="flex-shrink-0">
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <Input value={service} onChange={(e) => updateExcludedService(index, e.target.value)} className="flex-1 border-0 bg-transparent" />
                                    <Button variant="ghost" size="icon" onClick={() => removeExcludedService(index)} className="text-red-600 hover:text-red-700 flex-shrink-0">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                  <div className="flex gap-2">
                    <Input value={newExcludedItem} onChange={(e) => setNewExcludedItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addExcludedService()} placeholder="Add a service..." />
                    <Button onClick={addExcludedService} className="text-slate-900 bg-whi hover:bg-whi-hover flex-shrink-0"><Plus className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Months */}
            {activeSection === 'season' && (
              <Card className="bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl mb-6">
                <CardHeader>
                  <CardTitle>Walking Season (All Tours)</CardTitle>
                  <CardDescription>Months when tours are available</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-6 gap-2">
                    {months.map(month => (
                      <Button key={month} onClick={() => toggleMonth(month)} className={`w-full font-semibold transition-all ${bestMonths.includes(month) ? 'bg-whi hover:bg-whi-hover text-slate-900' : 'border border-slate-300 text-slate-600 bg-white hover:bg-slate-100'}`}>
                        {month}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">{bestMonths.length === 0 ? 'No months selected' : `${bestMonths.length} months available`}</p>
                </CardContent>
              </Card>
            )}

            {/* EK Thresholds */}
            {activeSection === 'ek' && (
              <Card className="bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl mb-6">
                <CardHeader>
                  <CardTitle>Route EK Difficulty Thresholds</CardTitle>
                  <CardDescription>
                    Define the Effort Kilometre (EK) score ranges for each difficulty grade. The upper limit of each grade automatically becomes the lower limit of the next.
                    After saving, click "Recalculate All Routes" to apply the new thresholds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* How EK works explanation */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-slate-800 text-sm">How EK (Effort Kilometres) works</h4>
                    <p className="text-sm text-slate-600">
                      EK combines distance and ascent into a single effort score, then applies a terrain multiplier for off-trail conditions:
                    </p>
                    <div className="bg-white border border-slate-200 rounded-md px-4 py-2 font-mono text-sm text-slate-700 text-center">
                      EK = Distance (km) + Ascent (m) ÷ 100 <span className="text-slate-400 mx-2">×</span> Terrain Modifier
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Terrain modifiers:</p>
                        <ul className="space-y-0.5">
                          <li>No modifier (paths/roads) — ×1.0</li>
                          <li>Light bog — ×1.15</li>
                          <li>Exposed ridge — ×1.20</li>
                          <li>Heavy bog — ×1.30</li>
                          <li>Scrambling — ×1.35</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Example routes:</p>
                        <ul className="space-y-0.5">
                          <li>15 km / 200 m ascent = <strong>17 EK</strong></li>
                          <li>20 km / 400 m ascent = <strong>24 EK</strong></li>
                          <li>22 km / 600 m ascent = <strong>28 EK</strong></li>
                          <li>24 km / 900 m ascent = <strong>33 EK</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Grade examples table */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Typical route examples per grade</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Grade</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">EK range</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Example route</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Who it suits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            { grade: 'Easy', color: 'bg-green-100 text-green-800', range: '< 23', example: '15 km / 200 m', suits: 'Beginners, leisurely walkers' },
                            { grade: 'Moderate', color: 'bg-yellow-100 text-yellow-800', range: '23–28', example: '20 km / 400 m', suits: 'Regular walkers, some fitness' },
                            { grade: 'Challenging', color: 'bg-orange-100 text-orange-800', range: '28–32', example: '22 km / 700 m', suits: 'Experienced walkers' },
                            { grade: 'Challenging+', color: 'bg-red-100 text-red-800', range: '> 32', example: '25 km / 900 m+', suits: 'Very fit, mountain experience' },
                          ].map(row => (
                            <tr key={row.grade} className="hover:bg-slate-50">
                              <td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.color}`}>{row.grade}</span></td>
                              <td className="px-3 py-2 font-mono text-slate-600">{row.range}</td>
                              <td className="px-3 py-2 text-slate-600">{row.example}</td>
                              <td className="px-3 py-2 text-slate-500">{row.suits}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">EK ranges above reflect current threshold settings. Adjust the thresholds below to change the boundaries.</p>
                  </div>

                  {/* Editable thresholds table */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Edit thresholds</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Grade</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Code</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">From (EK ≥)</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">To (EK &lt;)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ekThresholds.map((row, i) => (
                            <tr key={row.grade} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.grade === 'Easy' ? 'bg-green-100 text-green-800' :
                                  row.grade === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                    row.grade === 'Challenging' ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                                  }`}>{row.grade}</span>
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={row.code}
                                  onChange={(e) => updateEkThreshold(i, 'code', e.target.value)}
                                  className="w-16 h-8 text-center font-mono"
                                  maxLength={2}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={row.from}
                                  readOnly={i > 0}
                                  className={`w-24 h-8 ${i > 0 ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                  type="number"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {i < ekThresholds.length - 1 ? (
                                  <Input
                                    value={row.to}
                                    onChange={(e) => updateEkThreshold(i, 'to', e.target.value)}
                                    className="w-24 h-8"
                                    type="number"
                                    min={row.from}
                                  />
                                ) : (
                                  <span className="text-slate-400 text-xs px-2">∞ (no upper limit)</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-3">After saving the thresholds above, recalculate all routes to apply the new grades:</p>
                    <Button
                      onClick={handleRecalculateRoutes}
                      disabled={recalculating}
                      variant="outline"
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                      {recalculating ? 'Recalculating...' : 'Recalculate All Routes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Configuration */}
            {activeSection === 'company' && (
              <Card className="bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl mb-6">
                <CardHeader>
                  <CardTitle>Company Configuration</CardTitle>
                  <CardDescription>Bank details, company address, and deposit settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Deposit Percentage (%)</Label>
                    <Input type="number" min="0" max="100" value={depositPercentage} onChange={(e) => { setDepositPercentage(Number(e.target.value)); setHasUnsavedChanges(true); }} />
                    <p className="text-xs text-slate-500 mt-1">Default: 30%</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-4">Bank Details</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Bank Name</Label>
                        <Input value={bankName} onChange={(e) => { setBankName(e.target.value); setHasUnsavedChanges(true); }} placeholder="e.g., AIB" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Account Name</Label>
                        <Input value={bankAccountName} onChange={(e) => { setBankAccountName(e.target.value); setHasUnsavedChanges(true); }} placeholder="e.g., Walking Holiday Ireland" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">IBAN</Label>
                        <Input value={bankIban} onChange={(e) => { setBankIban(e.target.value); setHasUnsavedChanges(true); }} placeholder="e.g., IE29AIBK93115212345678" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">BIC/SWIFT</Label>
                        <Input value={bankBic} onChange={(e) => { setBankBic(e.target.value); setHasUnsavedChanges(true); }} placeholder="e.g., AIBKIE2D" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-4">Company Details</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Company Address</Label>
                        <Input value={companyAddress} onChange={(e) => { setCompanyAddress(e.target.value); setHasUnsavedChanges(true); }} placeholder="e.g., 132 Rathmount, Blackrock, A91 NN24, Co. Louth" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">VAT Number</Label>
                        <Input value={companyVat} onChange={(e) => { setCompanyVat(e.target.value); setHasUnsavedChanges(true); }} placeholder="e.g., IE8340536L" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {activeSection === 'languages' && (
              <Card className="bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Language Sites</CardTitle>
                    <CardDescription>Manage languages/sites for content translation and publishing</CardDescription>
                  </div>
                  <Button onClick={openAddLanguage} className="bg-whi text-slate-900 hover:bg-whi-hover gap-2">
                    <Plus className="w-4 h-4" /> Add Language
                  </Button>
                </CardHeader>
                <CardContent>
                  {languages.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4">No languages configured yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {languages.map(lang => (
                        <div key={lang.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-2xl">{lang.flag_emoji || '🌐'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{lang.language_name} <span className="text-slate-400 font-normal text-xs uppercase ml-1">{lang.language_code}</span></p>
                            <p className="text-xs text-slate-500 truncate">{lang.site_url}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lang.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                            {lang.status}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => openEditLanguage(lang)} className="text-slate-500 hover:text-slate-900">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteLanguage(lang)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Data Migration */}
            {activeSection === 'admin' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Data Migration & Cleanup
                  </CardTitle>
                  <CardDescription>Admin tools for partner data management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Step 1: Migrate Partners to New Table</h4>
                      <p className="text-sm text-slate-700 mb-3">Copy all B2B partner records from Customer table to the new Partner table. Safe to re-run without creating duplicates.</p>
                      <Button onClick={() => { handleEstimateMigrate(); setShowMigratePartnersDialog(true); }} className="btn-whi-primary">Migrate Partners to Partner Table</Button>
                    </div>
                    <div className="pt-4 border-t border-blue-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Step 2: Remove from Customer Table</h4>
                      <p className="text-sm text-slate-700 mb-3">After migration, remove the duplicated partner records from the Customer table. Only deletes records that have a matching Partner.</p>
                      <Button onClick={() => { handleEstimateRemove(); setShowRemovePartnersDialog(true); }} className="btn-whi-destructive">Remove Migrated Partners from Customers</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>{/* end content */}
        </div>{/* end flex */}
      </div>{/* end outer */}

      {/* Migrate Partners Dialog */}
      <Dialog open={showMigratePartnersDialog} onOpenChange={setShowMigratePartnersDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Migrate Partners to Partner Table
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!migrationResults ? (
              <>
                <p className="text-sm text-slate-600">
                  This will copy {migratePartnersEstimate || '...'} partner records from the Customer table to the new Partner table.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Safe to re-run:</strong> Duplicate protection checks if partners already exist — no duplicates will be created.
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-green-700">{migrationResults.summary}</p>
                </div>
                {migrationResults.results.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Migration Log:</p>
                    <div className="space-y-1">
                      {migrationResults.results.map((result, idx) => (
                        <div key={idx} className="text-xs text-slate-600 font-mono">
                          <span className={result.action === 'Created' ? 'text-green-600' : result.action === 'Skipped' ? 'text-amber-600' : 'text-red-600'}>
                            [{result.action}]
                          </span> {result.customer} - {result.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!migrationResults ? (
              <>
                <Button
                  onClick={() => setShowMigratePartnersDialog(false)}
                  className="btn-whi-outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMigratePartners}
                  disabled={migratingPartners}
                  className="btn-whi-primary"
                >
                  {migratingPartners ? 'Migrating...' : 'Start Migration'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setShowMigratePartnersDialog(false);
                  setMigrationResults(null);
                }}
                className="btn-whi-primary"
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Language Dialog */}
      <Dialog open={showAddLanguageDialog} onOpenChange={setShowAddLanguageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLanguage ? 'Edit Language' : 'Add Language'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-1 block">Language Code <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. de, nl, es" value={langForm.language_code} onChange={e => setLangForm(f => ({ ...f, language_code: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1 block">Language Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. German, Dutch" value={langForm.language_name} onChange={e => setLangForm(f => ({ ...f, language_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1 block">Flag Emoji</Label>
              <Input placeholder="e.g. 🇩🇪" value={langForm.flag_emoji} onChange={e => setLangForm(f => ({ ...f, flag_emoji: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1 block">Site URL <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. https://walkingholidayireland.de" value={langForm.site_url} onChange={e => setLangForm(f => ({ ...f, site_url: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1 block">Status</Label>
              <Select value={langForm.status} onValueChange={v => setLangForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLanguageDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveLanguage} disabled={savingLanguage} className="bg-whi text-slate-900 hover:bg-whi-hover">
              {savingLanguage ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Partners Confirmation Dialog */}
      <Dialog open={showRemovePartnersDialog} onOpenChange={setShowRemovePartnersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Remove Migrated Partners
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This will permanently delete {removePartnersEstimate || '...'} partner records from the Customer table. These records have already been copied to the Partner table.
            </p>
            <p className="text-sm text-slate-600">
              <strong>Safety check:</strong> Only records with a matching Partner entry will be deleted. Others will be skipped and logged.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRemovePartnersDialog(false)}
              className="btn-whi-outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemovePartners}
              disabled={removingPartners}
              className="btn-whi-destructive"
            >
              {removingPartners ? 'Processing...' : 'Delete Partner Records'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}