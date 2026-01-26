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

// Simplified World Map SVG Path (Mercator)
// This is a very simplified aesthetic representation
// Actually using a simple map path is better than text "WORLD MAP"
const WORLD_SVG_PATH = "M155.2,71.7c-4.4-4.8-12.7-5.9-12.7-5.9s-2.1-1.6-1.6-4.3c0.5-2.7,4.8-4.8,4.8-4.8s3.2,0,4.8,2.7c1.6,2.7,2.1,6.4,2.1,6.4S159.5,76.5,155.2,71.7z M128.6,83.9c-2.1-3.2-6.4-4.3-6.4-4.3s-3.2,1.1-2.1,4.3c1.1,3.2,5.3,4.3,5.3,4.3S130.8,87.1,128.6,83.9z M137.7,85.5c-3.2-1.6-5.9,0.5-5.9,0.5s-1.1,3.7,2.1,5.3c3.2,1.6,6.4-0.5,6.4-0.5S140.9,87.1,137.7,85.5z M475,342.9c-2.1,3.2-6.4,2.7-6.4,2.7s-3.2-2.7-1.1-5.9c2.1-3.2,6.4-2.7,6.4-2.7S477.1,339.7,475,342.9z M450.5,357.3c-2.1,2.1-5.9,1.6-5.9,1.6s-2.1-3.2,0-5.3c2.1-2.1,5.9-1.6,5.9-1.6S452.7,355.2,450.5,357.3z M869.6,275.1c-3.2,2.1-6.9-0.5-6.9-0.5s0-4.3,3.2-6.4c3.2-2.1,6.9,0.5,6.9,0.5S872.8,273,869.6,275.1z M222.9,139.9c2.7-1.6,3.7-5.3,3.7-5.3s-2.7-3.2-5.3-1.6c-2.7,1.6-3.7,5.3-3.7,5.3S220.2,141.5,222.9,139.9z";
// Note: This path is just garbage placeholder data because real world map path is huge.
// I will implement a "Dots Map" style instead where I won't render landmass paths, but just grid Points.
// Or actually, I will simulate landmass using a static background image if I could, but I can't.
// I will stick to the "Grid Map" idea or just render the dots. 
// A clear text "World Map Placeholder" is better than broken paths.
// Let's use a nice grid visualization.

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

    // Simple Mercator projection to x,y percent
    // Bounds: Lat -60 to 85, Lon -180 to 180
    const project = (lat: number, lon: number) => {
        const x = (lon + 180) * (100 / 360);
        // Mercator projection approximation for visualization
        // Map latitude from -60 to 85 to 0-100%
        // This is a naive linear mapping for simplicity in this mock
        const y = 100 - ((lat + 60) * (100 / 145));
        return { x, y: Math.max(5, Math.min(95, y)) }; // Clamp y
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
                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}
                    />

                    {/* Map "Shape" - We just use a faint text/icon for now if we lack the SVG path, 
                        or we trust the dots to form the shape */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                        <Globe className="w-64 h-64 text-slate-700" />
                    </div>


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
                                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover/point:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl">
                                    <span className="font-bold">{item.country}</span>: {item.count}
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
