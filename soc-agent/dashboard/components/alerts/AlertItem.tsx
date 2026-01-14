"use client";

import React from 'react';
import { clsx } from 'clsx';
import { ShieldAlert, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { Alert, getAlertSeverity, SEVERITY_COLORS } from '@/lib/types/alert';
import { getTimeAgo } from '@/lib/types/common';

export interface AlertItemProps {
    alert: Alert;
    onClick?: () => void;
    className?: string;
}

const SEVERITY_ICONS = {
    critical: <ShieldAlert className="w-6 h-6 text-red-500" />,
    high: <ShieldAlert className="w-6 h-6 text-orange-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
};

export function AlertItem({ alert, onClick, className }: AlertItemProps) {
    const severity = getAlertSeverity(alert.rule.level);
    const colors = SEVERITY_COLORS[severity];
    const icon = SEVERITY_ICONS[severity];

    return (
        <div
            onClick={onClick}
            className={clsx(
                'p-5 rounded-xl border flex gap-5 items-start transition-all',
                colors.bg,
                colors.border,
                onClick && 'hover:bg-slate-900 cursor-pointer',
                className
            )}
        >
            <div className="shrink-0 mt-1">{icon}</div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h4 className={clsx('font-bold', colors.text)}>
                        {alert.rule.description || `Rule ${alert.rule.id}`}
                    </h4>
                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-mono border',
                            colors.border,
                            colors.text
                        )}>
                            L{alert.rule.level}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {getTimeAgo(alert.timestamp)}
                        </span>
                    </div>
                </div>
                <p className="text-slate-300 text-sm">
                    Rule ID: {alert.rule.id} | Location: {alert.location || '-'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                        Agent: {alert.agent.name} ({alert.agent.ip || '-'})
                    </span>
                    {alert.mitre?.techniqueId && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                            MITRE: {alert.mitre.techniqueId}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Compact alert row for tables
export function AlertRow({ alert, onClick }: AlertItemProps) {
    const severity = getAlertSeverity(alert.rule.level);
    const colors = SEVERITY_COLORS[severity];

    return (
        <tr onClick={onClick} className="hover:bg-slate-800/40 cursor-pointer transition-colors">
            <td className="px-4 py-3">
                <span className={clsx('px-2 py-0.5 rounded text-xs font-medium border', colors.bg, colors.border, colors.text)}>
                    {severity.toUpperCase()}
                </span>
            </td>
            <td className="px-4 py-3 text-slate-300">{alert.rule.description || alert.rule.id}</td>
            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{alert.agent.name}</td>
            <td className="px-4 py-3 text-slate-500 text-xs">{getTimeAgo(alert.timestamp)}</td>
        </tr>
    );
}
