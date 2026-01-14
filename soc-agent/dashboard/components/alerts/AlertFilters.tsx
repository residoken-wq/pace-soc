"use client";

import React from 'react';
import { clsx } from 'clsx';
import { Filter, RefreshCw } from 'lucide-react';

export interface AlertFiltersState {
    severity: string;
    timeRange: string;
    agent?: string;
    search?: string;
}

export interface AlertFiltersProps {
    filters: AlertFiltersState;
    onChange: (filters: AlertFiltersState) => void;
    agents?: { id: string; name: string }[];
    totalCount?: number;
    filteredCount?: number;
    loading?: boolean;
    onRefresh?: () => void;
    className?: string;
}

export function AlertFilters({
    filters,
    onChange,
    agents = [],
    totalCount,
    filteredCount,
    loading,
    onRefresh,
    className,
}: AlertFiltersProps) {
    return (
        <div className={clsx('flex flex-wrap gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl', className)}>
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">Filters:</span>
            </div>

            <select
                value={filters.severity}
                onChange={(e) => onChange({ ...filters, severity: e.target.value })}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
            >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning & Above</option>
            </select>

            <select
                value={filters.timeRange}
                onChange={(e) => onChange({ ...filters, timeRange: e.target.value })}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
            >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
            </select>

            {agents.length > 0 && (
                <select
                    value={filters.agent || 'all'}
                    onChange={(e) => onChange({ ...filters, agent: e.target.value === 'all' ? undefined : e.target.value })}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
                >
                    <option value="all">All Agents</option>
                    {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            )}

            <div className="ml-auto flex items-center gap-3">
                {filteredCount !== undefined && totalCount !== undefined && (
                    <span className="text-sm text-slate-500">
                        {filteredCount} of {totalCount} alerts
                    </span>
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
