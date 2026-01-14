"use client";

import React from 'react';
import { clsx } from 'clsx';
import { Filter, RefreshCw, Search } from 'lucide-react';

export interface LogFiltersState {
    level: string;
    source: string;
    search: string;
}

export interface LogFiltersProps {
    filters: LogFiltersState;
    onChange: (filters: LogFiltersState) => void;
    sources?: string[];
    loading?: boolean;
    onRefresh?: () => void;
    autoRefresh?: boolean;
    onAutoRefreshToggle?: () => void;
    className?: string;
}

export function LogFilters({
    filters,
    onChange,
    sources = ['auth', 'syslog', 'kernel', 'nginx', 'wazuh'],
    loading,
    onRefresh,
    autoRefresh,
    onAutoRefreshToggle,
    className,
}: LogFiltersProps) {
    return (
        <div className={clsx('flex flex-wrap gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl', className)}>
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">Filters:</span>
            </div>

            <select
                value={filters.level}
                onChange={(e) => onChange({ ...filters, level: e.target.value })}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
            >
                <option value="all">All Levels</option>
                <option value="error">Errors Only</option>
                <option value="warn">Warnings & Errors</option>
                <option value="info">Info & Above</option>
                <option value="debug">Debug</option>
            </select>

            <select
                value={filters.source}
                onChange={(e) => onChange({ ...filters, source: e.target.value })}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
            >
                <option value="all">All Sources</option>
                {sources.map((src) => (
                    <option key={src} value={src}>{src}</option>
                ))}
            </select>

            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => onChange({ ...filters, search: e.target.value })}
                    placeholder="Search logs..."
                    className="w-full pl-10 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500"
                />
            </div>

            <div className="ml-auto flex items-center gap-3">
                {onAutoRefreshToggle && (
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={onAutoRefreshToggle}
                            className="rounded border-slate-600 bg-slate-800"
                        />
                        Auto-refresh
                    </label>
                )}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
                    </button>
                )}
            </div>
        </div>
    );
}
