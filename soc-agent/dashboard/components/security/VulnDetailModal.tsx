"use client";

import React, { useState } from 'react';
import { X, ExternalLink, Shield, Server, Package, Calendar, AlertTriangle, Copy, Check, Bug, Wrench } from 'lucide-react';
import { clsx } from 'clsx';

interface Vulnerability {
    id: string;
    cve: string;
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cvss: number;
    package?: string;
    version?: string;
    fixedVersion?: string;
    agent: string;
    agentId: string;
    detectedAt: string;
    status: 'open' | 'fixed' | 'ignored';
    reference?: string;
}

interface VulnDetailModalProps {
    vuln: Vulnerability | null;
    onClose: () => void;
    onStatusChange?: (id: string, status: 'open' | 'fixed' | 'ignored') => void;
}

const SEVERITY_COLORS = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
};

export function VulnDetailModal({ vuln, onClose, onStatusChange }: VulnDetailModalProps) {
    const [copied, setCopied] = useState(false);

    if (!vuln) return null;

    const colors = SEVERITY_COLORS[vuln.severity];

    const handleCopy = () => {
        navigator.clipboard.writeText(vuln.cve);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const cvssColor = vuln.cvss >= 9 ? 'text-red-400' : vuln.cvss >= 7 ? 'text-orange-400' : vuln.cvss >= 4 ? 'text-yellow-400' : 'text-blue-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className={clsx('p-5 border-b border-slate-700', colors.bg)}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={clsx('px-3 py-1 rounded-full text-sm font-bold uppercase', colors.bg, colors.border, colors.text, 'border')}>
                                    {vuln.severity}
                                </span>
                                <span className={clsx('text-2xl font-bold', cvssColor)}>
                                    CVSS {vuln.cvss.toFixed(1)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-mono text-slate-200">{vuln.cve}</h2>
                                <button onClick={handleCopy} className="p-1 hover:bg-slate-700 rounded">
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                </button>
                                <a
                                    href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 hover:bg-slate-700 rounded text-blue-400"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Vulnerability Name */}
                    <div>
                        <h3 className="text-sm text-slate-400 mb-1">Vulnerability</h3>
                        <p className="text-slate-200">{vuln.name}</p>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoCard icon={<Server className="w-4 h-4" />} label="Agent" value={vuln.agent} />
                        <InfoCard icon={<Calendar className="w-4 h-4" />} label="Detected" value={new Date(vuln.detectedAt).toLocaleDateString('vi-VN')} />
                        {vuln.package && (
                            <InfoCard icon={<Package className="w-4 h-4" />} label="Package" value={`${vuln.package} ${vuln.version || ''}`} />
                        )}
                        {vuln.fixedVersion && (
                            <InfoCard icon={<Wrench className="w-4 h-4" />} label="Fixed In" value={vuln.fixedVersion} />
                        )}
                    </div>

                    {/* Remediation */}
                    {vuln.fixedVersion && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                                <Wrench className="w-4 h-4" /> Remediation
                            </h4>
                            <p className="text-sm text-slate-300">
                                Update <code className="px-1 py-0.5 bg-slate-800 rounded text-emerald-400">{vuln.package}</code> to version <code className="px-1 py-0.5 bg-slate-800 rounded text-emerald-400">{vuln.fixedVersion}</code> or later.
                            </p>
                        </div>
                    )}

                    {/* Status Change */}
                    {onStatusChange && (
                        <div className="pt-4 border-t border-slate-700">
                            <h4 className="text-sm text-slate-400 mb-3">Change Status</h4>
                            <div className="flex gap-2">
                                {(['open', 'fixed', 'ignored'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => onStatusChange(vuln.id, status)}
                                        className={clsx(
                                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                            vuln.status === status
                                                ? status === 'open' ? 'bg-red-500 text-white' : status === 'fixed' ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'
                                                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                                        )}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* External Links */}
                    <div className="flex gap-2 pt-4 border-t border-slate-700">
                        <a
                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-500/20"
                        >
                            <Shield className="w-4 h-4" /> NVD Details
                        </a>
                        <a
                            href={`https://www.cvedetails.com/cve/${vuln.cve}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-500/20"
                        >
                            <Bug className="w-4 h-4" /> CVE Details
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                {icon} {label}
            </div>
            <div className="text-slate-200 font-medium truncate">{value}</div>
        </div>
    );
}
