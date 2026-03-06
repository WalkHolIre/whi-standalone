"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    Plus, Search, Calendar, Users,
    Mail, Euro, CheckCircle2, Clock,
    AlertCircle, Download, Send, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function BookingsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('all');

    const currentYear = new Date().getFullYear();

    // Fetch bookings from Supabase
    const { data: bookings, isLoading } = useQuery({
        queryKey: ['bookings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          partner_bookings (
            *,
            partners (*)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const filteredBookings = bookings?.filter((booking: any) => {
        const matchesSearch =
            booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            booking.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            booking.tour_name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
        const matchesYear = yearFilter === 'all' || (booking.start_date && new Date(booking.start_date).getFullYear() === parseInt(yearFilter));

        return matchesSearch && matchesStatus && matchesYear;
    }) || [];

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'success';
            case 'Provisional': return 'warning';
            case 'Cancelled': return 'error';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-whi-purple to-slate-600 bg-clip-text text-transparent">
                        Bookings Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage tour reservations and client data</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> New Booking
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Bookings', value: bookings?.length || 0, icon: Calendar, color: 'text-blue-600' },
                    { label: 'Confirmed', value: bookings?.filter((b: any) => b.status === 'Confirmed').length || 0, icon: CheckCircle2, color: 'text-green-600' },
                    { label: 'Pending', value: bookings?.filter((b: any) => b.status === 'Provisional').length || 0, icon: Clock, color: 'text-yellow-600' },
                    { label: 'Revenue (EUR)', value: '€' + (bookings?.reduce((acc: number, b: any) => acc + (b.total_price || 0), 0).toLocaleString() || '0'), icon: Euro, color: 'text-whi' },
                ].map((stat, i) => (
                    <Card key={i}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-black text-slate-800 mt-1">{stat.value}</p>
                            </div>
                            <stat.icon className={cn("w-8 h-8 opacity-20", stat.color)} />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters Bar */}
            <Card>
                <CardContent className="p-4 flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by name, ref or tour..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex border rounded-md overflow-hidden">
                            {['all', '2024', '2025'].map((year) => (
                                <button
                                    key={year}
                                    onClick={() => setYearFilter(year)}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold transition-colors",
                                        yearFilter === year ? "bg-whi text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {year.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        {/* Simple status dropdown mock */}
                        <select
                            className="border rounded-md px-3 text-xs font-bold bg-white text-slate-600 outline-none focus:ring-2 focus:ring-whi"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">ALL STATUS</option>
                            <option value="Confirmed">CONFIRMED</option>
                            <option value="Provisional">PROVISIONAL</option>
                            <option value="Cancelled">CANCELLED</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Bookings List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 animate-pulse">Loading amazing journeys...</div>
                ) : filteredBookings.map((booking: any) => (
                    <Card key={booking.id} className="group hover:border-whi/50 transition-all duration-300 hover:shadow-md cursor-pointer">
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row">
                                {/* Left Border Accent */}
                                <div className={cn("w-full md:w-2 h-2 md:h-auto",
                                    booking.status === 'Confirmed' ? "bg-green-500" :
                                        booking.status === 'Provisional' ? "bg-yellow-500" : "bg-slate-200"
                                )} />

                                <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-slate-800">{booking.customer_name}</h3>
                                            <Badge variant={getStatusVariant(booking.status)} className="text-[10px] font-black uppercase">
                                                {booking.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-mono text-slate-400">REF: {booking.booking_reference}</p>

                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3">
                                            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                <Map className="w-3.5 h-3.5 text-whi" />
                                                <span className="font-medium">{booking.tour_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                <Users className="w-3.5 h-3.5 text-whi" />
                                                <span>{booking.number_of_walkers} walkers</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                <Calendar className="w-3.5 h-3.5 text-whi" />
                                                <span>{booking.start_date ? format(new Date(booking.start_date), 'MMM d, yyyy') : 'TBD'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:items-end gap-2">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 font-bold uppercase">Total Price</p>
                                            <p className="text-2xl font-black text-slate-800">€{(booking.total_price || 0).toLocaleString()}</p>
                                        </div>
                                        {booking.status === 'Provisional' && (
                                            <Button size="sm" className="gap-2 text-[10px] font-black h-8">
                                                <Send className="w-3 h-3" /> SEND CONFIRMATION
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
