"use client";

import React, { useState } from 'react';
import { Network, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';

interface ScanResult {
    ip: string;
    status: 'online' | 'offline';
    hostname?: string;
}

export interface ScanToolProps {
    onScanComplete?: (results: ScanResult[]) => void;
    className?: string;
}

export function ScanTool({ onScanComplete, className }: ScanToolProps) {
    const [subnet, setSubnet] = useState('192.168.1.0/24');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [progress, setProgress] = useState(0);

    const handleScan = async () => {
        setLoading(true);
        setResults([]);
        setProgress(0);

        try {
            const res = await fetch('/api/network', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'scan', subnet })
            });
            const data = await res.json();

            const scanResults: ScanResult[] = data.hosts || [];
            setResults(scanResults);
            setProgress(100);
            onScanComplete?.(scanResults);
        } catch (e) {
            console.error('Scan failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const columns: Column<ScanResult>[] = [
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
                <span className={`w-2 h-2 rounded-full inline-block ${row.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            )
        },
        { key: 'ip', header: 'IP Address', sortable: true },
        { key: 'hostname', header: 'Hostname', render: (row) => row.hostname || '-' },
    ];

    const onlineCount = results.filter(r => r.status === 'online').length;

    return (
        <div className={className}>
            <div className="flex items-center gap-2 mb-4">
                <Network className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-slate-200">Network Scanner</span>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder="Subnet (e.g., 192.168.1.0/24)"
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono"
                />
                <Button onClick={handleScan} loading={loading} variant="secondary">
                    <Server className="w-4 h-4" />
                    Scan Network
                </Button>
            </div>

            {loading && (
                <div className="mb-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Scanning network...</p>
                </div>
            )}

            {results.length > 0 && (
                <>
                    <div className="flex gap-4 mb-4 text-sm">
                        <span className="text-slate-400">
                            Total: <span className="text-slate-200 font-semibold">{results.length}</span>
                        </span>
                        <span className="text-slate-400">
                            Online: <span className="text-emerald-400 font-semibold">{onlineCount}</span>
                        </span>
                        <span className="text-slate-400">
                            Offline: <span className="text-red-400 font-semibold">{results.length - onlineCount}</span>
                        </span>
                    </div>
                    <DataTable
                        data={results}
                        columns={columns}
                        rowKey="ip"
                        emptyMessage="No hosts found"
                    />
                </>
            )}
        </div>
    );
}
