"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { FileText, Search, Filter, Download, RefreshCw, Clock, AlertTriangle, Info, CheckCircle, XCircle, Sparkles, X, Brain } from 'lucide-react';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    message: string;
    agent?: string;
    agentIp?: string;
    srcIp?: string;  // Source/Attacker IP
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ level: 'all', source: 'all', search: '' });
    const [autoRefresh, setAutoRefresh] = useState(true); // Default ON for real-time
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // AI Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);

    const fetchLogs = async (isRefresh = false) => {
        // Only show loading on initial load, not refreshes
        if (!isRefresh) setLoading(true);
        try {
            // Add cache-busting timestamp to prevent stale data
            const res = await fetch(`/api/logs?_t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await res.json();
            setLogs(data.logs || []);
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            if (!isRefresh) setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(false);
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(() => fetchLogs(true), 5000); // 5s for real-time feel
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const filteredLogs = logs.filter(log => {
        if (filter.level !== 'all' && log.level !== filter.level) return false;
        if (filter.source !== 'all' && log.source !== filter.source) return false;
        if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
        return true;
    });

    const sources = [...new Set(logs.map(l => l.source))];

    const exportLogs = () => {
        const csv = [
            'Timestamp,Level,Source,Agent,IP,Message',
            ...filteredLogs.map(l => `"${l.timestamp}","${l.level}","${l.source}","${l.agent || ''}","${l.srcIp || ''}","${l.message.replace(/"/g, '""')}"`)
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soc-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleAnalyzeAI = () => {
        setAnalyzing(true);
        setShowAnalysisModal(true);

        setTimeout(() => {
            const errorCount = filteredLogs.filter(l => l.level === 'error').length;
            const warnCount = filteredLogs.filter(l => l.level === 'warn').length;

            // Heuristic Analysis Logic
            const insights: string[] = [];
            const recommendations: any[] = [];
            const processedLogs = filteredLogs.map(l => l.message.toLowerCase());

            // Pattern 1: Database Auth Failures
            if (processedLogs.some(msg => msg.includes('failed to authenticate') || msg.includes('access denied'))) {
                insights.push("Detected authentication failures for database or service accounts.");
                recommendations.push({
                    title: "Verify Service Credentials",
                    steps: ["Check .env files for correct passwords", "Verify database user permissions", "Review access logs for potential unauthorized access"]
                });
            }

            // Pattern 2: Rate Limiting
            if (processedLogs.some(msg => msg.includes('rate limit') || msg.includes('throttling'))) {
                insights.push("Services are hitting rate limits, which may degrade performance.");
                recommendations.push({
                    title: "Adjust Rate Limiting Strategies",
                    steps: ["Increase threshold in configuration", "Implement exponential backoff in clients", "Check for abusive traffic sources"]
                });
            }

            // Pattern 3: Deprecated APIs
            if (processedLogs.some(msg => msg.includes('deprecated'))) {
                insights.push("Logs contain warnings about deprecated API usage.");
                recommendations.push({
                    title: "Plan for API Upgrades",
                    steps: ["Identify affected services from logs", "Review vendor documentation for upgrade paths", "Schedule maintenance window for updates"]
                });
            }

            // Pattern 4: Network Issues
            if (processedLogs.some(msg => msg.includes('timeout') || msg.includes('connection refused'))) {
                insights.push("Network connectivity issues detected (timeouts/refusals).");
                recommendations.push({
                    title: "Troubleshoot Network Connectivity",
                    steps: ["Check firewall rules (UFW/IPTables)", "Verify service status with 'systemctl status'", "Ensure DNS resolution is working correctly"]
                });
            }

            // Fallback if no specific patterns found but errors exist
            if (insights.length === 0 && errorCount > 0) {
                insights.push("Multiple system errors detected without a specific known pattern.");
                recommendations.push({
                    title: "General System Health Check",
                    steps: ["Review system resource usage (top/htop)", "Check disk space (df -h)", "Restart affected services"]
                });
            }

            if (insights.length === 0) {
                insights.push("System appears healthy with no critical anomalies detected.");
                recommendations.push({
                    title: "Routine Maintenance",
                    steps: ["Continue monitoring logs", "Perform regular system updates", "Review backup status"]
                });
            }

            setAnalysisResult({
                summary: `Analyzed ${filteredLogs.length} logs. Found ${errorCount} errors and ${warnCount} warnings.`,
                insights: insights,
                recommendations: recommendations
            });
            setAnalyzing(false);
        }, 1500);
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
            case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
            case 'info': return <Info className="w-4 h-4 text-blue-400" />;
            default: return <CheckCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    const getLevelStyle = (level: string) => {
        switch (level) {
            case 'error': return 'bg-red-500/10 border-red-500/30 text-red-400';
            case 'warn': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
            case 'info': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
            default: return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-emerald-400" />
                            System Logs
                        </h2>
                        <p className="text-slate-400">View and search system and security logs</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAnalyzeAI}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <Sparkles className="w-4 h-4" /> Analyze with AI
                        </button>
                        <button
                            onClick={exportLogs}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                        <button
                            onClick={() => fetchLogs(false)}
                            disabled={loading}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={e => setAutoRefresh(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-800"
                            />
                            Auto-refresh
                        </label>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-400">Filters:</span>
                    </div>
                    <select
                        value={filter.level}
                        onChange={e => setFilter({ ...filter, level: e.target.value })}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        <option value="all">All Levels</option>
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                    </select>
                    <select
                        value={filter.source}
                        onChange={e => setFilter({ ...filter, source: e.target.value })}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        <option value="all">All Sources</option>
                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={filter.search}
                            onChange={e => setFilter({ ...filter, search: e.target.value })}
                            placeholder="Search logs..."
                            className="w-full pl-10 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                    <div className="text-sm text-slate-500 flex items-center">
                        {filteredLogs.length} entries
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-900 text-slate-400 text-left border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 w-40 font-medium">Timestamp</th>
                                    <th className="px-4 py-3 w-24 font-medium">Level</th>
                                    <th className="px-4 py-3 w-28 font-medium">Source</th>
                                    <th className="px-4 py-3 w-28 font-medium">Agent</th>
                                    <th className="px-4 py-3 w-28 font-medium">Source IP</th>
                                    <th className="px-4 py-3 font-medium">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                            {loading ? 'Loading logs...' : 'No logs found matching your criteria'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.slice(0, 100).map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelStyle(log.level)}`}>
                                                    {getLevelIcon(log.level)}
                                                    {log.level.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 font-medium text-xs">{log.source}</td>
                                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{log.agent || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                <span className={log.srcIp && log.srcIp !== '-' ? 'text-amber-400' : 'text-slate-500'}>
                                                    {log.srcIp || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 font-mono text-xs truncate max-w-xl" title={log.message}>
                                                {log.message}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* AI Analysis Modal */}
            {showAnalysisModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                AI Log Analysis
                            </h3>
                            <button onClick={() => setShowAnalysisModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {analyzing ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Brain className="w-8 h-8 text-purple-400 animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 animate-pulse">Analyzing log patterns and anomalies...</p>
                                </div>
                            ) : analysisResult ? (
                                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <h4 className="font-semibold text-purple-300 mb-2">Summary</h4>
                                        <p className="text-slate-300 text-sm leading-relaxed">{analysisResult.summary}</p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-blue-400" /> Key Insights
                                        </h4>
                                        <ul className="space-y-2">
                                            {analysisResult.insights.map((insight: string, idx: number) => (
                                                <li key={idx} className="flex gap-3 text-sm text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                                                    <span className="text-blue-400 font-bold">•</span>
                                                    {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-400" /> Actionable Recommendations
                                        </h4>
                                        <div className="space-y-4">
                                            {analysisResult.recommendations.map((rec: any, idx: number) => (
                                                <div key={idx} className="bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                                                    <h5 className="text-emerald-300 font-medium mb-2 flex items-center gap-2">
                                                        <span className="bg-emerald-500/10 p-1 rounded text-xs">{idx + 1}</span>
                                                        {rec.title}
                                                    </h5>
                                                    <div className="space-y-1.5 pl-2">
                                                        {rec.steps?.map((step: string, sIdx: number) => (
                                                            <div key={sIdx} className="text-sm text-slate-300 font-mono bg-slate-900/50 p-1.5 rounded border border-slate-800/50">
                                                                $ {step}
                                                            </div>
                                                        )) || (
                                                                <div className="text-sm text-slate-300">{rec.toString()}</div>
                                                            )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
                            <button
                                onClick={() => setShowAnalysisModal(false)}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
