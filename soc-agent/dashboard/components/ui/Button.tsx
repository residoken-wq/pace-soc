"use client";

import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
    secondary: 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
    ghost: 'hover:bg-slate-800 text-slate-400 hover:text-white',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={clsx(
                'font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                VARIANT_CLASSES[variant],
                SIZE_CLASSES[size],
                className
            )}
            {...props}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
            {children}
        </button>
    );
}
