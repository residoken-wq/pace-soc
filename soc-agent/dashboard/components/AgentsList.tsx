"use client";

import React, { useEffect, useState } from 'react';
import { Users, RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    ip: string;
    status: string;
    os: string;
    version: string;
}

export default function AgentsList() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restartingId, setRestartingId] = useState<string | null>(null);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/wazuh/agents');
            const data = await res.json();
            setAgents(data.agents || []);
            setError(data.success ? null : data.error);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const restartAgent = async (agentId: string) => {
        setRestartingId(agentId);
        try {
            await fetch('/api/wazuh/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restart', agentId })
            });
            // Wait a bit then refresh
            setTimeout(fetchAgents, 3000);
        } catch (e) {
            console.error('Restart failed', e);
        } finally {
            setRestartingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            active: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircle className="w-3 h-3" /> },
            disconnected: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
            pending: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: <AlertCircle className="w-3 h-3" /> },
            never_connected: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', icon: <AlertCircle className="w-3 h-3" /> }
        };
        const s = styles[status] || styles.pending;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.border} ${s.text} border`}>
                {s.icon} {status}
            </span>
        );
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold text-slate-200">Managed Agents</h3>
                    <span className="text-xs text-slate-500">({agents.length} total)</span>
                </div>
                <button
                    onClick={fetchAgents}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="px-6 py-2 bg-yellow-500/10 text-yellow-400 text-sm border-b border-yellow-500/20">
                    ⚠️ Using fallback data: {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-slate-400 text-left bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-3 font-medium">ID</th>
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">IP</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium">OS</th>
                            <th className="px-6 py-3 font-medium">Version</th>
                            <th className="px-6 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {agents.map(agent => (
                            <tr key={agent.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-400">{agent.id}</td>
                                <td className="px-6 py-4 text-slate-200 font-medium">{agent.name}</td>
                                <td className="px-6 py-4 font-mono text-slate-400">{agent.ip}</td>
                                <td className="px-6 py-4">{getStatusBadge(agent.status)}</td>
                                <td className="px-6 py-4 text-slate-400">{agent.os}</td>
                                <td className="px-6 py-4 text-slate-500">{agent.version}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => restartAgent(agent.id)}
                                        disabled={restartingId === agent.id || agent.status === 'disconnected'}
                                        className="px-3 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        {restartingId === agent.id ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Restarting...</>
                                        ) : (
                                            <><RefreshCw className="w-3 h-3" /> Restart</>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
