// @ts-nocheck
"use client";

import React from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Euro, Users, AlertCircle, Clock, FileText, XCircle, Calendar, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { LoadingState } from '@/components/LoadingState';

export default function Home() {
  const currentYear = new Date().getFullYear();

  // Fetch all bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*');
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes on dashboard
  });

  // Fetch all booking day services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['bookingDayServices'],
    queryFn: async () => {
      const { data } = await supabase.from('booking_day_services').select('*');
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes on dashboard
  });

  // Calculate metrics
  const thisYearBookings = bookings.filter(b => {
    if (!b.start_date) return false;
    return new Date(b.start_date).getFullYear() === currentYear;
  });

  const thisYearRevenue = thisYearBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const pendingBookings = bookings.filter(b => b.status === 'Enquiry' || b.status === 'Provisional');
  const outstandingBalances = bookings.filter(b =>
    (b.balance_due || 0) > 0 && b.payment_status !== 'Fully Paid'
  );

  // Action required metrics
  const newRequests = bookings.filter(b => b.status === 'Enquiry');
  const awaitingResponse = services.filter(s => s.status === 'Requested');
  const declinedServices = services.filter(s => s.status === 'Declined');

  const overduePayments = bookings.filter(b => {
    if ((b.balance_due || 0) <= 0 || !b.start_date) return false;
    const startDate = new Date(b.start_date);
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() - 42);
    return new Date() > dueDate;
  });

  // Upcoming departures (next 30 days)
  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  const upcomingDepartures = bookings
    .filter(b => {
      if (!b.start_date) return false;
      const startDate = new Date(b.start_date);
      return startDate >= today && startDate <= in30Days;
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 10);

  // Get service status for a booking
  const getServiceStatus = (bookingId) => {
    const bookingServices = services.filter(s => s.booking_id === bookingId);
    if (bookingServices.length === 0) return { color: 'text-red-500', icon: '🔴', label: 'No services' };

    const hasDeclined = bookingServices.some(s => s.status === 'Declined');
    if (hasDeclined) return { color: 'text-red-500', icon: '🔴', label: 'Declined' };

    const allConfirmed = bookingServices.every(s => s.status === 'Confirmed');
    if (allConfirmed) return { color: 'text-green-500', icon: '🟢', label: 'All confirmed' };

    return { color: 'text-yellow-500', icon: '🟡', label: 'In progress' };
  };

  // Recent activity (last 10 updated bookings)
  const recentActivity = [...bookings]
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 10);

  const keyMetrics = [
    {
      title: 'Total Bookings This Year',
      value: thisYearBookings.length,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Revenue This Year',
      value: `€${thisYearRevenue.toLocaleString()}`,
      icon: Euro,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending Bookings',
      value: pendingBookings.length,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Outstanding Balances',
      value: outstandingBalances.length,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  const actionItems = [
    {
      title: 'New Booking Requests',
      count: newRequests.length,
      icon: FileText,
      href: createPageUrl('Bookings'),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Service Requests Awaiting',
      count: awaitingResponse.length,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Declined Service Requests',
      count: declinedServices.length,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Overdue Payments',
      count: overduePayments.length,
      icon: AlertCircle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Operations Dashboard
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Monitor live bookings, services, and key metrics</p>
          </div>
          <div className="relative z-10 hidden md:block">
            <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Online
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {keyMetrics.map((metric) => (
            <Card key={metric.title} className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">{metric.title}</p>
                    {bookingsLoading ? (
                      <Skeleton className="h-9 w-20" />
                    ) : (
                      <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{metric.value}</p>
                    )}
                  </div>
                  <div className={`p-3.5 rounded-2xl ${metric.bgColor}`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Required */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Action Required
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {actionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href || '/bookings'}
                className="block outline-none"
              >
                <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:border-slate-300/80 hover:shadow-md transition-all cursor-pointer bg-white/70 backdrop-blur-md group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-110 ${item.bgColor}`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div>
                        {bookingsLoading || servicesLoading ? (
                          <Skeleton className="h-7 w-12 mb-1" />
                        ) : (
                          <p className="text-2xl font-bold text-slate-900 leading-none mb-1.5">{item.count}</p>
                        )}
                        <p className="text-sm font-medium text-slate-500 leading-tight">{item.title}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Departures */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/30 border-b border-slate-100/60 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Upcoming Departures
              <Badge variant="secondary" className="ml-2 font-medium bg-slate-200/50 text-slate-600 border-none rounded-full">Next 30 Days</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bookingsLoading || servicesLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : upcomingDepartures.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-600">Start Date</TableHead>
                      <TableHead className="font-semibold text-slate-600">Tour Name</TableHead>
                      <TableHead className="font-semibold text-slate-600">Customer</TableHead>
                      <TableHead className="font-semibold text-slate-600">Guests</TableHead>
                      <TableHead className="font-semibold text-slate-600">Status</TableHead>
                      <TableHead className="font-semibold text-slate-600">Service Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingDepartures.map((booking) => {
                      const serviceStatus = getServiceStatus(booking.id);
                      return (
                        <TableRow
                          key={booking.id}
                          className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors"
                          onClick={() => window.location.href = createPageUrl('BookingDetail') + '?id=' + booking.id}
                        >
                          <TableCell className="font-medium text-slate-700 py-3.5">
                            {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium text-indigo-600">{booking.tour_name}</TableCell>
                          <TableCell className="text-slate-600">{booking.customer_name}</TableCell>
                          <TableCell className="text-slate-600 font-medium">{booking.number_of_walkers}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-50/80 text-blue-700 border-blue-200/50 font-medium px-2 py-0.5 rounded shadow-none hover:bg-blue-100 transition-colors">
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-1.5 text-sm font-medium ${serviceStatus.color}`}>
                              <span className="text-xs">{serviceStatus.icon}</span>
                              {serviceStatus.label}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-slate-500 font-medium text-center py-10">No upcoming departures in the next 30 days</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/30 border-b border-slate-100/60 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((booking) => (
                  <Link
                    key={booking.id}
                    to={createPageUrl('BookingDetail') + '?id=' + booking.id}
                    className="block p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{booking.booking_reference}</p>
                          <Badge variant="outline" className="font-medium px-2 py-0.5 rounded shadow-none">
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          <span className="text-slate-700">{booking.customer_name}</span> • {booking.tour_name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          {format(new Date(booking.updated_date), 'MMM dd')}
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                          {format(new Date(booking.updated_date), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 font-medium text-center py-6">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}