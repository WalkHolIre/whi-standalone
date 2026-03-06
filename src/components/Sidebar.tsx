"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu, X, Map, MapPin,
    FileText, HelpCircle, Image as ImageIcon,
    ChevronDown, BookOpen, Users,
    Calendar, Building2, Navigation, Settings, AlertCircle,
    Truck, DollarSign, Globe, Mail, Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navigationSections = [
    {
        id: 'content',
        label: 'CONTENT',
        icon: BookOpen,
        items: [
            { name: 'Tours', href: '/tours', icon: Map },
            { name: 'Destinations', href: '/destinations', icon: MapPin },
            { name: 'FAQs', href: '/faqs', icon: HelpCircle },
            { name: 'Reviews', href: '/reviews', icon: Zap },
            { name: 'Image Library', href: '/images', icon: ImageIcon },
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
        icon: Users,
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
            { name: 'Global Settings', href: '/settings', icon: Settings },
            { name: 'Email Settings', href: '/email-settings', icon: Mail },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        content: true,
        crm: true,
        operations: true
    });

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <aside className="hidden lg:flex flex-col w-[300px] h-screen sticky top-0 bg-whi-purple text-white/85 shadow-xl">
            {/* Branding */}
            <div className="p-6 border-b border-white/10 flex flex-col items-center">
                <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698fbccb93e8c68795aa3946/85a432a04_WHI_logo_636x342.png"
                    alt="WHI Logo"
                    className="max-w-[140px] mb-3"
                />
                <h1 className="text-sm font-bold tracking-wider text-center text-white italic">
                    WHI GROUND CONTROL
                </h1>
            </div>

            {/* Primary Links */}
            <div className="p-4 border-b border-white/10">
                <Link
                    href="/bookings"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all",
                        pathname === '/bookings'
                            ? "bg-whi text-white shadow-lg"
                            : "bg-white/10 text-white/90 hover:bg-white/20"
                    )}
                >
                    <Calendar className="w-5 h-5" />
                    BOOKINGS
                </Link>
            </div>

            {/* Categorized Nav */}
            <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {navigationSections.map((section) => (
                    <div key={section.id} className="mb-2">
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-6 py-3 text-[10px] font-black text-white/40 tracking-[2px] uppercase hover:text-white/70 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <section.icon className="w-3.5 h-3.5" />
                                {section.label}
                            </span>
                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expandedSections[section.id] ? "rotate-0" : "-rotate-90")} />
                        </button>

                        <div className={cn("overflow-hidden transition-all duration-300", expandedSections[section.id] ? "max-h-[500px]" : "max-h-0")}>
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-8 py-2.5 text-sm font-medium border-l-4 transition-all",
                                            isActive
                                                ? "bg-whi/10 border-whi text-white"
                                                : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn("w-4 h-4", isActive ? "text-whi" : "text-white/40")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>
        </aside>
    );
}
