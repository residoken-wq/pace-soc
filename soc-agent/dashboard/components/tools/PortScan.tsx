"use client";

import React, { useState } from 'react';
import { Crosshair, Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { clsx } from 'clsx';

interface PortResult {
    port: number;
    service: string;
    status: 'open' | 'closed' | 'filtered';
}

interface PortScanProps {
    className?: string;
}

const COMMON_PORTS = [
    { port: 21, service: 'FTP' },
    { port: 22, service: 'SSH' },
    { port: 23, service: 'Telnet' },
    { port: 25, service: 'SMTP' },
    { port: 53, service: 'DNS' },
    { port: 80, service: 'HTTP' },
    { port: 110, service: 'POP3' },
    { port: 143, service: 'IMAP' },
    { port: 443, service: 'HTTPS' },
    { port: 445, service: 'SMB' },
    { port: 3306, service: 'MySQL' },
    { port: 3389, service: 'RDP' },
    { port: 5432, service: 'PostgreSQL' },
    { port: 6379, service: 'Redis' },
    { port: 8080, service: 'HTTP-Alt' },
    { port: 9100, service: 'Node-Exporter' },
    { port: 27017, service: 'MongoDB' },
];

export function PortScan({ className }: PortScanProps) {
    const [target, setTarget] = useState('');
    const [scanning, setScanning] = useState(false);
    const [results, setResults] = useState<PortResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        if (!target.trim()) {
            setError('Please enter a target IP or hostname');
            return;
        }

        setScanning(true);
        setResults([]);
        setError(null);
        setProgress(0);

        const scanResults: PortResult[] = [];

        for (let i = 0; i < COMMON_PORTS.length; i++) {
            const { port, service } = COMMON_PORTS[i];
            setProgress(Math.round(((i + 1) / COMMON_PORTS.length) * 100));

            try {
                // Call API to check port (this would need a backend endpoint)
                const res = await fetch(`/api/tools/portscan?host=${encodeURIComponent(target)}&port=${port}`, {
                    signal: AbortSignal.timeout(3000)
                });

                if (res.ok) {
                    const data = await res.json();
                    scanResults.push({
                        port,
                        service,
                        status: data.open ? 'open' : 'closed'
                    });
                } else {
                    scanResults.push({ port, service, status: 'filtered' });
                }
            } catch (e) {
                // Timeout or error = likely filtered
                scanResults.push({ port, service, status: 'filtered' });
            }

            // Update results progressively
            setResults([...scanResults]);
        }

        setScanning(false);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open':
                return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'closed':
                return <XCircle className="w-4 h-4 text-red-400" />;
            default:
                return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'bg-emerald-500/20 text-emerald-400';
            case 'closed':
                return 'bg-red-500/20 text-red-400';
            default:
                return 'bg-yellow-500/20 text-yellow-400';
        }
    };

    const openPorts = results.filter(r => r.status === 'open');

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-slate-200">Port Scanner</h3>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        placeholder="192.168.1.1 or hostname"
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500"
                        disabled={scanning}
                    />
                    <Button onClick={handleScan} loading={scanning}>
                        <Play className="w-4 h-4" />
                        Scan
                    </Button>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {scanning && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Scanning ports...</span>
                            <span className="text-emerald-400">{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Found {openPorts.length} open port(s)
                            </span>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1">
                            {results.map((result) => (
                                <div
                                    key={result.port}
                                    className={clsx(
                                        'flex items-center justify-between p-2 rounded-lg',
                                        result.status === 'open' ? 'bg-slate-800/50' : 'bg-slate-800/20'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(result.status)}
                                        <span className="font-mono text-sm text-slate-200">{result.port}</span>
                                        <span className="text-sm text-slate-400">{result.service}</span>
                                    </div>
                                    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(result.status))}>
                                        {result.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
