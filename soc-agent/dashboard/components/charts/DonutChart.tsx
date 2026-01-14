"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { clsx } from 'clsx';

interface DonutChartData {
    name: string;
    value: number;
    color?: string;
}

interface DonutChartProps {
    data: DonutChartData[];
    title?: string;
    centerLabel?: string;
    centerValue?: string | number;
    height?: number;
    className?: string;
    showLegend?: boolean;
    showTooltip?: boolean;
}

const DEFAULT_COLORS = [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
];

export function DonutChart({
    data,
    title,
    centerLabel,
    centerValue,
    height = 250,
    className,
    showLegend = true,
    showTooltip = true,
}: DonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    const chartData = data.map((item, index) => ({
        ...item,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-sm text-slate-200">{data.name}</p>
                    <p className="text-sm font-semibold" style={{ color: data.color }}>
                        {data.value} ({data.percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl p-4', className)}>
            {title && (
                <h3 className="text-sm font-semibold text-slate-200 mb-4">{title}</h3>
            )}

            <div style={{ height }} className="relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="85%"
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                        {showTooltip && <Tooltip content={<CustomTooltip />} />}
                    </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                {(centerLabel || centerValue) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {centerValue && (
                            <span className="text-2xl font-bold text-slate-100">{centerValue}</span>
                        )}
                        {centerLabel && (
                            <span className="text-xs text-slate-400">{centerLabel}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs text-slate-400 truncate">{item.name}</span>
                            <span className="text-xs text-slate-200 ml-auto">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Pre-configured severity donut chart
interface SeverityDonutProps {
    critical: number;
    high: number;
    medium: number;
    low: number;
    className?: string;
}

export function SeverityDonut({ critical, high, medium, low, className }: SeverityDonutProps) {
    const data = [
        { name: 'Critical', value: critical, color: '#dc2626' },
        { name: 'High', value: high, color: '#ea580c' },
        { name: 'Medium', value: medium, color: '#ca8a04' },
        { name: 'Low', value: low, color: '#2563eb' },
    ].filter(d => d.value > 0);

    const total = critical + high + medium + low;

    return (
        <DonutChart
            data={data}
            title="Alerts by Severity"
            centerValue={total}
            centerLabel="Total Alerts"
            className={className}
        />
    );
}
