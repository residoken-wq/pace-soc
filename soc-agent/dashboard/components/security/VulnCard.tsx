"use client";

import React from 'react';
import { Shield, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

export interface Vulnerability {
    id: string;
    cve: string;
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cvss: number;
    package?: string;
    version?: string;
    fixedVersion?: string;
    agent: string;
    detectedAt: string;
    status: 'open' | 'fixed' | 'ignored';
}

interface VulnCardProps {
    vulnerability: Vulnerability;
    onClick?: () => void;
    className?: string;
}

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-500/10 border-red-500/50',
        text: 'text-red-400',
        badge: 'bg-red-500 text-white'
    },
    high: {
        bg: 'bg-orange-500/10 border-orange-500/50',
        text: 'text-orange-400',
        badge: 'bg-orange-500 text-white'
    },
    medium: {
        bg: 'bg-yellow-500/10 border-yellow-500/50',
        text: 'text-yellow-400',
        badge: 'bg-yellow-500 text-black'
    },
    low: {
        bg: 'bg-blue-500/10 border-blue-500/50',
        text: 'text-blue-400',
        badge: 'bg-blue-500 text-white'
    }
};

export function VulnCard({ vulnerability, onClick, className }: VulnCardProps) {
    const styles = SEVERITY_STYLES[vulnerability.severity];

    return (
        <div
            onClick={onClick}
            className={clsx(
                'p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]',
                styles.bg,
                className
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Shield className={clsx('w-5 h-5', styles.text)} />
                    <span className="font-mono text-sm font-semibold text-slate-200">
                        {vulnerability.cve}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-bold uppercase', styles.badge)}>
                        {vulnerability.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                        CVSS: {vulnerability.cvss.toFixed(1)}
                    </span>
                </div>
            </div>

            <h4 className="text-sm font-medium text-slate-200 mb-2 line-clamp-2">
                {vulnerability.name}
            </h4>

            {vulnerability.package && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span>Package: {vulnerability.package}</span>
                    {vulnerability.version && <span>v{vulnerability.version}</span>}
                </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                    {vulnerability.status === 'fixed' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : vulnerability.status === 'ignored' ? (
                        <AlertTriangle className="w-4 h-4 text-slate-400" />
                    ) : (
                        <AlertTriangle className={clsx('w-4 h-4', styles.text)} />
                    )}
                    <span className="text-xs text-slate-400 capitalize">{vulnerability.status}</span>
                </div>
                <span className="text-xs text-slate-500">{vulnerability.agent}</span>
            </div>
        </div>
    );
}

// Compact version for lists
export function VulnCardCompact({ vulnerability, onClick }: VulnCardProps) {
    const styles = SEVERITY_STYLES[vulnerability.severity];

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors"
        >
            <span className={clsx('px-2 py-1 rounded text-xs font-bold uppercase', styles.badge)}>
                {vulnerability.severity}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-200">{vulnerability.cve}</span>
                    <a
                        href={`https://nvd.nist.gov/vuln/detail/${vulnerability.cve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300"
                    >
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <p className="text-xs text-slate-400 truncate">{vulnerability.name}</p>
            </div>
            <div className="text-right">
                <div className="text-sm font-mono text-slate-300">{vulnerability.cvss.toFixed(1)}</div>
                <div className="text-xs text-slate-500">{vulnerability.agent}</div>
            </div>
        </div>
    );
}
