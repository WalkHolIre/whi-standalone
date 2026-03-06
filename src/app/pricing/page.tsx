"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Edit2, Save, X, ExternalLink,
    Search, MapPin, Gauge, Clock
} from 'lucide-react';

export default function PricingPage() {
    const queryClient = useQueryClient();
    const [editMode, setEditMode] = useState(false);
    const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});

    // Filters
    const [selectedDestination, setSelectedDestination] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch data from Supabase
    const { data: tours = [], isLoading: toursLoading } = useQuery({
        queryKey: ['tours'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tours')
                .select(`*, destinations(*)`)
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    const { data: destinations = [] } = useQuery({
        queryKey: ['destinations'],
        queryFn: async () => {
            const { data, error } = await supabase.from('destinations').select('*');
            if (error) throw error;
            return data;
        }
    });

    // Filter tours
    const filteredTours = useMemo(() => {
        return tours.filter((tour: any) => {
            const matchesSearch = tour.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tour.code?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDest = selectedDestination === 'all' || tour.destination_id === selectedDestination;
            return matchesSearch && matchesDest;
        });
    }, [tours, searchQuery, selectedDestination]);

    const updatePricesMutation = useMutation({
        mutationFn: async () => {
            const updates = Object.entries(priceChanges).map(([id, price]) =>
                supabase.from('tours').update({ price_per_person_eur: price }).eq('id', id)
            );
            await Promise.all(updates);
        },
        onSuccess: () => {
            setPriceChanges({});
            setEditMode(false);
            queryClient.invalidateQueries({ queryKey: ['tours'] });
        }
    });

    const handlePriceChange = (id: string, val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setPriceChanges(prev => ({ ...prev, [id]: num }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Tour Pricing</h1>
                    <p className="text-slate-500 text-sm">Bulk manage tour prices and regional availability</p>
                </div>

                <div className="flex gap-2">
                    {editMode ? (
                        <>
                            <Button variant="outline" onClick={() => { setEditMode(false); setPriceChanges({}); }}>
                                <X className="w-4 h-4 mr-2" /> CANCEL
                            </Button>
                            <Button onClick={() => updatePricesMutation.mutate()} disabled={Object.keys(priceChanges).length === 0}>
                                <Save className="w-4 h-4 mr-2" /> SAVE CHANGES
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setEditMode(true)}>
                            <Edit2 className="w-4 h-4 mr-2" /> EDIT PRICES
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search tours..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="border rounded-md px-3 text-sm bg-white"
                        value={selectedDestination}
                        onChange={(e) => setSelectedDestination(e.target.value)}
                    >
                        <option value="all">ALL DESTINATIONS</option>
                        {destinations.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Tour Details</th>
                                    <th className="text-center p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Stats</th>
                                    <th className="text-right p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Price (EUR)</th>
                                    <th className="text-center p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {toursLoading ? (
                                    <tr><td colSpan={4} className="p-10 text-center text-slate-400">Loading price catalog...</td></tr>
                                ) : filteredTours.map((tour: any) => (
                                    <tr key={tour.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{tour.name}</div>
                                            <div className="text-[10px] font-mono text-slate-400">{tour.code} • {tour.destinations?.name}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-4 text-slate-500">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-whi" /> {tour.duration_days}d</span>
                                                <span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-whi" /> {tour.difficulty_level || 'MED'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {editMode ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-slate-400 font-bold">€</span>
                                                    <Input
                                                        type="number"
                                                        className="w-24 text-right h-8"
                                                        defaultValue={tour.price_per_person_eur}
                                                        onChange={(e) => handlePriceChange(tour.id, e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-lg font-black text-slate-800">
                                                    €{(tour.price_per_person_eur || 0).toLocaleString()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Badge variant={tour.status === 'published' ? 'success' : 'outline'} className="text-[10px] font-black uppercase">
                                                {tour.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
