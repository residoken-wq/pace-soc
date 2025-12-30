"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { AlertTriangle, CheckCircle, ShieldAlert, Filter, RefreshCw, Clock, Info } from 'lucide-react';

interface Alert {
    id: string;
    timestamp: string;
    rule: {
        id: string;
        level: number;
        description: string;
    };
    agent: {
        id: string;
        name: string;
        ip: string;
    };
    location: string;
    fullLog?: string;
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState({ severity: 'all', timeRange: '24h' });
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/wazuh/alerts?limit=100');
            const data = await res.json();
            setAlerts(data.alerts || []);
            setError(data.success ? null : data.error);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getSeverity = (level: number): 'critical' | 'warning' | 'info' | 'success' => {
        if (level >= 12) return 'critical';
        if (level >= 7) return 'warning';
        if (level >= 4) return 'info';
        return 'success';
    };

    const getTimeAgo = (timestamp: string) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const filteredAlerts = alerts.filter(alert => {
        const severity = getSeverity(alert.rule.level);
        if (filter.severity !== 'all') {
            if (filter.severity === 'critical' && severity !== 'critical') return false;
            if (filter.severity === 'warning' && severity !== 'warning' && severity !== 'critical') return false;
        }
        // Time range filtering
        const alertTime = new Date(alert.timestamp).getTime();
        const now = Date.now();
        if (filter.timeRange === '1h' && now - alertTime > 3600000) return false;
        if (filter.timeRange === '24h' && now - alertTime > 86400000) return false;
        if (filter.timeRange === '7d' && now - alertTime > 604800000) return false;
        return true;
    });

    // Stats
    const criticalCount = alerts.filter(a => getSeverity(a.rule.level) === 'critical').length;
    const warningCount = alerts.filter(a => getSeverity(a.rule.level) === 'warning').length;
    const infoCount = alerts.filter(a => getSeverity(a.rule.level) === 'info' || getSeverity(a.rule.level) === 'success').length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
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
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-4">
                        <ShieldAlert className="w-8 h-8 text-red-400" />
                        <div>
                            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                            <div className="text-sm text-slate-400">Critical</div>
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
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-400">Filters:</span>
                    </div>
                    <select
                        value={filter.severity}
                        onChange={e => setFilter({ ...filter, severity: e.target.value })}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                    >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical Only</option>
                        <option value="warning">Warning & Above</option>
                    </select>
                    <select
                        value={filter.timeRange}
                        onChange={e => setFilter({ ...filter, timeRange: e.target.value })}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="all">All Time</option>
                    </select>
                    <div className="ml-auto text-sm text-slate-500">
                        {filteredAlerts.length} of {alerts.length} alerts
                    </div>
                </div>

                {/* Alerts List */}
                <div className="space-y-4">
                    {filteredAlerts.length === 0 && !loading && (
                        <div className="p-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl">
                            No alerts matching your criteria.
                        </div>
                    )}
                    {filteredAlerts.map(alert => (
                        <AlertItem
                            key={alert.id}
                            severity={getSeverity(alert.rule.level)}
                            title={alert.rule.description || `Rule ${alert.rule.id}`}
                            source={`${alert.agent.name} (${alert.agent.ip})`}
                            time={getTimeAgo(alert.timestamp)}
                            description={`Rule ID: ${alert.rule.id} | Level: ${alert.rule.level} | Location: ${alert.location}`}
                            ruleLevel={alert.rule.level}
                        />
                    ))}
                </div>

            </main>
        </div>
    );
}

function AlertItem({ severity, title, source, time, description, ruleLevel }: any) {
    const styles: any = {
        critical: { border: "border-red-500/50", bg: "bg-red-500/5", icon: <ShieldAlert className="w-6 h-6 text-red-500" />, text: "text-red-400" },
        warning: { border: "border-yellow-500/50", bg: "bg-yellow-500/5", icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />, text: "text-yellow-400" },
        info: { border: "border-blue-500/50", bg: "bg-blue-500/5", icon: <Info className="w-6 h-6 text-blue-500" />, text: "text-blue-400" },
        success: { border: "border-emerald-500/50", bg: "bg-emerald-500/5", icon: <CheckCircle className="w-6 h-6 text-emerald-500" />, text: "text-emerald-400" }
    };

    const s = styles[severity] || styles.info;

    return (
        <div className={`p-5 rounded-xl border ${s.border} ${s.bg} flex gap-5 items-start transition-all hover:bg-slate-900`}>
            <div className="shrink-0 mt-1">
                {s.icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-bold ${s.text}`}>{title}</h4>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono border ${s.border} ${s.text}`}>
                            L{ruleLevel}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {time}
                        </span>
                    </div>
                </div>
                <p className="text-slate-300 text-sm">{description}</p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                        Agent: {source}
                    </span>
                </div>
            </div>
        </div>
    );
}
