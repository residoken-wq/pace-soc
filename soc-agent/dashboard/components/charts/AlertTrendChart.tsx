"use client";

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface AlertTrendData {
    date: string;
    critical: number;
    warning: number;
    info: number;
}

export interface AlertTrendChartProps {
    data?: AlertTrendData[];
    days?: number;
    className?: string;
}

// Generate sample data if none provided
function generateSampleData(days: number): AlertTrendData[] {
    const data: AlertTrendData[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            critical: Math.floor(Math.random() * 10),
            warning: Math.floor(Math.random() * 25) + 5,
            info: Math.floor(Math.random() * 50) + 10,
        });
    }
    return data;
}

export function AlertTrendChart({ data, days = 7, className }: AlertTrendChartProps) {
    const [chartData, setChartData] = useState<AlertTrendData[]>([]);

    useEffect(() => {
        setChartData(data || generateSampleData(days));
    }, [data, days]);

    const totalCritical = chartData.reduce((sum, d) => sum + d.critical, 0);
    const totalWarning = chartData.reduce((sum, d) => sum + d.warning, 0);
    const totalInfo = chartData.reduce((sum, d) => sum + d.info, 0);

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl p-6', className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold text-slate-200">Alert Trend ({days} Days)</h3>
                </div>
                <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-red-500" /> Critical: {totalCritical}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-yellow-500" /> Warning: {totalWarning}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-blue-500" /> Info: {totalInfo}
                    </span>
                </div>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#64748b" />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} width={30} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="warning" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="info" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
