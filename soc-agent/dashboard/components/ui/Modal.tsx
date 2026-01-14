"use client";

import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const SIZE_CLASSES = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[95vw]',
};

export function Modal({ isOpen, onClose, children, className, size = 'lg' }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div
                className={clsx(
                    'bg-slate-900 border border-slate-700 rounded-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col',
                    SIZE_CLASSES[size],
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}

export interface ModalHeaderProps {
    children: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

export function ModalHeader({ children, onClose, className }: ModalHeaderProps) {
    return (
        <div className={clsx('px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50', className)}>
            <div className="flex items-center gap-3">{children}</div>
            {onClose && (
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}

export interface ModalContentProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalContent({ children, className }: ModalContentProps) {
    return (
        <div className={clsx('p-6 overflow-y-auto custom-scrollbar flex-1', className)}>
            {children}
        </div>
    );
}

export interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div className={clsx('px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3', className)}>
            {children}
        </div>
    );
}
