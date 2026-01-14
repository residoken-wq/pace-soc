"use client";

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Check } from 'lucide-react';

export interface CodeBlockProps {
    code: string;
    language?: string;
    showCopy?: boolean;
    className?: string;
}

export function CodeBlock({ code, language, showCopy = true, className }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={clsx('relative group', className)}>
            <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm text-emerald-400 font-mono overflow-x-auto">
                {code}
            </pre>
            {showCopy && (
                <button
                    onClick={handleCopy}
                    className={clsx(
                        'absolute top-2 right-2 p-2 rounded transition-all',
                        copied
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100'
                    )}
                    title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
}

// Inline code component
export function InlineCode({ children }: { children: React.ReactNode }) {
    return (
        <code className="px-2 py-0.5 bg-slate-800 rounded text-emerald-400 text-sm font-mono">
            {children}
        </code>
    );
}
