"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Shield, AlertTriangle, RefreshCw, ExternalLink, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Vulnerability {
    id: string;
    cve: string;
    name: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    cvss: number;
    agent: string;
    status: 'Open' | 'In Progress' | 'Fixed';
    detectedAt: string;
}

// Sample data - in production would come from Wazuh API
const SAMPLE_VULNERABILITIES: Vulnerability[] = [
    { id: '1', cve: 'CVE-2024-0001', name: 'OpenSSL Buffer Overflow', severity: 'Critical', cvss: 9.8, agent: 'web-server-01', status: 'Open', detectedAt: '2026-01-13' },
    { id: '2', cve: 'CVE-2024-0023', name: 'Apache Log4j RCE', severity: 'Critical', cvss: 10.0, agent: 'app-server-02', status: 'Open', detectedAt: '2026-01-12' },
    { id: '3', cve: 'CVE-2023-5678', name: 'Linux Kernel Privilege Escalation', severity: 'High', cvss: 7.8, agent: 'db-server-01', status: 'In Progress', detectedAt: '2026-01-10' },
    { id: '4', cve: 'CVE-2023-4567', name: 'nginx Integer Overflow', severity: 'Medium', cvss: 5.5, agent: 'web-server-01', status: 'Open', detectedAt: '2026-01-08' },
    { id: '5', cve: 'CVE-2023-3456', name: 'SSH Weak Key Generation', severity: 'Low', cvss: 3.7, agent: 'backup-srv', status: 'Fixed', detectedAt: '2026-01-05' },
];

export default function VulnerabilitiesPage() {
    const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>(SAMPLE_VULNERABILITIES);
    const [loading, setLoading] = useState(false);

    const stats = {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
        high: vulnerabilities.filter(v => v.severity === 'High').length,
        medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
        low: vulnerabilities.filter(v => v.severity === 'Low').length,
        open: vulnerabilities.filter(v => v.status === 'Open').length,
    };

    const columns: Column<Vulnerability>[] = [
        {
            key: 'cve',
            header: 'CVE ID',
            sortable: true,
            render: (row) => (
                <a
                    href={`https://nvd.nist.gov/vuln/detail/${row.cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono text-xs flex items-center gap-1"
                >
                    {row.cve} <ExternalLink className="w-3 h-3" />
                </a>
            ),
        },
        { key: 'name', header: 'Vulnerability', sortable: true },
        {
            key: 'severity',
            header: 'Severity',
            sortable: true,
            render: (row) => <SeverityBadge severity={row.severity} />,
        },
        {
            key: 'cvss',
            header: 'CVSS',
            sortable: true,
            render: (row) => <span className="font-mono">{row.cvss.toFixed(1)}</span>,
        },
        { key: 'agent', header: 'Agent', render: (row) => <span className="text-slate-400">{row.agent}</span> },
        {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
        },
        { key: 'detectedAt', header: 'Detected', render: (row) => <span className="text-slate-500 text-xs">{row.detectedAt}</span> },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <Shield className="w-6 h-6 text-emerald-400" />
                            Vulnerability Dashboard
                        </h2>
                        <p className="text-slate-400">CVE tracking and vulnerability management</p>
                    </div>
                    <button
                        onClick={() => setLoading(!loading)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-5 gap-4">
                    <StatCard label="Total" value={stats.total} color="slate" />
                    <StatCard label="Critical" value={stats.critical} color="red" />
                    <StatCard label="High" value={stats.high} color="orange" />
                    <StatCard label="Medium" value={stats.medium} color="yellow" />
                    <StatCard label="Low" value={stats.low} color="blue" />
                </div>

                {/* Alert Banner */}
                {stats.critical > 0 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-4">
                        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-red-400">Critical Vulnerabilities Detected</h4>
                            <p className="text-sm text-slate-400">
                                {stats.critical} critical vulnerabilities require immediate attention
                            </p>
                        </div>
                    </div>
                )}

                {/* Vulnerability Table */}
                <DataTable
                    data={vulnerabilities}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    emptyMessage="No vulnerabilities detected"
                />

                {/* Trend Info */}
                <Card>
                    <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TrendingDown className="w-5 h-5 text-emerald-400" />
                            <span className="text-slate-300">
                                Vulnerability count decreased by <span className="text-emerald-400 font-bold">12%</span> compared to last week
                            </span>
                        </div>
                        <span className="text-xs text-slate-500">Last scan: 2026-01-14 08:00</span>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
        red: 'bg-red-500/10 border-red-500/30 text-red-400',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    };

    return (
        <div className={`p-4 rounded-xl border ${colors[color]}`}>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        Critical: 'bg-red-500/10 text-red-400 border-red-500/30',
        High: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        Low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[severity]}`}>
            {severity}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Open: 'bg-red-500/10 text-red-400 border-red-500/30',
        'In Progress': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        Fixed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}>
            {status}
        </span>
    );
}
