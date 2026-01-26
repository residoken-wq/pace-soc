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

    const handleAnalyzeAI = async () => {
        setAnalyzing(true);
        setShowAnalysisModal(true);
        setAnalysisResult(null);

        try {
            // Send last 50 logs for analysis
            const logsToAnalyze = filteredLogs.slice(0, 50).map(l => ({
                timestamp: l.timestamp,
                level: l.level,
                source: l.source,
                message: l.message
            }));

            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: logsToAnalyze })
            });

            const data = await res.json();

            if (data.success) {
                setAnalysisResult(data.analysis);
            } else {
                setAnalysisResult({
                    error: true,
                    summary: `Analysis failed: ${data.error}. Please checking your API Key in Settings.`
                });
            }
        } catch (e: any) {
            setAnalysisResult({
                error: true,
                summary: `Analysis error: ${e.message}`
            });
        } finally {
            setAnalyzing(false);
        }
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
                                    <th className="px-4 py-3 w-36 font-medium">Source IP</th>
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
                                    {/* Error State */}
                                    {analysisResult.error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-300">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <div>
                                                <h4 className="font-semibold">Analysis Failed</h4>
                                                <p className="text-sm opacity-80">{analysisResult.summary}</p>
                                            </div>
                                        </div>
                                    )}

                                    {!analysisResult.error && (
                                        <>
                                            {/* Summary & Risk Score */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                                    <h4 className="font-semibold text-purple-300 mb-2">Executive Summary</h4>
                                                    <p className="text-slate-300 text-sm leading-relaxed">{analysisResult.summary}</p>
                                                </div>
                                                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col items-center justify-center text-center">
                                                    <div className="text-sm text-slate-400 mb-1">Risk Assessment</div>
                                                    <div className={`text-4xl font-bold ${(analysisResult.riskScore || 0) > 75 ? 'text-red-400' :
                                                        (analysisResult.riskScore || 0) > 40 ? 'text-yellow-400' : 'text-emerald-400'
                                                        }`}>
                                                        {analysisResult.riskScore || 0}/100
                                                    </div>
                                                    <div className={`text-xs uppercase font-bold mt-1 px-2 py-0.5 rounded ${analysisResult.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                        analysisResult.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                            analysisResult.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-emerald-500/20 text-emerald-400'
                                                        }`}>
                                                        {analysisResult.riskLevel || 'LOW'} Level
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Threats Detected (if any) */}
                                            {analysisResult.threats && analysisResult.threats.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4 text-red-400" /> Detected Threats
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {analysisResult.threats.map((threat: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                                                                    <span className="text-red-300 font-medium">{threat.name}</span>
                                                                </div>
                                                                {threat.mitre && (
                                                                    <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400 border border-slate-700">
                                                                        MITRE {threat.mitre}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Insights */}
                                            <div>
                                                <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                                    <Info className="w-4 h-4 text-blue-400" /> Key Insights
                                                </h4>
                                                <ul className="space-y-2">
                                                    {analysisResult.insights?.map((insight: string, idx: number) => (
                                                        <li key={idx} className="flex gap-3 text-sm text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                                                            <span className="text-blue-400 font-bold">•</span>
                                                            {insight}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Recommendations */}
                                            <div>
                                                <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Actionable Recommendations
                                                </h4>
                                                <div className="space-y-3">
                                                    {analysisResult.recommendations?.map((rec: any, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-3 text-sm text-slate-300 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                                                            <span className="mt-0.5 bg-emerald-500/20 text-emerald-400 w-5 h-5 flex items-center justify-center rounded text-xs font-bold shrink-0">
                                                                {idx + 1}
                                                            </span>
                                                            <span>{rec}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
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
