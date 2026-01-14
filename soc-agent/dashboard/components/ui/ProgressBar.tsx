"use client";

import React from 'react';
import { clsx } from 'clsx';
import { ColorVariant } from '@/lib/types/common';

export interface ProgressBarProps {
    value: number;
    max?: number;
    variant?: ColorVariant;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const BG_COLORS: Record<ColorVariant, string> = {
    emerald: 'bg-emerald-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    slate: 'bg-slate-500',
};

const SIZE_CLASSES = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
};

export function ProgressBar({
    value,
    max = 100,
    variant = 'emerald',
    size = 'md',
    showLabel = false,
    className,
}: ProgressBarProps) {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={clsx('w-full', className)}>
            <div className={clsx('bg-slate-700 rounded-full overflow-hidden', SIZE_CLASSES[size])}>
                <div
                    className={clsx('h-full transition-all duration-500', BG_COLORS[variant])}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {showLabel && (
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{value}</span>
                    <span>{max}</span>
                </div>
            )}
        </div>
    );
}

// Metric display with progress bar
export interface MetricProgressProps {
    label: string;
    value: number;
    unit?: string;
    icon?: React.ReactNode;
    variant?: ColorVariant;
    className?: string;
}

export function MetricProgress({ label, value, unit = '%', icon, variant = 'emerald', className }: MetricProgressProps) {
    return (
        <div className={clsx('p-4 bg-slate-800/50 rounded-lg border border-slate-700', className)}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs text-slate-400">{label}</span>
                </div>
                <span className="text-lg font-bold text-slate-100">{value}{unit}</span>
            </div>
            <ProgressBar value={value} variant={variant} />
        </div>
    );
}
