// Common type definitions and utilities

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}

export interface TimeRange {
    start: Date;
    end: Date;
}

export type Status = 'loading' | 'success' | 'error' | 'idle';

// Time utilities
export function getTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
}

// Color utilities
export type ColorVariant = 'emerald' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'orange' | 'slate';

export const COLOR_CLASSES: Record<ColorVariant, { bg: string; border: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400' },
};
