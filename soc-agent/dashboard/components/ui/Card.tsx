"use client";

import React from 'react';
import { clsx } from 'clsx';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                'bg-slate-900/50 border border-slate-800 rounded-xl',
                hover && 'hover:bg-slate-800/50 cursor-pointer transition-colors',
                onClick && 'cursor-pointer',
                className
            )}
        >
            {children}
        </div>
    );
}

export interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
    return (
        <div className={clsx('px-6 py-4 border-b border-slate-800 flex items-center justify-between', className)}>
            <div className="flex items-center gap-2">{children}</div>
            {action}
        </div>
    );
}

export interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return <div className={clsx('p-6', className)}>{children}</div>;
}

export interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={clsx('px-6 py-4 border-t border-slate-800 bg-slate-800/30', className)}>
            {children}
        </div>
    );
}
