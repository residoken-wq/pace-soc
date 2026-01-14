"use client";

import React from 'react';
import { clsx } from 'clsx';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    message: string;
}

export interface LogTableProps {
    logs: LogEntry[];
    loading?: boolean;
    maxHeight?: string;
    className?: string;
}

const LEVEL_COLORS = {
    error: 'text-red-400 bg-red-500/10',
    warn: 'text-yellow-400 bg-yellow-500/10',
    info: 'text-blue-400 bg-blue-500/10',
    debug: 'text-slate-500 bg-slate-500/10',
};

export function LogTable({ logs, loading, maxHeight = '400px', className }: LogTableProps) {
    if (loading) {
        return (
            <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center', className)}>
                <span className="text-slate-500">Loading logs...</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center', className)}>
                <span className="text-slate-500">No logs found</span>
            </div>
        );
    }

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden', className)}>
            <div className="overflow-auto font-mono text-xs" style={{ maxHeight }}>
                <table className="w-full">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left w-[140px]">Timestamp</th>
                            <th className="px-3 py-2 text-left w-[60px]">Level</th>
                            <th className="px-3 py-2 text-left w-[100px]">Source</th>
                            <th className="px-3 py-2 text-left">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="px-3 py-2">
                                    <span className={clsx('px-1.5 py-0.5 rounded uppercase text-[10px] font-semibold', LEVEL_COLORS[log.level])}>
                                        {log.level}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-slate-400">{log.source}</td>
                                <td className="px-3 py-2 text-slate-300 break-all">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
