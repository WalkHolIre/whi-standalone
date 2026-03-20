// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { parseProviderSpreadsheet } from '../utils/spreadsheetParser';
import { Loader2, Edit2, Save, X, ExternalLink, RefreshCw, Upload, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react';

export default function TourPricingManagement() {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [priceChanges, setPriceChanges] = useState({});
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState(null);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  const { data: tours = [], isLoading: toursLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      const all = data || [];
      return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  });

  const { data: destinations = [], isLoading: destinationsLoading } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    }
  });

  // Computed hasChanges
  const hasChanges = useMemo(() => {
    return Object.keys(priceChanges).length > 0;
  }, [priceChanges]);

  // Get unique durations and difficulties
  const durations = useMemo(() => {
    const unique = [...new Set(tours.map(t => t.duration_days).filter(Boolean))];
    return unique.sort((a, b) => a - b);
  }, [tours]);

  const difficulties = useMemo(() => {
    const unique = [...new Set(tours.map(t => t.tour_difficulty_grade || t.difficulty_level).filter(Boolean))];
    return unique;
  }, [tours]);

  // Filter tours
  const filteredTours = useMemo(() => {
    if (destinationsLoading || regionsLoading) return tours;

    return tours.filter(tour => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (tour.name || '').toLowerCase().includes(query);
        const matchesCode = (tour.code || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      // Destination filter (check this first)
      if (selectedDestination !== 'all') {
        if (!tour.destination_id || tour.destination_id !== selectedDestination) return false;
      }

      // Region filter
      if (selectedRegion !== 'all') {
        // Skip tours without destination_id
        if (!tour.destination_id) return false;
        const dest = destinations.find(d => d.id === tour.destination_id);
        if (!dest || dest.region_id !== selectedRegion) return false;
      }

      // Duration filter
      if (selectedDuration !== 'all') {
        const duration = parseInt(selectedDuration);
        if (tour.duration_days !== duration) return false;
      }

      // Difficulty filter
      if (selectedDifficulty !== 'all') {
        const tourDiff = tour.tour_difficulty_grade || tour.difficulty_level || '';
        if (tourDiff !== selectedDifficulty) return false;
      }

      return true;
    });
  }, [tours, destinations, destinationsLoading, regionsLoading, searchQuery, selectedRegion, selectedDestination, selectedDuration, selectedDifficulty]);

  // Update price mutation
  const updatePricesMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(priceChanges).map(async ([tourId, price]) => {
        const response = await supabase.from('tours').update({ price_per_person_eur: parseFloat(price) }).eq('id', tourId).select().single();
        return response.data;
      });
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success(`Updated ${Object.keys(priceChanges).length} tour prices`);
      setPriceChanges({});
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => {
      toast.error('Failed to update prices: ' + error.message);
    }
  });

  const handlePriceChange = (tourId, newPrice) => {
    const parsed = newPrice === '' ? '' : parseFloat(newPrice);
    setPriceChanges(prev => ({
      ...prev,
      [tourId]: isNaN(parsed) ? '' : parsed
    }));
  };

  const handleSave = () => {
    if (Object.keys(priceChanges).length === 0) {
      toast.error('No price changes to save');
      return;
    }
    updatePricesMutation.mutate();
  };

  const handleCancel = () => {
    setPriceChanges({});
    setEditMode(false);
  };

  const getDisplayPrice = (tour) => {
    return priceChanges[tour.id] !== undefined ? priceChanges[tour.id] : tour.price_per_person_eur || 0;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisData(null);
    try {
      const result = await parseProviderSpreadsheet(file);
      if (!result || result.length === 0) {
        toast.error('No matching data found in the spreadsheet');
      } else {
        setAnalysisData(result);
        toast.success(`Successfully analyzed costs for ${result.length} distinct tours from spreadsheet!`);
      }
    } catch (err) {
      toast.error('Failed to parse spreadsheet: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    const variants = {
      easy: { className: 'bg-sky-100/80 text-sky-700 border-sky-200/50', label: 'Easy' },
      moderate: { className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50', label: 'Moderate' },
      challenging: { className: 'bg-orange-100/80 text-orange-700 border-orange-200/50', label: 'Challenging' },
      strenuous: { className: 'bg-red-100/80 text-red-700 border-red-200/50', label: 'Strenuous' }
    };
    const variant = variants[difficulty?.toLowerCase()] || variants.moderate;
    return <Badge variant="outline" className={`font-medium px-2 py-0.5 rounded border ${variant.className}`}>{variant.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      published: { className: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50', label: 'Published' },
      draft: { className: 'bg-amber-100/80 text-amber-700 border-amber-200/50', label: 'Draft' },
      archived: { className: 'bg-slate-100/80 text-slate-700 border-slate-200/50', label: 'Archived' }
    };
    const variant = variants[status?.toLowerCase()] || variants.draft;
    return <Badge variant="outline" className={`font-medium px-2 py-0.5 rounded border ${variant.className}`}>{variant.label}</Badge>;
  };

  const [activeTab, setActiveTab] = useState('pricing');

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-slate-50/50 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-[2rem] p-8 lg:p-10 mb-8 border border-white/10 shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl mix-blend-screen pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-sm font-medium mb-4 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                Financial Controls
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">Pricing & Margins</h1>
              <p className="text-indigo-200 text-lg max-w-xl leading-relaxed">Manage tour prices and analyze supplier costs.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 bg-white/10 p-1 rounded-2xl relative z-10 w-full sm:w-auto backdrop-blur-md border border-white/20">
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'pricing'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
                  }`}
              >
                Tour Base Prices
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'analysis'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
                  }`}
              >
                Cost Analysis Mode
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'pricing' && (
          <>
            {/* Filters Box */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 p-6 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative col-span-1 lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search tours or codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 border-slate-200 rounded-xl bg-white/70 focus-visible:ring-indigo-500 shadow-sm"
                  />
                </div>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                  <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-80">
                    <SelectItem value="all">All Destinations</SelectItem>
                    {destinations.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger className="w-full h-11 rounded-xl shadow-sm border-slate-200 bg-white/70 font-medium">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-80">
                    <SelectItem value="all">All Durations</SelectItem>
                    {durations.map(d => (
                      <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Pricing Table */}
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm overflow-hidden flex flex-col mb-8">
              <div className="p-6 border-b border-slate-100/60 bg-slate-50/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Direct Prices</h3>
                  {hasChanges && (
                    <p className="text-sm font-semibold text-amber-600 mt-1">
                      {Object.keys(priceChanges).length} unsaved change{Object.keys(priceChanges).length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {editMode ? (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={!hasChanges || updatePricesMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all h-11 px-6 rounded-xl font-bold"
                      >
                        {updatePricesMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={updatePricesMutation.isPending}
                        className="h-11 px-6 rounded-xl font-semibold border-slate-200 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(true)}
                      className="bg-white hover:bg-slate-50 border-slate-200 font-bold h-11 px-6 rounded-xl shadow-sm"
                    >
                      <Edit2 className="w-4 h-4 mr-2 text-slate-500" />
                      Bulk Edit Prices
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-left py-4 px-6 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Tour Name & Code</th>
                      <th className="text-left py-4 px-6 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Destination</th>
                      <th className="text-left py-4 px-6 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Details</th>
                      <th className="text-center py-4 px-6 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Status</th>
                      <th className="text-right py-4 px-6 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Consumer Price (EUR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(toursLoading || destinationsLoading || regionsLoading) ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                        </td>
                      </tr>
                    ) : filteredTours.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-500">
                          <p className="font-medium text-base">No tours found</p>
                          <p className="mt-1 text-sm text-slate-400">Try adjusting your filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTours.map(tour => {
                        const destination = destinations.find(d => d.id === tour.destination_id);
                        const hasChange = priceChanges[tour.id] !== undefined;

                        return (
                          <tr key={tour.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors ${hasChange ? 'bg-amber-50/30 hover:bg-amber-50/50' : ''}`}>
                            <td className="py-3 px-6">
                              <Link
                                to={createPageUrl('AdminTourEditor') + `?id=${tour.id}`}
                                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors group flex items-start gap-1 flex-col"
                              >
                                {tour.name}
                                <span className="font-mono font-medium text-xs text-slate-500 group-hover:text-indigo-400">
                                  {tour.code || 'NO-CODE'}
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {destination?.name || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-slate-600 font-medium">{tour.duration_days} days</span>
                                {getDifficultyBadge(tour.tour_difficulty_grade || tour.difficulty_level)}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getStatusBadge(tour.status)}
                            </td>
                            <td className="py-3 px-6">
                              {editMode ? (
                                <div className="flex items-center justify-end gap-2 relative">
                                  <span className="text-slate-400 font-medium absolute left-3 z-10 pointer-events-none">€</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={getDisplayPrice(tour)}
                                    onChange={(e) => handlePriceChange(tour.id, e.target.value)}
                                    className={`w-32 pl-7 text-right h-9 font-medium ${hasChange ? 'border-amber-300 bg-amber-50/50 focus-visible:ring-amber-400' : 'bg-white'}`}
                                  />
                                </div>
                              ) : (
                                <div className={`text-right font-semibold text-base ${hasChange ? 'text-amber-600' : 'text-slate-900'}`}>
                                  €{(tour.price_per_person_eur || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {!analysisData && !isAnalyzing && (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-8 min-h-[400px]">
                <div className="flex-1 space-y-5">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto sm:mx-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Upload Provider Spreadsheet</h2>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-lg mx-auto sm:mx-0">
                      Import your historical booking data and service provider costs (accommodations, baggage transfers, taxis). We will automatically cross-reference this with your current tour inventory to provide a deep margin and profitability analysis.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl px-8 py-3.5 font-semibold">
                      <Upload className="w-5 h-5 opacity-80" />
                      Select CSV / Excel File
                    </Label>
                    <input id="csv-upload" type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
                  </div>
                </div>
                <div className="hidden md:block flex-1 border-l border-slate-100 pl-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner">
                    <h4 className="font-semibold text-slate-800 text-sm mb-3">Expected File Format Columns:</h4>
                    <ul className="space-y-2 text-sm text-slate-600 font-medium">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Service Provider Name</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Location / Town</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Category (e.g., Accommodation)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Cost per Night / Transfer Unit</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Currency</li>
                    </ul>
                    <div className="mt-5 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 italic">Ensure your spreadsheet maps directly to your active tours to enable dynamic margin calculator rendering.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm p-16 flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Analyzing Costs...</h3>
                <p className="text-slate-500 mt-2 text-sm">Cross-referencing provider segments with Active Tours.</p>
              </div>
            )}

            {analysisData && (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      Cost Analytics <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 ml-2 rounded-full border-none">{analysisData.length} Matches</Badge>
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Provider costs calculated by trip block segment.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-200" onClick={() => { setAnalysisData(null); document.getElementById('csv-upload').value = ''; }}>
                      Clear Data
                    </Button>
                    <Label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all rounded-lg h-9 px-4 text-sm font-medium">
                      Upload Different File
                    </Label>
                  </div>
                </div>

                <div className="p-0 border-b border-slate-200 last:border-0 divide-y divide-slate-100">
                  {analysisData.map((dataItem) => {
                    const mappedTour = tours.find(t => String(t.code).toUpperCase() === dataItem.trip_code) || tours.find(t => String(t.tour_difficulty_grade).toUpperCase() === dataItem.trip_code);
                    const sellingPrice = mappedTour ? mappedTour.price_per_person_eur || 0 : 0;
                    const isExpanded = expandedTrip === dataItem.trip_code;
                    const margin = sellingPrice - dataItem.total_cost_euro;
                    const marginPercent = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

                    return (
                      <div key={dataItem.trip_code} className="flex flex-col transition-colors hover:bg-slate-50/30">
                        <div
                          className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 lg:p-6 cursor-pointer"
                          onClick={() => setExpandedTrip(isExpanded ? null : dataItem.trip_code)}
                        >
                          <div className="mr-2 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-sm tracking-widest font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100/50">{dataItem.trip_code}</span>
                              <h4 className="font-bold text-slate-900 truncate">
                                {mappedTour ? mappedTour.name : 'Unmapped Tour ID'}
                              </h4>
                            </div>
                            {mappedTour ? (
                              <p className="text-sm text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
                                Current Status: {getStatusBadge(mappedTour.status)}
                                <span className="mx-1 text-slate-300">•</span>
                                <span className="text-emerald-600 font-semibold">{dataItem.providers.length} Booked Segments</span>
                              </p>
                            ) : (
                              <p className="text-sm text-amber-500 font-medium mt-1.5">No matching tour found in Ground Control DB.</p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8 lg:ml-auto w-full lg:w-auto p-4 lg:p-0 bg-slate-50 lg:bg-transparent rounded-xl lg:rounded-none">
                            <div className="flex flex-col">
                              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Supplier Costs</span>
                              <span className="font-bold text-lg text-slate-900">€{dataItem.total_cost_euro.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>

                            {mappedTour && (
                              <div className="flex flex-col pl-0 sm:pl-4 sm:border-l sm:border-slate-200">
                                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Retail Price</span>
                                <span className="font-bold text-lg text-slate-900">€{sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {mappedTour && sellingPrice > 0 && (
                              <div className="flex flex-col pl-0 sm:pl-4 sm:border-l sm:border-slate-200">
                                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Calculated Margin</span>
                                <div className="flex items-end gap-1.5">
                                  <span className={`font-bold text-lg ${margin > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    €{margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className={`text-sm font-semibold mb-0.5 ${marginPercent > 30 ? 'text-emerald-500' : marginPercent > 10 ? 'text-amber-500' : 'text-red-500'}`}>
                                    ({marginPercent.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dropdown Grid */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 pl-12 lg:pl-16 bg-slate-50/50 border-t border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {dataItem.providers.map((provider, i) => (
                                <div key={i} className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl p-3.5 shadow-sm hover:border-indigo-300 hover:shadow transition-all relative">
                                  <div className="absolute top-0 right-0 p-3.5 flex items-center text-xs font-semibold text-slate-500">
                                    <span suppressHydrationWarning>{provider.cost_euro > 0 ? `€${provider.cost_euro.toFixed(2)}` : provider.cost_gbp > 0 ? `£${provider.cost_gbp.toFixed(2)}` : ''}</span>
                                  </div>
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wide">
                                    {provider.service_type || 'Unknown'}
                                  </span>
                                  <h5 className="font-semibold text-slate-900 mt-2 pr-12 line-clamp-1" title={provider.provider_name}>
                                    {provider.provider_name}
                                  </h5>
                                  <p className="text-sm text-slate-500 mt-1 line-clamp-1" title={provider.program_segment}>
                                    {provider.program_segment}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}