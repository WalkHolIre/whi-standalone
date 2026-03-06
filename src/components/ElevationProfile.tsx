"use client";

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { haversineDistance } from '@/lib/difficulty-engine';

interface ElevationProfileProps {
    coordinates: [number, number, number][];
    onHover: (index: number | null) => void;
}

export default function ElevationProfile({ coordinates, onHover }: ElevationProfileProps) {
    const chartData = useMemo(() => {
        if (!coordinates || coordinates.length === 0) return [];

        let totalDist = 0;
        return coordinates.map((coord, idx) => {
            if (idx > 0) {
                const prev = coordinates[idx - 1];
                totalDist += haversineDistance(prev[0], prev[1], coord[0], coord[1]);
            }
            return {
                dist: Math.round(totalDist * 10) / 10,
                elev: coord[2] || 0,
                index: idx
            };
        });
    }, [coordinates]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            onHover(data.index);
            return (
                <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-[10px] font-black shadow-xl border border-white/10">
                    <p className="uppercase opacity-50 mb-0.5">LOCATION AT {data.dist} KM</p>
                    <p className="text-sm">ALTITUDE: {Math.round(data.elev)}M</p>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) return null;

    return (
        <Card className="border-slate-100 overflow-hidden">
            <CardContent className="p-0">
                <div className="h-48 w-full bg-slate-50/50 pb-4 pr-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            onMouseLeave={() => onHover(null)}
                            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F17E00" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#F17E00" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="dist"
                                tick={{ fontSize: 10, fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="elev"
                                stroke="#F17E00"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorElev)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
