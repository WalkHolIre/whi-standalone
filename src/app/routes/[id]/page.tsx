"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Navigation, TrendingUp,
    TrendingDown, Clock, Save, Edit2, Loader2,
    AlertTriangle, Gauge, Mountain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { calculateDifficulty, TerrainModifier } from '@/lib/difficulty-engine';

export default function RouteDetailPage({ params }: { params: { id: string } }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

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
            // 1. Calculate new stats using our ported engine
            const stats = calculateDifficulty(
                route.distance_km || 0,
                route.elevation_gain_m || 0,
                newModifier
            );

            // 2. Persist to Supabase
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

    if (isLoading) return <div className="py-20 text-center animate-pulse font-black text-slate-200">DATA MAPPING...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/routes">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-whi-purple uppercase">{route.name}</h1>
                    <p className="text-xs font-bold text-slate-400 tracking-widest">{route.destinations?.name || 'AREA OVERVIEW'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Stats */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-whi border-none text-white overflow-hidden relative">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">EFFORT SCORE</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black">{route.effort_km || '—'}</span>
                                    <span className="text-xs font-bold opacity-60 uppercase">EK</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px] font-black uppercase">
                                        {route.difficulty_grade || 'MODERATE'}
                                    </Badge>
                                </div>
                                <Mountain className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                            </CardContent>
                        </Card>

                        <Card className="border-slate-100 shadow-sm">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DISTANCE</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black text-slate-800">{route.distance_km || '—'}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">KM</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-slate-500 font-bold text-[10px]">
                                    <TrendingUp className="w-3 h-3 text-green-500" /> Start: {route.route_startpoint || 'Point A'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-100 shadow-sm">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL GAINED</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black text-slate-800">↑{route.elevation_gain_m || '0'}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">M</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-slate-500 font-bold text-[10px]">
                                    <TrendingDown className="w-3 h-3 text-red-500" /> End: {route.route_endpoint || 'Point B'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Info Card */}
                    <Card>
                        <CardHeader className="border-b border-slate-50 p-6">
                            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-whi" /> Route Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                <div className="p-6 border-b md:border-b-0 md:border-r border-slate-50 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Terrain Complexity</label>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {['none', 'light_bog', 'heavy_bog', 'exposed_ridge', 'scrambling'].map((mod) => (
                                                <button
                                                    key={mod}
                                                    onClick={() => updateMutation.mutate(mod as TerrainModifier)}
                                                    disabled={updateMutation.isPending}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${route.terrain_modifier === mod
                                                            ? "bg-whi-purple text-white shadow-md scale-105"
                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                        }`}
                                                >
                                                    {mod.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
                                        <InfoIcon className="w-4 h-4 text-whi mt-0.5" />
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                            Changing the terrain modifier will automatically recalculate the **Effort KM** using the Naismith-based internal engine.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Estimated Walk Time</span>
                                        <span className="font-black text-slate-800">
                                            {route.estimated_duration_hours ? `~${Math.floor(route.estimated_duration_hours)}h ${Math.round((route.estimated_duration_hours % 1) * 60)}m` : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Difficulty Score</span>
                                        <span className="font-black text-whi">{route.difficulty_score || route.effort_km}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Min Elevation</span>
                                        <span className="font-black text-slate-800">{route.min_elevation_m || '0'}m</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-none text-white shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xs font-black tracking-[2px] opacity-40 uppercase">Admin Control</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full bg-white/10 hover:bg-white/20 border-white/5 font-bold uppercase text-[10px] h-12">
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Route Data
                            </Button>
                            <Button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 font-bold uppercase text-[10px] h-12">
                                Delete Forever
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Route Health</p>
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">GPX Link Integrity</span>
                                    <span className="text-green-500 font-bold">STABLE</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Waypoints</span>
                                    <span className="text-slate-800 font-bold">{route.waypoints?.length || 0}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                                    <div className="bg-whi w-full h-full" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function InfoIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="16" y2="12" />
            <line x1="12" x2="12.01" y1="8" y2="8" />
        </svg>
    )
}
