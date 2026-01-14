"use client";

import React from 'react';
import { clsx } from 'clsx';
import { ColorVariant, COLOR_CLASSES } from '@/lib/types/common';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: ColorVariant;
    size?: 'sm' | 'md';
    className?: string;
    dot?: boolean;
    dotPulse?: boolean;
}

export function Badge({
    children,
    variant = 'slate',
    size = 'md',
    className,
    dot = false,
    dotPulse = false
}: BadgeProps) {
    const colors = COLOR_CLASSES[variant];

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 font-medium rounded-full border',
                colors.bg,
                colors.border,
                colors.text,
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
                className
            )}
        >
            {dot && (
                <span className={clsx(
                    'w-2 h-2 rounded-full',
                    variant === 'emerald' && 'bg-emerald-400',
                    variant === 'green' && 'bg-green-400',
                    variant === 'red' && 'bg-red-400',
                    variant === 'yellow' && 'bg-yellow-400',
                    variant === 'blue' && 'bg-blue-400',
                    variant === 'purple' && 'bg-purple-400',
                    variant === 'orange' && 'bg-orange-400',
                    variant === 'slate' && 'bg-slate-400',
                    dotPulse && 'animate-pulse'
                )} />
            )}
            {children}
        </span>
    );
}

// Predefined badges for common statuses
export function StatusBadge({ status }: { status: 'active' | 'disconnected' | 'pending' | 'error' }) {
    const config: Record<string, { variant: ColorVariant; label: string }> = {
        active: { variant: 'emerald', label: 'Active' },
        disconnected: { variant: 'red', label: 'Disconnected' },
        pending: { variant: 'yellow', label: 'Pending' },
        error: { variant: 'red', label: 'Error' },
    };

    const { variant, label } = config[status] || config.error;

    return <Badge variant={variant} dot dotPulse={status === 'active'}>{label}</Badge>;
}

export function SeverityBadge({ level }: { level: number }) {
    let variant: ColorVariant = 'blue';
    let label = 'Info';

    if (level >= 12) { variant = 'red'; label = 'Critical'; }
    else if (level >= 10) { variant = 'orange'; label = 'High'; }
    else if (level >= 7) { variant = 'yellow'; label = 'Warning'; }

    return <Badge variant={variant} size="sm">{label}</Badge>;
}
