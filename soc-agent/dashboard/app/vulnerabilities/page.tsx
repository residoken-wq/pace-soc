"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { Shield, AlertTriangle, RefreshCw, ExternalLink, TrendingDown, Search, Download, Filter, ChevronLeft, ChevronRight, Server, Package, Eye } from 'lucide-react';
import { VulnDetailModal } from '@/components/security/VulnDetailModal';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

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

interface Stats {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    fixed: number;
}

interface FilterState {
    severity: string;
    status: string;
    agent: string;
    search: string;
}

const ITEMS_PER_PAGE = 15;

const SEVERITY_COLORS = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
};

export default function VulnerabilitiesPage() {
    const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, fixed: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastScan, setLastScan] = useState<string | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        severity: 'all',
        status: 'all',
        agent: 'all',
        search: '',
    });

    const fetchVulnerabilities = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/wazuh/vulnerabilities?limit=500');
            const data = await res.json();
            if (data.success) {
                setVulnerabilities(data.vulnerabilities || []);
                setStats(data.stats || { total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, fixed: 0 });
                setError(null);
                setLastScan(new Date().toISOString());
            } else {
                setError(data.message || data.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVulnerabilities();
    }, [fetchVulnerabilities]);

    // Get unique agents
    const uniqueAgents = useMemo(() => {
        const agents = new Map<string, string>();
        vulnerabilities.forEach(v => agents.set(v.agentId, v.agent));
        return Array.from(agents.entries()).map(([id, name]) => ({ id, name }));
    }, [vulnerabilities]);

    // Filtered vulnerabilities
    const filteredVulns = useMemo(() => {
        return vulnerabilities.filter(v => {
            if (filters.severity !== 'all' && v.severity !== filters.severity) return false;
            if (filters.status !== 'all' && v.status !== filters.status) return false;
            if (filters.agent !== 'all' && v.agentId !== filters.agent) return false;
            if (filters.search) {
                const query = filters.search.toLowerCase();
                const searchable = `${v.cve} ${v.name} ${v.package || ''} ${v.agent}`.toLowerCase();
                if (!searchable.includes(query)) return false;
            }
            return true;
        });
    }, [vulnerabilities, filters]);

    // Pagination
    const totalPages = Math.ceil(filteredVulns.length / ITEMS_PER_PAGE);
    const paginatedVulns = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredVulns.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredVulns, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    // Chart data
    const severityPieData = useMemo(() => [
        { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
        { name: 'High', value: stats.high, color: SEVERITY_COLORS.high },
        { name: 'Medium', value: stats.medium, color: SEVERITY_COLORS.medium },
        { name: 'Low', value: stats.low, color: SEVERITY_COLORS.low },
    ].filter(d => d.value > 0), [stats]);

    const agentBarData = useMemo(() => {
        const counts: { [key: string]: { name: string; critical: number; high: number; medium: number; low: number } } = {};
        vulnerabilities.forEach(v => {
            if (!counts[v.agent]) counts[v.agent] = { name: v.agent, critical: 0, high: 0, medium: 0, low: 0 };
            counts[v.agent][v.severity]++;
        });
        return Object.values(counts).sort((a, b) => (b.critical + b.high) - (a.critical + a.high)).slice(0, 5);
    }, [vulnerabilities]);

    // Export
    const handleExport = (format: 'csv' | 'json') => {
        const data = filteredVulns.map(v => ({
            cve: v.cve,
            name: v.name,
            severity: v.severity,
            cvss: v.cvss,
            package: v.package || '',
            version: v.version || '',
            fixedVersion: v.fixedVersion || '',
            agent: v.agent,
            status: v.status,
            detectedAt: v.detectedAt,
        }));

        let content: string;
        let filename: string;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = `vulnerabilities-${new Date().toISOString().slice(0, 10)}.json`;
        } else {
            const headers = Object.keys(data[0] || {}).join(',');
            const rows = data.map(d => Object.values(d).map(v => `"${v}"`).join(','));
            content = [headers, ...rows].join('\n');
            filename = `vulnerabilities-${new Date().toISOString().slice(0, 10)}.csv`;
        }

        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Status change handler (local only - would need API in production)
    const handleStatusChange = (id: string, newStatus: 'open' | 'fixed' | 'ignored') => {
        setVulnerabilities(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
        if (selectedVuln?.id === id) {
            setSelectedVuln(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <Shield className="w-6 h-6 text-emerald-400" />
                            Vulnerability Dashboard
                        </h2>
                        <p className="text-slate-400">CVE tracking and vulnerability management</p>
                    </div>
                    <button
                        onClick={fetchVulnerabilities}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats & Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Summary Stats */}
                    <div className="lg:col-span-2 grid grid-cols-5 gap-3">
                        <StatCard label="Total" value={stats.total} color="slate" />
                        <StatCard label="Critical" value={stats.critical} color="red" />
                        <StatCard label="High" value={stats.high} color="orange" />
                        <StatCard label="Medium" value={stats.medium} color="yellow" />
                        <StatCard label="Low" value={stats.low} color="blue" />
                    </div>

                    {/* Severity Pie Chart */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-sm text-slate-400 mb-2">Severity Distribution</h4>
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={50}
                                        dataKey="value"
                                    >
                                        {severityPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                            {severityPieData.map(d => (
                                <div key={d.name} className="flex items-center gap-1 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-slate-400">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Vulnerable Agents */}
                {agentBarData.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-sm text-slate-400 mb-4">Top Vulnerable Agents</h4>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={agentBarData} layout="vertical">
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                    <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} />
                                    <Bar dataKey="high" stackId="a" fill={SEVERITY_COLORS.high} />
                                    <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLORS.medium} />
                                    <Bar dataKey="low" stackId="a" fill={SEVERITY_COLORS.low} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

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

                {/* Filters */}
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-400">Filters:</span>
                        </div>
                        <select
                            value={filters.severity}
                            onChange={e => setFilters({ ...filters, severity: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                        >
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="fixed">Fixed</option>
                            <option value="ignored">Ignored</option>
                        </select>
                        <select
                            value={filters.agent}
                            onChange={e => setFilters({ ...filters, agent: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                        >
                            <option value="all">All Agents</option>
                            {uniqueAgents.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search CVE, package, agent..."
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                            />
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-slate-500">{filteredVulns.length} vulnerabilities</span>
                            <div className="relative group">
                                <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700">
                                    <Download className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                                    <button onClick={() => handleExport('csv')} className="block w-full px-4 py-2 text-sm text-left hover:bg-slate-700">Export CSV</button>
                                    <button onClick={() => handleExport('json')} className="block w-full px-4 py-2 text-sm text-left hover:bg-slate-700">Export JSON</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Vulnerability Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase">
                                <th className="px-4 py-3">CVE ID</th>
                                <th className="px-4 py-3">Vulnerability</th>
                                <th className="px-4 py-3">Severity</th>
                                <th className="px-4 py-3">CVSS</th>
                                <th className="px-4 py-3">Agent</th>
                                <th className="px-4 py-3">Package</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading && (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Loading...</td></tr>
                            )}
                            {!loading && paginatedVulns.length === 0 && (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No vulnerabilities found</td></tr>
                            )}
                            {paginatedVulns.map(vuln => (
                                <tr key={vuln.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <a
                                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-400 hover:underline font-mono text-xs flex items-center gap-1"
                                        >
                                            {vuln.cve} <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate">{vuln.name}</td>
                                    <td className="px-4 py-3"><SeverityBadge severity={vuln.severity} /></td>
                                    <td className="px-4 py-3 font-mono text-sm">{vuln.cvss.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{vuln.agent}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{vuln.package || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={vuln.status} /></td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedVuln(vuln)}
                                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-sm text-slate-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Trend Footer */}
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-emerald-400" />
                        <span className="text-slate-300">
                            {stats.fixed} vulnerabilities fixed | {stats.open} remaining open
                        </span>
                    </div>
                    <span className="text-xs text-slate-500">
                        Last scan: {lastScan ? new Date(lastScan).toLocaleString('vi-VN') : 'N/A'}
                    </span>
                </div>
            </main>

            {/* Detail Modal */}
            {selectedVuln && (
                <VulnDetailModal
                    vuln={selectedVuln}
                    onClose={() => setSelectedVuln(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
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
        <div className={`p-3 rounded-xl border ${colors[color]}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        critical: 'bg-red-500/10 text-red-400 border-red-500/30',
        high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[severity]}`}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        open: 'bg-red-500/10 text-red-400 border-red-500/30',
        fixed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        ignored: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
