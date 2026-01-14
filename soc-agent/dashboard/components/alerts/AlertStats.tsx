"use client";

import React from 'react';
import { clsx } from 'clsx';
import { ShieldAlert, AlertTriangle, Info, Bell } from 'lucide-react';

export interface AlertStatsData {
    total: number;
    critical: number;
    warning: number;
    info: number;
}

export interface AlertStatsProps {
    stats: AlertStatsData;
    className?: string;
}

export function AlertStats({ stats, className }: AlertStatsProps) {
    return (
        <div className={clsx('grid grid-cols-4 gap-4', className)}>
            <StatCard
                icon={<Bell className="w-8 h-8 text-slate-400" />}
                value={stats.total}
                label="Total Alerts"
                colorClass="bg-slate-500/10 border-slate-500/30"
                textClass="text-slate-400"
            />
            <StatCard
                icon={<ShieldAlert className="w-8 h-8 text-red-400" />}
                value={stats.critical}
                label="Critical"
                colorClass="bg-red-500/10 border-red-500/30"
                textClass="text-red-400"
            />
            <StatCard
                icon={<AlertTriangle className="w-8 h-8 text-yellow-400" />}
                value={stats.warning}
                label="Warning"
                colorClass="bg-yellow-500/10 border-yellow-500/30"
                textClass="text-yellow-400"
            />
            <StatCard
                icon={<Info className="w-8 h-8 text-blue-400" />}
                value={stats.info}
                label="Info"
                colorClass="bg-blue-500/10 border-blue-500/30"
                textClass="text-blue-400"
            />
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    value: number;
    label: string;
    colorClass: string;
    textClass: string;
}

function StatCard({ icon, value, label, colorClass, textClass }: StatCardProps) {
    return (
        <div className={clsx('p-4 border rounded-xl flex items-center gap-4', colorClass)}>
            {icon}
            <div>
                <div className={clsx('text-2xl font-bold', textClass)}>{value}</div>
                <div className="text-sm text-slate-400">{label}</div>
            </div>
        </div>
    );
}

// Alert severity breakdown bar
export function AlertSeverityBar({ stats }: { stats: AlertStatsData }) {
    const total = stats.critical + stats.warning + stats.info || 1;
    const criticalPct = (stats.critical / total) * 100;
    const warningPct = (stats.warning / total) * 100;
    const infoPct = (stats.info / total) * 100;

    return (
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
            {criticalPct > 0 && <div className="bg-red-500" style={{ width: `${criticalPct}%` }} />}
            {warningPct > 0 && <div className="bg-yellow-500" style={{ width: `${warningPct}%` }} />}
            {infoPct > 0 && <div className="bg-blue-500" style={{ width: `${infoPct}%` }} />}
        </div>
    );
}
