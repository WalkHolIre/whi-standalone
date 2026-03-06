"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    Plus, Search, Navigation,
    TrendingUp, TrendingDown, Clock,
    Map, Filter, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function RouteLibraryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('all');

    const { data: routes, isLoading } = useQuery({
        queryKey: ['routes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('routes')
                .select(`*, destinations(name)`)
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    const filteredRoutes = routes?.filter((route: any) => {
        const matchesSearch = route.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            route.route_startpoint?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = gradeFilter === 'all' || route.difficulty_grade === gradeFilter;
        return matchesSearch && matchesGrade;
    }) || [];

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'Easy': return 'bg-green-100 text-green-700 border-green-200';
            case 'Moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Challenging': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Challenging+': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-whi-purple uppercase tracking-tight">Route Library</h1>
                    <p className="text-slate-500 text-sm">Centralized hiking intelligence & GPX management</p>
                </div>
                <Button className="gap-2 font-bold uppercase text-[10px] tracking-widest">
                    <UploadIcon className="w-4 h-4" /> Import GPX
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-whi-purple text-white border-none">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-white/50 uppercase">Total Routes</p>
                            <p className="text-2xl font-black">{routes?.length || 0}</p>
                        </div>
                        <Navigation className="w-8 h-8 text-whi" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Distance</p>
                            <p className="text-2xl font-black text-slate-800">
                                {routes?.length ? Math.round(routes.reduce((acc: any, r: any) => acc + (r.distance_km || 0), 0) / routes.length) : 0} km
                            </p>
                        </div>
                        <Map className="w-8 h-8 text-slate-200" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">System Health</p>
                            <p className="text-2xl font-black text-green-500">100%</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by route name or start point..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'Easy', 'Moderate', 'Challenging', 'Challenging+'].map((grade) => (
                        <Button
                            key={grade}
                            variant={gradeFilter === grade ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setGradeFilter(grade)}
                            className="text-[10px] font-black uppercase tracking-wider"
                        >
                            {grade}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center text-slate-400 italic">Syncing trail data...</div>
                ) : filteredRoutes.map((route: any) => (
                    <Card key={route.id} className="group hover:ring-2 hover:ring-whi transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 leading-tight">
                                        {route.name}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                        {route.destinations?.name || 'Inis Mor'}
                                    </p>
                                </div>
                                <Badge className={cn("text-[10px] font-black uppercase tracking-tighter", getGradeColor(route.difficulty_grade))}>
                                    {route.difficulty_grade || 'UNGRADED'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">DISTANCE</p>
                                    <p className="text-sm font-black text-slate-800">{route.distance_km || '—'} <span className="text-[10px] opacity-40">KM</span></p>
                                </div>
                                <div className="text-center border-x border-slate-50 px-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">EFFORT KM</p>
                                    <p className="text-sm font-black text-whi">{route.effort_km || '—'} <span className="text-[10px] opacity-40">EK</span></p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ELEVATION</p>
                                    <p className="text-sm font-black text-slate-800">↑{route.elevation_gain_m || '0'} <span className="text-[10px] opacity-40">M</span></p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">Est. {route.estimated_duration_hours || '4.5'} hrs</span>
                                </div>
                                <Link href={`/routes/${route.id}`}>
                                    <Button variant="ghost" size="sm" className="text-whi hover:text-whi hover:bg-whi/5 gap-2 text-[10px] font-black uppercase">
                                        View Maps <Navigation className="w-3 h-3" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function UploadIcon(props: any) {
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
    )
}
