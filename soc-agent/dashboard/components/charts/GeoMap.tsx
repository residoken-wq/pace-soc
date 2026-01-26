"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { geoMercator, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';

interface GeoStat {
    country: string;
    code: string;
    count: number;
    lat: number;
    lon: number;
}

export function GeoMap() {
    const [data, setData] = useState<GeoStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapData, setMapData] = useState<any>(null);
    const [mapError, setMapError] = useState<boolean>(false);

    useEffect(() => {
        // Load Alerts Data
        fetch('/api/geoip')
            .then(res => res.json())
            .then(setData)
            .catch(err => console.error("GeoIP Stats load failed", err));

        // Load World Map Topology (Lightweight 110m resolution)
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(res => {
                if (!res.ok) throw new Error("Map load failed");
                return res.json();
            })
            .then(topology => {
                // Convert TopoJSON to GeoJSON
                const geojson = topojson.feature(topology, topology.objects.countries);
                setMapData(geojson);
            })
            .catch(err => {
                console.error("TopoJSON load failed", err);
                setMapError(true);
            })
            .finally(() => setLoading(false));
    }, []);

    // Width/Height for projection calculation - keeping it relative to SVG viewbox
    const width = 800;
    const height = 400;

    // D3 Projection
    const projection = geoMercator()
        .scale(120)
        .translate([width / 2, height / 1.5]); // Adjust translate to center map better

    const pathGenerator = geoPath().projection(projection);

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
                <div className="lg:col-span-2 relative h-[300px] bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">

                    {loading && <Loader2 className="w-8 h-8 animate-spin text-purple-500" />}

                    {mapError && !loading && (
                        <div className="text-slate-500 text-sm">Failed to load map data. Check internet connection.</div>
                    )}

                    {!loading && mapData && (
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                            {/* Render Countries */}
                            <g className="countries">
                                {mapData.features.map((feature: any, i: number) => (
                                    <path
                                        key={`country-${i}`}
                                        d={pathGenerator(feature) || ''}
                                        className="fill-slate-800 stroke-slate-700 stroke-[0.5] hover:fill-slate-700 transition-colors"
                                    />
                                ))}
                            </g>

                            {/* Render Threat Points */}
                            <g className="points">
                                {data.map((item) => {
                                    const coords = projection([item.lon, item.lat]);
                                    if (!coords) return null;
                                    const [x, y] = coords;

                                    // Size logarithmic for better visual
                                    const size = Math.max(3, Math.log(item.count + 1) * 3);

                                    return (
                                        <g key={item.code} className="group">
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={size}
                                                className="fill-red-500/50 stroke-red-400 stroke-1 animate-pulse"
                                            />
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={2}
                                                className="fill-white"
                                            />
                                            {/* Tooltip on hover */}
                                            <title>{`${item.country}: ${item.count} alerts`}</title>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    )}
                </div>

                {/* Hotspots List */}
                <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {data.slice(0, 10).map((item, index) => (
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
                    ))}
                </div>
            </div>
        </div>
    );
}
