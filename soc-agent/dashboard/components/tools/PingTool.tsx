"use client";

import React, { useState } from 'react';
import { Wifi, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PingResult {
    ip: string;
    status: 'online' | 'offline' | 'pending';
    latency?: number;
}

export interface PingToolProps {
    onResult?: (result: PingResult) => void;
    className?: string;
}

export function PingTool({ onResult, className }: PingToolProps) {
    const [host, setHost] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PingResult | null>(null);

    const handlePing = async () => {
        if (!host.trim()) return;

        setLoading(true);
        setResult({ ip: host, status: 'pending' });

        try {
            const res = await fetch('/api/network', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ping', host: host.trim() })
            });
            const data = await res.json();

            const pingResult: PingResult = {
                ip: host,
                status: data.success ? 'online' : 'offline',
                latency: data.latency
            };

            setResult(pingResult);
            onResult?.(pingResult);
        } catch (e) {
            setResult({ ip: host, status: 'offline' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={className}>
            <div className="flex items-center gap-2 mb-4">
                <Wifi className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-slate-200">Ping Host</span>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="Enter IP or hostname (e.g., 192.168.1.1)"
                    onKeyDown={(e) => e.key === 'Enter' && handlePing()}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
                <Button onClick={handlePing} loading={loading}>
                    Ping
                </Button>
            </div>

            {result && (
                <div className={`mt-4 p-4 rounded-lg border ${result.status === 'online'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : result.status === 'offline'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-slate-800 border-slate-700'
                    }`}>
                    <div className="flex items-center gap-2">
                        {result.status === 'online' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                        {result.status === 'offline' && <XCircle className="w-5 h-5 text-red-400" />}
                        {result.status === 'pending' && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                        <span className={
                            result.status === 'online' ? 'text-emerald-400' :
                                result.status === 'offline' ? 'text-red-400' : 'text-slate-400'
                        }>
                            {result.ip} - {result.status.toUpperCase()}
                            {result.latency && ` (${result.latency}ms)`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
