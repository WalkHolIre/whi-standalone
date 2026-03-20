"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Menu, X, Map, MapPin, Home,
    FileText, HelpCircle, Image as ImageIcon,
    ChevronDown, BookOpen, Users,
    Calendar, Building2, Navigation, Settings, AlertCircle,
    Truck, DollarSign, Globe, Mail, Zap, LogOut, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION, BUILD_DATE } from '@/version';

const navigationSections = [
    {
        id: 'content',
        label: 'CONTENT',
        icon: BookOpen,
        items: [
            { name: 'Tours', href: '/tours', icon: Map },
            { name: 'Destinations', href: '/destinations', icon: MapPin },
            { name: 'FAQs', href: '/faqs', icon: HelpCircle },
            { name: 'Reviews', href: '/reviews', icon: Star },
            { name: 'Image Library', href: '/media', icon: ImageIcon },
        ]
    },
    {
        id: 'crm',
        label: 'CRM',
        icon: Users,
        items: [
            { name: 'Customers', href: '/customers', icon: Users },
            { name: 'Trade Partners', href: '/partners', icon: Building2 },
            { name: 'Data Quality', href: '/data-quality', icon: AlertCircle },
        ]
    },
    {
        id: 'operations',
        label: 'OPERATIONS',
        icon: Settings,
        items: [
            { name: 'Service Providers', href: '/service-providers', icon: Truck },
            { name: 'Pricing', href: '/pricing', icon: DollarSign },
            { name: 'Route Library', href: '/routes', icon: Navigation },
            { name: 'Translations', href: '/translations', icon: Globe },
        ]
    },
    {
        id: 'settings',
        label: 'SETTINGS',
        icon: Settings,
        items: [
            { name: 'Global', href: '/settings/global', icon: Settings },
            { name: 'Email Templates', href: '/settings/email', icon: Mail },
            { name: 'Tour Codes', href: '/settings/tour-codes', icon: FileText },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        content: true,
        crm: true,
        operations: true,
        settings: false,
    });

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const sidebarContent = (
        <>
            {/* Logo & Branding */}
            <div className="px-5 pt-5 pb-3 flex flex-col items-center border-b border-white/10">
                <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697223b02ac641a3e250b02f/ea3a4c6ae_WHI_logo_636x342.png"
                    alt="WHI Logo"
                    className="w-[100px] mb-2"
                />
                <p className="text-xs font-bold tracking-wider text-white/80 text-center">
                    WHI Ground Control
                </p>
            </div>

            {/* Home + New Booking buttons */}
            <div className="px-4 py-3 border-b border-white/10 space-y-2">
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-medium transition-all",
                        pathname === '/dashboard' || pathname === '/'
                            ? "bg-white/15 text-white"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Home className="w-4 h-4" />
                    Dashboard
                </Link>
                <button
                    onClick={() => router.push('/bookings/detail')}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all bg-whi text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                >
                    <Calendar className="w-4 h-4" />
                    NEW BOOKING
                </button>
            </div>

            {/* Bookings link */}
            <div className="px-3 pt-3">
                <Link
                    href="/bookings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                        pathname === '/bookings'
                            ? "bg-white/10 text-white font-medium"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Calendar className="w-4 h-4" />
                    Bookings
                </Link>
            </div>

            {/* Categorized Nav Sections */}
            <nav className="flex-1 overflow-y-auto px-3 pt-1 pb-4">
                {navigationSections.map((section) => (
                    <div key={section.id} className="mt-1">
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-white/40 tracking-[1.5px] uppercase hover:text-white/60 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <section.icon className="w-3.5 h-3.5" />
                                {section.label}
                            </span>
                            <ChevronDown className={cn(
                                "w-3 h-3 transition-transform duration-200",
                                expandedSections[section.id] ? "rotate-0" : "-rotate-90"
                            )} />
                        </button>

                        <div className={cn(
                            "overflow-hidden transition-all duration-200",
                            expandedSections[section.id] ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 pl-6 pr-3 py-2 text-sm rounded-md mx-1 transition-all",
                                            isActive
                                                ? "bg-white/10 text-white font-medium"
                                                : "text-white/55 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-white/40")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Footer */}
            <div className="border-t border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-xs font-bold">
                        CW
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">Cliff Waijenberg</p>
                        <p className="text-[10px] text-white/40 truncate">info@walkingholidayireland.com</p>
                    </div>
                </div>
                <p className="text-[10px] text-white/25 text-center mt-2">v{APP_VERSION} · {BUILD_DATE}</p>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#210747] text-white shadow-lg"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside className={cn(
                "lg:hidden fixed inset-y-0 left-0 z-40 w-[250px] flex flex-col bg-[#210747] text-white/85 shadow-xl transition-transform duration-300",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {sidebarContent}
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-[250px] min-h-screen bg-[#210747] text-white/85 shadow-xl flex-shrink-0">
                {sidebarContent}
            </aside>
        </>
    );
}
