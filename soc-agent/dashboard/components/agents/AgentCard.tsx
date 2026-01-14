"use client";

import React from 'react';
import { clsx } from 'clsx';
import { Cpu, Activity, HardDrive } from 'lucide-react';
import { Agent, AgentMetrics } from '@/lib/types/agent';

export interface AgentCardProps {
    agent: Agent;
    metrics?: AgentMetrics;
    isSelected?: boolean;
    onClick?: () => void;
    className?: string;
}

export function AgentCard({ agent, metrics, isSelected, onClick, className }: AgentCardProps) {
    const isActive = agent.status === 'active';
    const { cpu = 0, memory = 0, storage = 0 } = metrics || {};

    return (
        <div
            onClick={onClick}
            className={clsx(
                'p-4 rounded-xl border transition-all cursor-pointer group',
                isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30'
                    : isActive
                        ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                        : 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10',
                className
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={clsx(
                    'w-2 h-2 rounded-full',
                    isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                )} />
                <span className="text-xs text-slate-500 font-mono">{agent.ip}</span>
            </div>
            <div className="text-sm font-medium text-slate-200 break-words mb-2">{agent.name}</div>
            {isActive ? (
                <div className="flex gap-2 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-400" title="CPU">
                        <Cpu className="w-3 h-3" /> {cpu}%
                    </span>
                    <span className="flex items-center gap-1 text-purple-400" title="Memory">
                        <Activity className="w-3 h-3" /> {memory}%
                    </span>
                    <span className="flex items-center gap-1 text-blue-400" title="Storage">
                        <HardDrive className="w-3 h-3" /> {storage}%
                    </span>
                </div>
            ) : (
                <div className="text-xs text-red-400">Offline</div>
            )}
        </div>
    );
}

// Compact agent row for lists
export interface AgentRowProps {
    agent: Agent;
    metrics?: AgentMetrics;
    onClick?: () => void;
}

export function AgentRow({ agent, metrics, onClick }: AgentRowProps) {
    const isActive = agent.status === 'active';

    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer transition-colors"
        >
            <div className="flex items-center gap-3">
                <span className={clsx(
                    'w-2 h-2 rounded-full',
                    isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                )} />
                <div>
                    <div className="text-sm font-medium text-slate-200">{agent.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{agent.ip}</div>
                </div>
            </div>
            {metrics && isActive && (
                <div className="flex gap-4 text-xs">
                    <span className="text-emerald-400">CPU {metrics.cpu}%</span>
                    <span className="text-purple-400">RAM {metrics.memory}%</span>
                </div>
            )}
        </div>
    );
}
