"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { FileText, Search, Filter, Download, RefreshCw, Clock, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    message: string;
    agent?: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ level: 'all', source: 'all', search: '' });
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchLogs, 10000);
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
            'Timestamp,Level,Source,Agent,Message',
            ...filteredLogs.map(l => `"${l.timestamp}","${l.level}","${l.source}","${l.agent || ''}","${l.message.replace(/"/g, '""')}"`)
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soc-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
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
                            onClick={exportLogs}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                        <button
                            onClick={fetchLogs}
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
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
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
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
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
                            className="w-full pl-10 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                        />
                    </div>
                    <div className="text-sm text-slate-500">
                        {filteredLogs.length} of {logs.length} entries
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 text-left">
                                <tr>
                                    <th className="px-4 py-3 w-44">Timestamp</th>
                                    <th className="px-4 py-3 w-24">Level</th>
                                    <th className="px-4 py-3 w-32">Source</th>
                                    <th className="px-4 py-3 w-32">Agent</th>
                                    <th className="px-4 py-3">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                            {loading ? 'Loading logs...' : 'No logs found matching your criteria'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.slice(0, 100).map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/30">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                                <Clock className="inline w-3 h-3 mr-1" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getLevelStyle(log.level)}`}>
                                                    {getLevelIcon(log.level)}
                                                    {log.level.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">{log.source}</td>
                                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{log.agent || '-'}</td>
                                            <td className="px-4 py-3 text-slate-300 font-mono text-xs truncate max-w-lg">{log.message}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}
