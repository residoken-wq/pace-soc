"use client";

import React from 'react';
import { clsx } from 'clsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

export interface AreaChartCardProps {
    title: string;
    value?: string;
    icon?: React.ReactNode;
    data: any[];
    dataKey: string;
    color?: 'emerald' | 'purple' | 'blue' | 'orange' | 'red' | 'yellow';
    height?: number;
    className?: string;
}

const COLORS = {
    emerald: { stroke: '#10b981', fill: 'url(#colorEmerald)' },
    purple: { stroke: '#8b5cf6', fill: 'url(#colorPurple)' },
    blue: { stroke: '#3b82f6', fill: 'url(#colorBlue)' },
    orange: { stroke: '#f97316', fill: 'url(#colorOrange)' },
    red: { stroke: '#ef4444', fill: 'url(#colorRed)' },
    yellow: { stroke: '#eab308', fill: 'url(#colorYellow)' },
};

const TEXT_COLORS = {
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
};

export function AreaChartCard({
    title,
    value,
    icon,
    data,
    dataKey,
    color = 'emerald',
    height = 160,
    className,
}: AreaChartCardProps) {
    const colorConfig = COLORS[color];

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col', className)}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="font-semibold text-slate-200 text-sm">{title}</h3>
                </div>
                {value && <span className={clsx('text-xl font-bold font-mono', TEXT_COLORS[color])}>{value}</span>}
            </div>
            <div style={{ height }} className="w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`color${color.charAt(0).toUpperCase() + color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colorConfig.stroke} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colorConfig.stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#64748b" hide />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} width={30} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                        <Area type="monotone" dataKey={dataKey} stroke={colorConfig.stroke} fillOpacity={1} fill={colorConfig.fill} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
