"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Navigation, TrendingUp,
    TrendingDown, Clock, Save, Edit2, Loader2,
    AlertTriangle, Gauge, Mountain, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { calculateDifficulty, TerrainModifier } from '@/lib/difficulty-engine';
import RouteMap from '@/components/RouteMap';
import ElevationProfile from '@/components/ElevationProfile';

export default function RouteDetailPage({ params }: { params: { id: string } }) {
    const queryClient = useQueryClient();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Fetch Route Data
    const { data: route, isLoading } = useQuery({
        queryKey: ['route', params.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('routes')
                .select(`*, destinations(*)`)
                .eq('id', params.id)
                .single();
            if (error) throw error;
            return data;
        }
    });

    // Mutation to update terrain & difficulty
    const updateMutation = useMutation({
        mutationFn: async (newModifier: TerrainModifier) => {
            const stats = calculateDifficulty(
                route.distance_km || 0,
                route.elevation_gain_m || 0,
                newModifier
            );

            const { error } = await supabase
                .from('routes')
                .update({
                    terrain_modifier: newModifier,
                    effort_km: stats.effort_km,
                    difficulty_score: stats.difficulty_score,
                    difficulty_grade: stats.difficulty_grade
                })
                .eq('id', params.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['route', params.id] });
        }
    });

    if (isLoading) return <div className="py-20 text-center animate-pulse font-black text-slate-200 uppercase tracking-widest">Sycing Trail Data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/routes">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="w-5 h-5 text-whi" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-whi-purple uppercase tracking-tight">{route.name}</h1>
                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">{route.destinations?.name || 'AREA OVERVIEW'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Map & Chart Section */}
                    <div className="grid grid-cols-1 gap-4">
                        <Card className="h-[450px] overflow-hidden border-none shadow-xl relative z-10">
                            <RouteMap
                                coordinates={route.gpx_coordinates || []}
                                hoveredIndex={hoveredIndex}
                                waypoints={route.waypoints}
                                startPoint={{ lat: route.gpx_coordinates?.[0]?.[0], lng: route.gpx_coordinates?.[0]?.[1], name: route.route_startpoint }}
                                endPoint={{ lat: route.gpx_coordinates?.[route.gpx_coordinates?.length - 1]?.[0], lng: route.gpx_coordinates?.[route.gpx_coordinates?.length - 1]?.[1], name: route.route_endpoint }}
                            />
                        </Card>
                        <ElevationProfile
                            coordinates={route.gpx_coordinates || []}
                            onHover={setHoveredIndex}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                        <Card className="bg-whi border-none overflow-hidden relative">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">EFFORT SCORE</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black">{route.effort_km || '—'}</span>
                                    <span className="text-xs font-bold opacity-60 uppercase">EK</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px] font-black uppercase tracking-tight">
                                        {route.difficulty_grade || 'MODERATE'}
                                    </Badge>
                                </div>
                                <Mountain className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                            </CardContent>
                        </Card>

                        <Card className="bg-whi-purple border-none shadow-sm relative overflow-hidden">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">DISTANCE</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black">{route.distance_km || '—'}</span>
                                    <span className="text-xs font-bold opacity-40 uppercase">KM</span>
                                </div>
                                <p className="mt-4 text-[10px] font-bold opacity-40 truncate uppercase font-mono tracking-tighter">
                                    REF: {route.id.slice(0, 8)}...
                                </p>
                                <Navigation className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5" />
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-none shadow-sm relative overflow-hidden">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">TOTAL GAINED</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black">↑{route.elevation_gain_m || '0'}</span>
                                    <span className="text-xs font-bold opacity-40 uppercase">M</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-white/40 font-bold text-[10px] uppercase tracking-widest">
                                    Max Elev: {route.max_elevation_m || '—'}m
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-100 shadow-sm">
                        <CardHeader className="border-b border-slate-50 p-6">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[3px] flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-whi" /> Difficulty Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Terrain Complexity Modifier</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['none', 'light_bog', 'heavy_bog', 'exposed_ridge', 'scrambling'].map((mod) => (
                                            <button
                                                key={mod}
                                                onClick={() => updateMutation.mutate(mod as TerrainModifier)}
                                                disabled={updateMutation.isPending}
                                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${route.terrain_modifier === mod
                                                        ? "bg-whi-purple text-white border-whi-purple shadow-lg scale-105"
                                                        : "bg-white text-slate-400 border-slate-200 hover:border-whi hover:text-whi"
                                                    }`}
                                            >
                                                {mod.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl flex items-start gap-4 border border-slate-100 mt-6">
                                        <div className="bg-whi/10 p-2 rounded-lg">
                                            <Info className="w-4 h-4 text-whi" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-800 uppercase font-black tracking-tight">Dynamic Recalculation</p>
                                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                                                The system automatically applies Naismith multipliers. Changing terrain will instantly update the Effort KM and Difficulty Grade across the entire platform.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 p-8 rounded-2xl space-y-6 border border-slate-100">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-[2px]">EST. WALK TIME</span>
                                        <span className="font-black text-slate-800 text-sm">
                                            {route.estimated_duration_hours ? `~${Math.floor(route.estimated_duration_hours)}h ${Math.round((route.estimated_duration_hours % 1) * 60)}m` : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-[2px]">DIFFICULTY SCORE</span>
                                        <span className="font-black text-whi text-lg">{route.difficulty_score || route.effort_km}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-200/50">
                                        <span className="text-slate-400 font-bold uppercase tracking-[2px]">MIN. ALTITUDE</span>
                                        <span className="font-black text-slate-800">{route.min_elevation_m || '0'}M</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-[2px]">MAX. ALTITUDE</span>
                                        <span className="font-black text-slate-800">{route.max_elevation_m || '0'}M</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Sidebar */}
                <div className="space-y-6">
                    <Card className="bg-whi-purple border-none text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                        <CardHeader className="relative z-10">
                            <CardTitle className="text-[10px] font-black tracking-[3px] opacity-40 uppercase">Operational Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 relative z-10">
                            <Button className="w-full bg-white text-whi-purple hover:bg-slate-100 font-black uppercase text-[10px] h-12 shadow-xl tracking-widest">
                                <Edit2 className="w-4 h-4 mr-2" /> Modify Route Details
                            </Button>
                            <Button variant="outline" className="w-full border-white/10 bg-white/5 text-white/50 font-black uppercase text-[10px] h-12 hover:bg-white/10 transition-all tracking-widest">
                                <AlertTriangle className="w-4 h-4 mr-2" /> Report GPX Error
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-100 shadow-sm">
                        <CardContent className="p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-8">Data Integrity Check</p>
                            <div className="space-y-5">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <span className="text-slate-400">Track Samples</span>
                                    <span className="text-slate-800">{route.gpx_coordinates?.length.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <span className="text-slate-400">Active Waypoints</span>
                                    <span className="text-slate-800">{route.waypoints?.length || 0}</span>
                                </div>
                                <div className="pt-2">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[9px] font-black text-whi uppercase tracking-[2px]">System Sync</span>
                                        <span className="text-[10px] font-black text-slate-800">100%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-whi-purple to-whi w-full h-full shadow-[0_0_15px_rgba(241,126,0,0.3)]" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
