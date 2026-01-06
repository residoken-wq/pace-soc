"use client";

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, Loader2, Database, Server, FileText } from 'lucide-react';

export default function SystemDiagnostics() {
    const [checks, setChecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const runDiagnostics = async () => {
        setLoading(true);
        setChecks([]);

        // Define checks to run
        const results = [];

        // 1. Check Wazuh API
        try {
            const t0 = performance.now();
            const res = await fetch('/api/wazuh/test?check=api');
            const t1 = performance.now();
            if (res.ok) {
                results.push({ name: 'Wazuh Manager API', status: 'ok', latency: Math.round(t1 - t0), message: 'Connected to 192.168.1.206:55000' });
            } else {
                results.push({ name: 'Wazuh Manager API', status: 'error', message: 'Failed to connect (500/502)' });
            }
        } catch (e) {
            results.push({ name: 'Wazuh Manager API', status: 'error', message: 'Network Error' });
        }

        // 2. Check Elasticsearch/Indexer (via alerts)
        try {
            const t0 = performance.now();
            const res = await fetch('/api/wazuh/alerts?limit=1');
            const t1 = performance.now();
            const data = await res.json();
            if (res.ok && data.alerts) {
                results.push({ name: 'Wazuh Indexer', status: 'ok', latency: Math.round(t1 - t0), message: 'Query successful' });
            } else {
                results.push({ name: 'Wazuh Indexer', status: 'error', message: 'Query failed' });
            }
        } catch (e) {
            results.push({ name: 'Wazuh Indexer', status: 'error', message: 'Network Error' });
        }

        // 3. Check Dashboard Metrics (Prometheus/Node Exporter)
        try {
            const res = await fetch('/api/metrics');
            const data = await res.json();
            if (!data.error && data.cpu) {
                results.push({ name: 'System Metrics', status: 'ok', message: 'Receiving telemetry' });
            } else {
                results.push({ name: 'System Metrics', status: 'warn', message: 'No data from Node Exporter' });
            }
        } catch (e) {
            results.push({ name: 'System Metrics', status: 'warn', message: 'Metrics endpoint unreachable' });
        }

        setChecks(results);
        setLoading(false);
    };

    return (
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" /> System Diagnostics
                </h3>
                <button
                    onClick={runDiagnostics}
                    disabled={loading}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    Run Checks
                </button>
            </div>

            {checks.length > 0 && (
                <div className="space-y-3">
                    {checks.map((check, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-3">
                                {check.status === 'ok' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                {check.status === 'warn' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                                {check.status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                                <div>
                                    <div className="font-medium text-slate-200">{check.name}</div>
                                    <div className="text-xs text-slate-500">{check.message}</div>
                                </div>
                            </div>
                            {check.latency && (
                                <span className="text-xs font-mono text-slate-500">{check.latency}ms</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
