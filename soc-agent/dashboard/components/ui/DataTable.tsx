"use client";

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    width?: string;
    render?: (row: T, index: number) => React.ReactNode;
    sortable?: boolean;
}

export interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    rowKey: keyof T | ((row: T) => string);
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    className?: string;
}

export function DataTable<T>({
    data,
    columns,
    rowKey,
    onRowClick,
    loading = false,
    emptyMessage = 'No data available',
    className,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const getRowKey = (row: T, index: number): string => {
        if (typeof rowKey === 'function') return rowKey(row);
        return String(row[rowKey]);
    };

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aVal = (a as any)[sortKey];
            const bVal = (b as any)[sortKey];
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir]);

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden', className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900 text-slate-400 text-left border-b border-slate-800">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={clsx(
                                        'px-4 py-3 font-medium',
                                        col.sortable && 'cursor-pointer hover:text-white select-none'
                                    )}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, idx) => (
                                <tr
                                    key={getRowKey(row, idx)}
                                    onClick={() => onRowClick?.(row)}
                                    className={clsx(
                                        'hover:bg-slate-800/40 transition-colors',
                                        onRowClick && 'cursor-pointer'
                                    )}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3">
                                            {col.render ? col.render(row, idx) : String((row as any)[col.key] ?? '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
