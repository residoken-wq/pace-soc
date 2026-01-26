"use client";

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ArrowUpRight, ArrowDownRight, ShieldAlert, Wifi } from 'lucide-react';

interface TrafficPoint {
    time: string;
    pps: number;
    mbps: number;
    rps: number;
}

export function TrafficMonitor() {
    const [data, setData] = useState<TrafficPoint[]>([]);
    const [current, setCurrent] = useState<TrafficPoint | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch('/api/threats/traffic')
                .then(res => res.json())
                .then(metric => {
                    const point = {
                        time: new Date(metric.timestamp).toLocaleTimeString(),
                        pps: metric.pps,
                        mbps: metric.mbps,
                        rps: metric.rps
                    };
                    setCurrent(point);
                    setData(prev => {
                        const newData = [...prev, point];
                        if (newData.length > 20) newData.shift();
                        return newData;
                    });
                });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    if (!current) return <div className="p-6 text-slate-500">Initializing Traffic Feed...</div>;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-emerald-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">DDoS & Traffic Monitor</h2>
                        <p className="text-sm text-slate-400">Real-time L3/L4/L7 Traffic Analysis</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <MetricBadge label="PPS" value={current.pps.toLocaleString()} unit="pkts/s" />
                    <MetricBadge label="Bandwidth" value={current.mbps.toFixed(1)} unit="Mbps" />
                    <MetricBadge label="Requests" value={current.rps.toLocaleString()} unit="req/s" />
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorMbps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time" stroke="#475569" fontSize={12} tickMargin={10} />
                        <YAxis stroke="#475569" fontSize={12} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                            itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="pps"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorPps)"
                            name="Blue: Packets/sec"
                        />
                        <Area
                            type="monotone"
                            dataKey="mbps"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorMbps)"
                            name="Green: Bandwidth (Mbps)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function MetricBadge({ label, value, unit }: { label: string, value: string, unit: string }) {
    return (
        <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <div className="text-xs text-slate-400 uppercase font-bold">{label}</div>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-slate-200">{value}</span>
                <span className="text-xs text-slate-500">{unit}</span>
            </div>
        </div>
    );
}
