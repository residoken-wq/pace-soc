"use client";

import React, { useState, useEffect } from 'react';
import { Search, Server, Activity, AlertTriangle, Power, RefreshCw, Terminal, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card'; // Assuming Card exists, if not I will use div with classes
// If Card doesn't exist, I'll stick to standard tailwind classes
// I'll check the list_dir result first, but I'll write the code assuming basic components or standard HTML for now to be safe.

interface Agent {
    id: string;
    name: string;
    ip: string;
    status: 'active' | 'disconnected' | 'never_connected';
    os: {
        name: string;
        platform: string;
        version: string;
    };
    version: string;
    lastKeepAlive: string;
}

interface Alert {
    id: string;
    timestamp: string;
    rule: {
        id: string;
        level: number;
        description: string;
    };
    fullLog: string;
}

export function AgentInspector() {
    const [searchTerm, setSearchTerm] = useState('');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [activeTab, setActiveTab] = useState<'health' | 'alerts' | 'actions'>('health');
    const [actionLoading, setActionLoading] = useState(false);

    // Search Agents
    useEffect(() => {
        const searchAgents = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/tools/inspector', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'search_agents', query: searchTerm })
                });
                const data = await res.json();
                if (data.success) {
                    setAgents(data.agents);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(searchAgents, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Load Agent Details when selected
    useEffect(() => {
        if (!selectedAgent) return;

        const fetchAlerts = async () => {
            setLoadingAlerts(true);
            try {
                const res = await fetch('/api/tools/inspector', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_alerts', agentId: selectedAgent.id })
                });
                const data = await res.json();
                if (data.success) {
                    setAlerts(data.alerts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAlerts(false);
            }
        };

        fetchAlerts();
    }, [selectedAgent]);

    const handleRestartAgent = async () => {
        if (!selectedAgent) return;
        if (!confirm(`Are you sure you want to restart agent ${selectedAgent.name}?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch('/api/tools/inspector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restart_agent', agentId: selectedAgent.id })
            });
            const data = await res.json();
            if (data.success) {
                alert('Restart command sent successfully');
            } else {
                alert('Failed to send restart command: ' + data.message);
            }
        } catch (e) {
            alert('Error sending command');
        } finally {
            setActionLoading(false);
        }
    };

    const handleTriggerScan = async () => {
        if (!selectedAgent) return;

        setActionLoading(true);
        try {
            const res = await fetch('/api/tools/inspector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'trigger_scan', agentId: selectedAgent.id })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message || 'Scan triggered successfully');
            } else {
                alert('Failed to trigger scan: ' + data.message);
            }
        } catch (e) {
            alert('Error sending command');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 min-h-[500px] flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <Search className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-bold text-slate-100">Agent Inspector</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                {/* Left Panel: Search & List */}
                <div className="border-r border-slate-800 pr-6 flex flex-col gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search agent by name/IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 pl-10"
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {loading && <div className="text-center text-slate-500 py-4"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>}

                        {!loading && agents.length === 0 && (
                            <div className="text-center text-slate-500 py-4">No agents found</div>
                        )}

                        {agents.map(agent => (
                            <div
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedAgent?.id === agent.id
                                    ? 'bg-indigo-500/20 border-indigo-500/50'
                                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-200">{agent.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {agent.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                    <span>{agent.ip}</span>
                                    <span>ID: {agent.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Details */}
                <div className="lg:col-span-2 flex flex-col">
                    {!selectedAgent ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <Server className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select an agent to inspect details</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                        {selectedAgent.name}
                                        <span className={`w-3 h-3 rounded-full ${selectedAgent.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                                            }`} />
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">{selectedAgent.os.platform} - {selectedAgent.os.name} ({selectedAgent.version})</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveTab('health')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'health' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Health
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('alerts')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'alerts' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Alerts
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('actions')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'actions' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Actions
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {activeTab === 'health' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                <span className="text-slate-400 text-sm block mb-1">IP Address</span>
                                                <span className="text-slate-200 font-mono">{selectedAgent.ip}</span>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                <span className="text-slate-400 text-sm block mb-1">Agent ID</span>
                                                <span className="text-slate-200 font-mono">{selectedAgent.id}</span>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                <span className="text-slate-400 text-sm block mb-1">Last Keepalive</span>
                                                <span className="text-slate-200 font-mono flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-emerald-400" />
                                                    {selectedAgent.lastKeepAlive}
                                                </span>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                <span className="text-slate-400 text-sm block mb-1">Wazuh Version</span>
                                                <span className="text-slate-200 font-mono">{selectedAgent.version}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'alerts' && (
                                    <div className="space-y-3">
                                        {loadingAlerts ? (
                                            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
                                        ) : alerts.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500">No recent alerts found for this agent</div>
                                        ) : (
                                            alerts.map(alert => (
                                                <div key={alert.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${alert.rule.level >= 12 ? 'bg-red-500/20 text-red-400' :
                                                                alert.rule.level >= 7 ? 'bg-orange-500/20 text-orange-400' :
                                                                    'bg-blue-500/20 text-blue-400'
                                                                }`}>
                                                                L{alert.rule.level}
                                                            </span>
                                                            <span className="font-medium text-slate-200">{alert.rule.description}</span>
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded truncate">
                                                        {alert.fullLog}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === 'actions' && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-800/30 p-4 rounded-lg border border-dashed border-slate-700">
                                            <h4 className="text-slate-200 font-medium mb-2 flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-purple-400" /> Administrative Actions
                                            </h4>
                                            <p className="text-slate-400 text-sm mb-4">
                                                Perform remote actions on the agent. Note that the agent must be ACTIVE to receive commands.
                                            </p>

                                            <div className="flex gap-4">
                                                <Button
                                                    onClick={handleRestartAgent}
                                                    loading={actionLoading}
                                                    variant="danger" // Assuming custom variant or I'll style it manually if needed
                                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                                                >
                                                    <Power className="w-4 h-4 mr-2" />
                                                    Restart Agent
                                                </Button>

                                                <Button
                                                    onClick={handleTriggerScan}
                                                    loading={actionLoading}
                                                    className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                >
                                                    <Activity className="w-4 h-4 mr-2" />
                                                    Trigger Full Scan
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
