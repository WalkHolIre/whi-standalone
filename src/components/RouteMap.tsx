"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Leaflet markers are tricky in Next.js/SSR, so we use dynamic import
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

interface RouteMapProps {
    coordinates: [number, number, number][];
    hoveredIndex: number | null;
    startPoint?: { lat: number; lng: number; name?: string };
    endPoint?: { lat: number; lng: number; name?: string };
    waypoints?: Array<{ lat: number; lng: number; name: string; type?: string }>;
}

/**
 * Controller to handle map centering and bounds
 */
function MapController({ coordinates }: { coordinates: [number, number, number][] }) {
    // @ts-ignore
    const map = useMap();

    useEffect(() => {
        if (typeof window !== 'undefined' && coordinates?.length > 1) {
            const L = require('leaflet');
            const lats = coordinates.map(c => c[0]);
            const lngs = coordinates.map(c => c[1]);
            const bounds = L.latLngBounds(
                [Math.min(...lats), Math.min(...lngs)],
                [Math.max(...lats), Math.max(...lngs)]
            );
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [coordinates, map]);

    return null;
}

export default function RouteMap({ coordinates, hoveredIndex, startPoint, endPoint, waypoints }: RouteMapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [L, setL] = useState<any>(null);

    useEffect(() => {
        setIsMounted(true);
        // @ts-ignore
        import('leaflet').then(mod => setL(mod.default));
    }, []);

    if (!isMounted || !L) return <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center font-bold text-slate-300 italic">LOADING SATELLITE...</div>;

    // Custom Icons
    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const hoverIcon = new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0IiBmaWxsPSIjRjE3RTAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const polylinePositions = coordinates.map(c => [c[0], c[1]] as [number, number]);
    const hoverPoint = hoveredIndex !== null && coordinates[hoveredIndex] ? [coordinates[hoveredIndex][0], coordinates[hoveredIndex][1]] as [number, number] : null;

    return (
        <MapContainer
            center={[53.3, -8]}
            zoom={7}
            className="w-full h-full rounded-lg shadow-inner z-10"
        >
            <TileLayer
                url="https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=e917d105f5cc4d22af2b818a5ae7f6b0"
                attribution='&copy; Thunderforest, &copy; OpenStreetMap'
            />

            <MapController coordinates={coordinates} />

            <Polyline
                positions={polylinePositions}
                color="#210747"
                weight={4}
                opacity={0.7}
            />

            {startPoint && (
                <Marker position={[startPoint.lat, startPoint.lng]} icon={greenIcon}>
                    <Popup>Start: {startPoint.name || 'Start Point'}</Popup>
                </Marker>
            )}

            {endPoint && (
                <Marker position={[endPoint.lat, endPoint.lng]} icon={redIcon}>
                    <Popup>End: {endPoint.name || 'End Point'}</Popup>
                </Marker>
            )}

            {hoverPoint && (
                <Marker position={hoverPoint} icon={hoverIcon} />
            )}

            {waypoints?.map((wp, idx) => (
                <Marker key={idx} position={[wp.lat, wp.lng]}>
                    <Popup>
                        <div className="text-xs font-bold">{wp.name}</div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
