"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import { AlertTriangle, CheckCircle, ShieldAlert, Filter, RefreshCw, Clock, Info, Search, Download, ChevronLeft, ChevronRight, Layers, X, CheckCheck } from 'lucide-react';
import { AlertDetailModal } from '../../components/alerts/AlertDetailModal';
import { AlertTrendMini } from '../../components/alerts/AlertTrendMini';

interface Alert {
    id: string;
    timestamp: string;
    rule: {
        id: string;
        level: number;
        description: string;
        groups?: string[];
    };
    agent: {
        id: string;
        name: string;
        ip: string;
    };
    location: string;
    fullLog?: string;
    mitre?: {
        tactic?: string;
        technique?: string;
        techniqueId?: string;
    };
}

interface FilterState {
    severity: string;
    timeRange: string;
    agent: string;
    ruleGroup: string;
    search: string;
    showAcknowledged: boolean;
}

const ITEMS_PER_PAGE = 20;

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
    const [groupByRule, setGroupByRule] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [filters, setFilters] = useState<FilterState>({
        severity: 'all',
        timeRange: '24h',
        agent: 'all',
        ruleGroup: 'all',
        search: '',
        showAcknowledged: true,
    });

    // Load acknowledged from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('acknowledgedAlerts');
        if (saved) setAcknowledgedIds(new Set(JSON.parse(saved)));
    }, []);

    // Save acknowledged to localStorage
    const saveAcknowledged = (ids: Set<string>) => {
        localStorage.setItem('acknowledgedAlerts', JSON.stringify([...ids]));
        setAcknowledgedIds(ids);
    };

    const handleAcknowledge = (alertId: string) => {
        const newIds = new Set(acknowledgedIds);
        if (newIds.has(alertId)) {
            newIds.delete(alertId);
        } else {
            newIds.add(alertId);
        }
        saveAcknowledged(newIds);
    };

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/wazuh/alerts?limit=500');
            const data = await res.json();
            setAlerts(data.alerts || []);
            setError(data.success ? null : data.error);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchAlerts, 30000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, fetchAlerts]);

    // Get severity
    const getSeverity = (level: number): 'critical' | 'high' | 'warning' | 'info' => {
        if (level >= 12) return 'critical';
        if (level >= 10) return 'high';
        if (level >= 7) return 'warning';
        return 'info';
    };

    // Get unique agents and rule groups
    const uniqueAgents = useMemo(() => {
        const map = new Map<string, string>();
        alerts.forEach(a => map.set(a.agent.id, a.agent.name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [alerts]);

    const uniqueRuleGroups = useMemo(() => {
        const groups = new Set<string>();
        alerts.forEach(a => a.rule.groups?.forEach(g => groups.add(g)));
        return Array.from(groups).sort();
    }, [alerts]);

    // Filtered alerts
    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            const severity = getSeverity(alert.rule.level);

            // Severity filter
            if (filters.severity !== 'all') {
                if (filters.severity === 'critical' && severity !== 'critical' && severity !== 'high') return false;
                if (filters.severity === 'warning' && severity === 'info') return false;
            }

            // Time range filter
            const alertTime = new Date(alert.timestamp).getTime();
            const now = Date.now();
            if (filters.timeRange === '1h' && now - alertTime > 3600000) return false;
            if (filters.timeRange === '24h' && now - alertTime > 86400000) return false;
            if (filters.timeRange === '7d' && now - alertTime > 604800000) return false;

            // Agent filter
            if (filters.agent !== 'all' && alert.agent.id !== filters.agent) return false;

            // Rule group filter
            if (filters.ruleGroup !== 'all' && !alert.rule.groups?.includes(filters.ruleGroup)) return false;

            // Search filter
            if (filters.search) {
                const query = filters.search.toLowerCase();
                const searchable = `${alert.rule.description} ${alert.rule.id} ${alert.agent.name} ${alert.location}`.toLowerCase();
                if (!searchable.includes(query)) return false;
            }

            // Acknowledged filter
            if (!filters.showAcknowledged && acknowledgedIds.has(alert.id)) return false;

            return true;
        });
    }, [alerts, filters, acknowledgedIds]);

    // Grouped alerts
    const groupedAlerts = useMemo(() => {
        if (!groupByRule) return null;
        const groups: { [key: string]: Alert[] } = {};
        filteredAlerts.forEach(alert => {
            const key = alert.rule.id;
            if (!groups[key]) groups[key] = [];
            groups[key].push(alert);
        });
        return Object.entries(groups)
            .map(([ruleId, items]) => ({ ruleId, items, count: items.length, rule: items[0].rule }))
            .sort((a, b) => b.count - a.count);
    }, [filteredAlerts, groupByRule]);

    // Pagination
    const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
    const paginatedAlerts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAlerts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAlerts, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, groupByRule]);

    // Stats
    const criticalCount = alerts.filter(a => getSeverity(a.rule.level) === 'critical' || getSeverity(a.rule.level) === 'high').length;
    const warningCount = alerts.filter(a => getSeverity(a.rule.level) === 'warning').length;
    const infoCount = alerts.filter(a => getSeverity(a.rule.level) === 'info').length;

    // Export
    const handleExport = (format: 'csv' | 'json') => {
        const data = filteredAlerts.map(a => ({
            id: a.id,
            timestamp: a.timestamp,
            severity: getSeverity(a.rule.level),
            ruleId: a.rule.id,
            ruleLevel: a.rule.level,
            description: a.rule.description,
            agentName: a.agent.name,
            agentIp: a.agent.ip,
            location: a.location,
        }));

        let content: string;
        let filename: string;
        let type: string;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = `alerts-${new Date().toISOString().slice(0, 10)}.json`;
            type = 'application/json';
        } else {
            const headers = Object.keys(data[0] || {}).join(',');
            const rows = data.map(d => Object.values(d).map(v => `"${v}"`).join(','));
            content = [headers, ...rows].join('\n');
            filename = `alerts-${new Date().toISOString().slice(0, 10)}.csv`;
            type = 'text/csv';
        }

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTimeAgo = (timestamp: string) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">Security Alerts</h2>
                        <p className="text-slate-400">Real-time security events from Wazuh Manager</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchAlerts}
                            disabled={loading}
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={e => setAutoRefresh(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            Auto-refresh
                        </label>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-4 py-3 bg-yellow-500/10 text-yellow-400 text-sm rounded-lg border border-yellow-500/20 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Using fallback data: {error}
                    </div>
                )}

                {/* Stats Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-4">
                        <ShieldAlert className="w-8 h-8 text-red-400" />
                        <div>
                            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                            <div className="text-sm text-slate-400">Critical/High</div>
                        </div>
                    </div>
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-400" />
                        <div>
                            <div className="text-2xl font-bold text-yellow-400">{warningCount}</div>
                            <div className="text-sm text-slate-400">Warning</div>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-4">
                        <Info className="w-8 h-8 text-blue-400" />
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{infoCount}</div>
                            <div className="text-sm text-slate-400">Info</div>
                        </div>
                    </div>
                    {/* Trend Chart */}
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl lg:col-span-1">
                        <AlertTrendMini alerts={alerts} />
                    </div>
                </div>

                {/* Filters & Search Bar */}
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
                    {/* Row 1: Filters */}
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
                            <option value="critical">Critical/High</option>
                            <option value="warning">Warning & Above</option>
                        </select>
                        <select
                            value={filters.timeRange}
                            onChange={e => setFilters({ ...filters, timeRange: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                        >
                            <option value="1h">Last Hour</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="all">All Time</option>
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
                        <select
                            value={filters.ruleGroup}
                            onChange={e => setFilters({ ...filters, ruleGroup: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                        >
                            <option value="all">All Rule Groups</option>
                            {uniqueRuleGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    {/* Row 2: Search & Actions */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search alerts..."
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm placeholder:text-slate-500"
                            />
                            {filters.search && (
                                <button
                                    onClick={() => setFilters({ ...filters, search: '' })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.showAcknowledged}
                                onChange={e => setFilters({ ...filters, showAcknowledged: e.target.checked })}
                                className="rounded border-slate-600 bg-slate-800 text-emerald-500"
                            />
                            Show Acknowledged
                        </label>

                        <button
                            onClick={() => setGroupByRule(!groupByRule)}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${groupByRule ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-800 border border-slate-700 text-slate-400'
                                }`}
                        >
                            <Layers className="w-4 h-4" />
                            Group by Rule
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-slate-500">
                                {filteredAlerts.length} of {alerts.length} alerts
                            </span>
                            <div className="relative group">
                                <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700">
                                    <Download className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                                    <button
                                        onClick={() => handleExport('csv')}
                                        className="block w-full px-4 py-2 text-sm text-left hover:bg-slate-700"
                                    >
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={() => handleExport('json')}
                                        className="block w-full px-4 py-2 text-sm text-left hover:bg-slate-700"
                                    >
                                        Export JSON
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="space-y-4">
                    {filteredAlerts.length === 0 && !loading && (
                        <div className="p-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl">
                            No alerts matching your criteria.
                        </div>
                    )}

                    {groupByRule && groupedAlerts ? (
                        // Grouped View
                        groupedAlerts.map(group => (
                            <GroupedAlertCard
                                key={group.ruleId}
                                group={group}
                                getSeverity={getSeverity}
                                getTimeAgo={getTimeAgo}
                                onSelect={setSelectedAlert}
                                acknowledgedIds={acknowledgedIds}
                                onAcknowledge={handleAcknowledge}
                            />
                        ))
                    ) : (
                        // Regular Paginated View
                        paginatedAlerts.map(alert => (
                            <AlertItem
                                key={alert.id}
                                alert={alert}
                                severity={getSeverity(alert.rule.level)}
                                time={getTimeAgo(alert.timestamp)}
                                onClick={() => setSelectedAlert(alert)}
                                isAcknowledged={acknowledgedIds.has(alert.id)}
                                onAcknowledge={() => handleAcknowledge(alert.id)}
                            />
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!groupByRule && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let page: number;
                                if (totalPages <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    page = totalPages - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm ${currentPage === page
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-slate-500 ml-2">
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>
                )}
            </main>

            {/* Alert Detail Modal */}
            {selectedAlert && (
                <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
            )}
        </div>
    );
}

// Alert Item Component
function AlertItem({ alert, severity, time, onClick, isAcknowledged, onAcknowledge }: any) {
    const styles: any = {
        critical: { border: "border-red-500/50", bg: "bg-red-500/5", icon: <ShieldAlert className="w-6 h-6 text-red-500" />, text: "text-red-400" },
        high: { border: "border-orange-500/50", bg: "bg-orange-500/5", icon: <ShieldAlert className="w-6 h-6 text-orange-500" />, text: "text-orange-400" },
        warning: { border: "border-yellow-500/50", bg: "bg-yellow-500/5", icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />, text: "text-yellow-400" },
        info: { border: "border-blue-500/50", bg: "bg-blue-500/5", icon: <Info className="w-6 h-6 text-blue-500" />, text: "text-blue-400" },
    };

    const s = styles[severity] || styles.info;

    return (
        <div
            className={`p-5 rounded-xl border ${s.border} ${s.bg} flex gap-5 items-start transition-all hover:bg-slate-900 cursor-pointer ${isAcknowledged ? 'opacity-60' : ''}`}
            onClick={onClick}
        >
            <div className="shrink-0 mt-1">{s.icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                    <h4 className={`font-bold ${s.text} truncate`}>{alert.rule.description || `Rule ${alert.rule.id}`}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                        {isAcknowledged && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" /> Acknowledged
                            </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-mono border ${s.border} ${s.text}`}>
                            L{alert.rule.level}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {time}
                        </span>
                    </div>
                </div>
                <p className="text-slate-300 text-sm truncate">Rule ID: {alert.rule.id} | Location: {alert.location}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                        Agent: {alert.agent.name} ({alert.agent.ip || '-'})
                    </span>
                    {alert.mitre?.techniqueId && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
                            MITRE: {alert.mitre.techniqueId}
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
                        className={`ml-auto text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${isAcknowledged
                                ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                            }`}
                    >
                        <CheckCircle className="w-3 h-3" />
                        {isAcknowledged ? 'Unacknowledge' : 'Acknowledge'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Grouped Alert Card Component
function GroupedAlertCard({ group, getSeverity, getTimeAgo, onSelect, acknowledgedIds, onAcknowledge }: any) {
    const [expanded, setExpanded] = useState(false);
    const severity = getSeverity(group.rule.level);
    const styles: any = {
        critical: { border: "border-red-500/50", bg: "bg-red-500/10", text: "text-red-400" },
        high: { border: "border-orange-500/50", bg: "bg-orange-500/10", text: "text-orange-400" },
        warning: { border: "border-yellow-500/50", bg: "bg-yellow-500/10", text: "text-yellow-400" },
        info: { border: "border-blue-500/50", bg: "bg-blue-500/10", text: "text-blue-400" },
    };
    const s = styles[severity] || styles.info;

    return (
        <div className={`rounded-xl border ${s.border} overflow-hidden`}>
            <div
                className={`p-4 ${s.bg} flex items-center justify-between cursor-pointer`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <Layers className={`w-5 h-5 ${s.text}`} />
                    <div>
                        <h4 className={`font-bold ${s.text}`}>{group.rule.description || `Rule ${group.ruleId}`}</h4>
                        <p className="text-xs text-slate-400">Rule ID: {group.ruleId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${s.bg} ${s.text} border ${s.border}`}>
                        {group.count} alerts
                    </span>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </div>
            {expanded && (
                <div className="divide-y divide-slate-800">
                    {group.items.slice(0, 10).map((alert: Alert) => (
                        <div
                            key={alert.id}
                            className="p-4 hover:bg-slate-800/50 cursor-pointer flex items-center justify-between"
                            onClick={() => onSelect(alert)}
                        >
                            <div>
                                <span className="text-sm text-slate-300">{alert.agent.name}</span>
                                <span className="text-xs text-slate-500 ml-2">{alert.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {acknowledgedIds.has(alert.id) && (
                                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                                )}
                                <span className="text-xs text-slate-500">{getTimeAgo(alert.timestamp)}</span>
                            </div>
                        </div>
                    ))}
                    {group.count > 10 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                            +{group.count - 10} more alerts
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
