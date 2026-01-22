"use client";

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Alert, getAlertSeverity } from '@/lib/types/alert';

interface AlertTrendMiniProps {
    alerts: Alert[];
    className?: string;
}

export function AlertTrendMini({ alerts, className }: AlertTrendMiniProps) {
    const chartData = useMemo(() => {
        // Group alerts by hour for last 24 hours
        const now = Date.now();
        const hours: { [key: string]: { critical: number; warning: number; info: number } } = {};

        // Initialize last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now - i * 3600000);
            const key = hour.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            hours[key] = { critical: 0, warning: 0, info: 0 };
        }

        // Count alerts per hour
        alerts.forEach(alert => {
            const alertTime = new Date(alert.timestamp);
            const key = alertTime.toISOString().slice(0, 13);
            if (hours[key]) {
                const severity = getAlertSeverity(alert.rule.level);
                if (severity === 'critical' || severity === 'high') {
                    hours[key].critical++;
                } else if (severity === 'warning') {
                    hours[key].warning++;
                } else {
                    hours[key].info++;
                }
            }
        });

        return Object.entries(hours).map(([time, counts]) => ({
            time: new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            ...counts,
            total: counts.critical + counts.warning + counts.info,
        }));
    }, [alerts]);

    const totalCritical = chartData.reduce((sum, d) => sum + d.critical, 0);
    const totalWarning = chartData.reduce((sum, d) => sum + d.warning, 0);
    const totalInfo = chartData.reduce((sum, d) => sum + d.info, 0);

    return (
        <div className={className}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-400">Alert Trend (24h)</h4>
                <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full" /> Critical: {totalCritical}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Warning: {totalWarning}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" /> Info: {totalInfo}
                    </span>
                </div>
            </div>
            <div className="h-32 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="infoGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            width={30}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="url(#criticalGrad)" />
                        <Area type="monotone" dataKey="warning" stackId="1" stroke="#eab308" fill="url(#warningGrad)" />
                        <Area type="monotone" dataKey="info" stackId="1" stroke="#3b82f6" fill="url(#infoGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
