import React from 'react';
import { Shield, Server, Activity, ExternalLink } from 'lucide-react';
import { Modal, ModalHeader, ModalContent } from '@/components/ui/Modal';

interface AgentInfo {
    id: string;
    name: string;
    ip: string;
    count: number;
    lastSeen: string;
}

interface TechniqueDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    technique: {
        id: string;
        name: string;
        description?: string;
        url?: string;
    };
    stats: {
        count: number;
        agents: AgentInfo[];
    };
}

export function TechniqueDetailModal({ isOpen, onClose, technique, stats }: TechniqueDetailModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalHeader onClose={onClose}>
                <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {technique.id}
                    </span>
                    <h2 className="text-xl font-bold text-slate-100">{technique.name}</h2>
                    {technique.url && (
                        <a
                            href={technique.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-blue-400"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </ModalHeader>
            <ModalContent>
                <div className="space-y-6">
                    {technique.description && (
                        <div className="p-3 bg-slate-800/30 rounded-lg text-sm text-slate-400">
                            {technique.description}
                        </div>
                    )}

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Total Detections
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.count}</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Server className="w-4 h-4" /> Affected Agents
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.agents.length}</div>
                        </div>
                    </div>

                    {/* Affected Agents List */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            Affected Agents
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {stats.agents.length > 0 ? (
                                stats.agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                                                <Server className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{agent.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{agent.ip}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-red-400">{agent.count} hits</div>
                                            <div className="text-xs text-slate-500">
                                                Last: {new Date(agent.lastSeen).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                    No agents affected by this technique yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ModalContent>
        </Modal>
    );
}
