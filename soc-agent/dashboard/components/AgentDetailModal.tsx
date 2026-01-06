"use client";

import React, { useEffect, useState } from 'react';
import { X, Server, Activity, HardDrive, Cpu, Wifi, Shield, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface AgentDetailProps {
    agentId: string;
    agentName: string;
    onClose: () => void;
}

interface AgentMetrics {
    cpu: number;
    memory: number;
    storage: number;
}

interface AgentInfo {
    id: string;
    name: string;
    ip: string;
    status: string;
    os: string;
    version: string;
    lastKeepAlive: string;
    group: string[];
}

export default function AgentDetailModal({ agentId, agentName, onClose }: AgentDetailProps) {
    const [agent, setAgent] = useState<AgentInfo | null>(null);
    const [metrics, setMetrics] = useState<AgentMetrics>({ cpu: 0, memory: 0, storage: 0 });
    const [loading, setLoading] = useState(true);
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

    useEffect(() => {
        const fetchAgentDetails = async () => {
            setLoading(true);
            try {
                // Fetch agent info
                const agentRes = await fetch(`/api/wazuh/agents?agentId=${agentId}`);
                const agentData = await agentRes.json();
                if (agentData.agent) {
                    setAgent(agentData.agent);
                }

                // Fetch metrics
                const metricsRes = await fetch(`/api/wazuh/syscollector?agentId=${agentId}`);
                const metricsData = await metricsRes.json();
                if (metricsData.metrics) {
                    setMetrics(metricsData.metrics);
                }

                // Fetch recent alerts for this agent
                const alertsRes = await fetch(`/api/wazuh/alerts?limit=10&agentId=${agentId}`);
                const alertsData = await alertsRes.json();
                setRecentAlerts(alertsData.alerts?.slice(0, 5) || []);

            } catch (e) {
                console.error('Failed to fetch agent details:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchAgentDetails();
    }, [agentId]);

    const getSeverityColor = (level: number) => {
        if (level >= 12) return 'text-red-400';
        if (level >= 7) return 'text-yellow-400';
        return 'text-blue-400';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Server className="w-6 h-6 text-emerald-400" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-100">{agentName}</h3>
                            <p className="text-xs text-slate-500">Agent ID: {agentId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Agent Info */}
                            {agent && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <InfoCard label="IP Address" value={agent.ip} />
                                    <InfoCard label="Status" value={agent.status} status={agent.status} />
                                    <InfoCard label="OS" value={agent.os || 'Unknown'} />
                                    <InfoCard label="Version" value={agent.version || 'Unknown'} />
                                </div>
                            )}

                            {/* Real-time Metrics */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400" /> Real-time Metrics
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <MetricCard
                                        icon={<Cpu className="w-5 h-5 text-emerald-400" />}
                                        label="CPU Usage"
                                        value={`${metrics.cpu}%`}
                                        color="emerald"
                                        percent={metrics.cpu}
                                    />
                                    <MetricCard
                                        icon={<Activity className="w-5 h-5 text-purple-400" />}
                                        label="Memory"
                                        value={`${metrics.memory}%`}
                                        color="purple"
                                        percent={metrics.memory}
                                    />
                                    <MetricCard
                                        icon={<HardDrive className="w-5 h-5 text-blue-400" />}
                                        label="Storage"
                                        value={`${metrics.storage}%`}
                                        color="blue"
                                        percent={metrics.storage}
                                    />
                                </div>
                            </div>

                            {/* Recent Alerts */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Recent Alerts
                                </h4>
                                {recentAlerts.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 bg-slate-800/30 rounded-lg border border-slate-800">
                                        No recent alerts for this agent
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentAlerts.map((alert, idx) => (
                                            <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className={`font-medium text-sm ${getSeverityColor(alert.rule?.level || 0)}`}>
                                                        {alert.rule?.description || 'Unknown Alert'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Rule {alert.rule?.id} | Level {alert.rule?.level}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ label, value, status }: { label: string; value: string; status?: string }) {
    const statusColor = status === 'active' ? 'text-emerald-400' : status === 'disconnected' ? 'text-red-400' : 'text-slate-300';

    return (
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`font-medium text-sm ${status ? statusColor : 'text-slate-200'}`}>{value}</div>
        </div>
    );
}

function MetricCard({ icon, label, value, color, percent }: any) {
    const colors: any = {
        emerald: 'bg-emerald-500',
        purple: 'bg-purple-500',
        blue: 'bg-blue-500'
    };

    return (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="text-xl font-bold text-slate-100 mb-2">{value}</div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors[color]} transition-all duration-500`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    );
}
