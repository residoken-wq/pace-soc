"use client";

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink, Filter, Search } from 'lucide-react';
import { Vulnerability, VulnCardCompact } from './VulnCard';
import { clsx } from 'clsx';

interface VulnTableProps {
    vulnerabilities: Vulnerability[];
    onVulnClick?: (vuln: Vulnerability) => void;
    className?: string;
}

type SortKey = 'severity' | 'cvss' | 'agent' | 'detectedAt';
type SortDirection = 'asc' | 'desc';

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

export function VulnTable({ vulnerabilities, onVulnClick, className }: VulnTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('cvss');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filter, setFilter] = useState({
        severity: 'all',
        status: 'all',
        search: ''
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const filteredVulns = vulnerabilities.filter(v => {
        if (filter.severity !== 'all' && v.severity !== filter.severity) return false;
        if (filter.status !== 'all' && v.status !== filter.status) return false;
        if (filter.search) {
            const search = filter.search.toLowerCase();
            return (
                v.cve.toLowerCase().includes(search) ||
                v.name.toLowerCase().includes(search) ||
                v.agent.toLowerCase().includes(search) ||
                (v.package && v.package.toLowerCase().includes(search))
            );
        }
        return true;
    });

    const sortedVulns = [...filteredVulns].sort((a, b) => {
        let aVal: number, bVal: number;

        switch (sortKey) {
            case 'severity':
                aVal = SEVERITY_ORDER[a.severity];
                bVal = SEVERITY_ORDER[b.severity];
                break;
            case 'cvss':
                aVal = a.cvss;
                bVal = b.cvss;
                break;
            case 'detectedAt':
                aVal = new Date(a.detectedAt).getTime();
                bVal = new Date(b.detectedAt).getTime();
                break;
            default:
                return a.agent.localeCompare(b.agent) * (sortDirection === 'asc' ? 1 : -1);
        }

        return (sortDirection === 'asc' ? aVal - bVal : bVal - aVal);
    });

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />;
    };

    const stats = {
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
    };

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden', className)}>
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Total: {vulnerabilities.length}</span>
                <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                        {stats.critical} Critical
                    </span>
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                        {stats.high} High
                    </span>
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        {stats.medium} Medium
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                        {stats.low} Low
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-800 bg-slate-800/30">
                <Filter className="w-4 h-4 text-slate-400" />

                <select
                    value={filter.severity}
                    onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                <select
                    value={filter.status}
                    onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="fixed">Fixed</option>
                    <option value="ignored">Ignored</option>
                </select>

                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search CVE, package, agent..."
                        value={filter.search}
                        onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-800/50 text-left">
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200"
                                onClick={() => handleSort('severity')}
                            >
                                <div className="flex items-center gap-1">
                                    Severity <SortIcon column="severity" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-400">CVE</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-400">Description</th>
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200"
                                onClick={() => handleSort('cvss')}
                            >
                                <div className="flex items-center gap-1">
                                    CVSS <SortIcon column="cvss" />
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200"
                                onClick={() => handleSort('agent')}
                            >
                                <div className="flex items-center gap-1">
                                    Agent <SortIcon column="agent" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-400">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedVulns.map(vuln => (
                            <tr
                                key={vuln.id}
                                onClick={() => onVulnClick?.(vuln)}
                                className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <span className={clsx(
                                        'px-2 py-1 rounded text-xs font-bold uppercase',
                                        vuln.severity === 'critical' && 'bg-red-500 text-white',
                                        vuln.severity === 'high' && 'bg-orange-500 text-white',
                                        vuln.severity === 'medium' && 'bg-yellow-500 text-black',
                                        vuln.severity === 'low' && 'bg-blue-500 text-white'
                                    )}>
                                        {vuln.severity}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-slate-200">{vuln.cve}</span>
                                        <a
                                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="text-blue-400 hover:text-blue-300"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-slate-300 line-clamp-1 max-w-xs">{vuln.name}</p>
                                    {vuln.package && (
                                        <p className="text-xs text-slate-500">{vuln.package} v{vuln.version}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono text-sm text-slate-200">{vuln.cvss.toFixed(1)}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400">{vuln.agent}</td>
                                <td className="px-4 py-3">
                                    <span className={clsx(
                                        'px-2 py-0.5 rounded text-xs capitalize',
                                        vuln.status === 'open' && 'bg-red-500/20 text-red-400',
                                        vuln.status === 'fixed' && 'bg-emerald-500/20 text-emerald-400',
                                        vuln.status === 'ignored' && 'bg-slate-500/20 text-slate-400'
                                    )}>
                                        {vuln.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {sortedVulns.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No vulnerabilities found matching your criteria
                    </div>
                )}
            </div>
        </div>
    );
}
