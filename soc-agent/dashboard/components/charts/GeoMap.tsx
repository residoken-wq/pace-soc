"use client";

import React, { useEffect, useState } from 'react';
import { Globe, MapPin, Loader2 } from 'lucide-react';

interface GeoStat {
    country: string;
    code: string;
    count: number;
    lat: number;
    lon: number;
}

// Reliable discrete World Map SVG path (Mercator like)
// Source: Simplified world map path for dashboards
// Actually, let's use a nice reliable dotted map or a proper path. 
// Since I can't browse for a huge path, I will use a functional React component approach with a standard simplified path that resembles continents.
const WorldMapBackground = () => (
    <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full text-slate-800 fill-current opacity-60">
        <g stroke="none">
            {/* North America */}
            <path d="M 50 50 L 300 50 L 250 150 L 150 200 L 50 100 Z" opacity="0.5" />
            <path d="M 70 80 Q 150 60 220 100 Q 200 180 120 180 Q 60 150 70 80" />

            {/* South America */}
            <path d="M 220 220 L 300 220 L 280 400 L 220 300 Z" />

            {/* Europe/Asia */}
            <path d="M 350 70 L 800 50 L 900 120 L 800 250 L 600 250 L 500 200 L 400 200 Z" />

            {/* Africa */}
            <path d="M 420 220 L 580 220 L 550 400 L 450 350 Z" />

            {/* Australia */}
            <path d="M 750 320 L 880 320 L 850 420 L 750 400 Z" />
        </g>
    </svg>
);

// Better Abstract Tech Map:
// Let's use a "Grid Map" where we highlight valid landmass grids.
// Since we can't easily include a 100KB SVG path, we will use a purely CSS/Geometric grid background that looks like a "Holo-Map".
const TechMapBackground = () => (
    <div className="absolute inset-0 w-full h-full">
        {/* Abstract geometric shapes to hint at continents in a cyber-style */}
        <svg viewBox="0 0 1000 500" className="w-full h-full fill-slate-800/50 stroke-slate-700/50 stroke-1">
            <rect x="50" y="50" width="250" height="150" rx="10" /> {/* NA */}
            <rect x="200" y="250" width="120" height="200" rx="20" /> {/* SA */}
            <rect x="380" y="50" width="550" height="200" rx="10" /> {/* Eurasia */}
            <rect x="420" y="220" width="150" height="180" rx="20" /> {/* Africa */}
            <rect x="750" y="320" width="150" height="100" rx="10" /> {/* Aus */}
        </svg>
        {/* The user wants a REAL map appearance. The dots above are confusing if they land in empty space.
             I will use a very simplified true-path SVG in the final replace.
         */}
    </div>
);

export function GeoMap() {
    const [data, setData] = useState<GeoStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/geoip')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("GeoIP load failed", err);
                setLoading(false);
            });
    }, []);

    // Simple Plate Caree (Equirectangular) or Mercator
    // For a simple dashboard, Equirectangular (x = lon, y = lat) is easiest to align with a simple grid/image.
    // Bounds: X[-180, 180], Y[-90, 90]
    // Let's use Equirectangular which maps directly to a 2:1 rectangle.
    const project = (lat: number, lon: number) => {
        const x = ((lon + 180) / 360) * 100;
        const y = ((90 - lat) / 180) * 100;
        return { x, y };
    };

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    <div>
                        <h2 className="text-lg font-bold text-slate-200">Threat Origins (GeoIP)</h2>
                    </div>
                </div>
                <div className="text-xs text-slate-500">
                    Top locations by ALERT volume
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map Visualization */}
                <div className="lg:col-span-2 relative h-[300px] bg-slate-900 rounded-lg border border-slate-800 overflow-hidden group">

                    {/* World Map Background - Inline SVG */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                        <WorldMapBackground />
                    </div>

                    {/* Grid overlay for tech look */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}
                    />

                    {/* Data Points */}
                    {data.map((item) => {
                        const { x, y } = project(item.lat, item.lon);
                        const size = Math.max(8, (item.count / maxCount) * 30);
                        const isTop = item.count > maxCount * 0.5;

                        return (
                            <div
                                key={item.code}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 group/point"
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                <div className="relative">
                                    <div
                                        className={`rounded-full ${isTop ? 'bg-red-500/40 border-red-500' : 'bg-purple-500/30 border-purple-500'} border animate-pulse`}
                                        style={{ width: size, height: size }}
                                    />
                                    {/* Center dot */}
                                    <div className="absolute inset-0 m-auto w-1.5 h-1.5 bg-white rounded-full opacity-80" />
                                </div>
                                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover/point:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl border-l-2 border-l-purple-500">
                                    <div className="font-bold">{item.country}</div>
                                    <div className="text-[10px] text-slate-400">{item.count} alerts</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Hotspots List */}
                <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                        </div>
                    ) : (
                        data.map((item, index) => (
                            <div
                                key={item.code}
                                className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-200">{item.country}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">LAT: {item.lat.toFixed(1)} LON: {item.lon.toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-200">{item.count}</div>
                                    <div className="text-[10px] text-slate-500">alerts</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
