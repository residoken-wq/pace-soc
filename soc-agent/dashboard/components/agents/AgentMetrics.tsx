"use client";

import React from 'react';
import { Cpu, Activity, HardDrive, Wifi } from 'lucide-react';
import { AgentMetrics } from '@/lib/types/agent';
import { MetricProgress } from '@/components/ui/ProgressBar';

export interface AgentMetricsDisplayProps {
    metrics: AgentMetrics;
    showNetwork?: boolean;
    className?: string;
}

export function AgentMetricsDisplay({ metrics, showNetwork = false, className }: AgentMetricsDisplayProps) {
    return (
        <div className={className}>
            <div className="grid grid-cols-3 gap-4">
                <MetricProgress
                    label="CPU Usage"
                    value={metrics.cpu}
                    icon={<Cpu className="w-5 h-5 text-emerald-400" />}
                    variant="emerald"
                />
                <MetricProgress
                    label="Memory"
                    value={metrics.memory}
                    icon={<Activity className="w-5 h-5 text-purple-400" />}
                    variant="purple"
                />
                <MetricProgress
                    label="Storage"
                    value={metrics.storage}
                    icon={<HardDrive className="w-5 h-5 text-blue-400" />}
                    variant="blue"
                />
            </div>
            {showNetwork && metrics.network !== undefined && (
                <div className="mt-4">
                    <MetricProgress
                        label="Network (KB/s)"
                        value={metrics.network}
                        unit=""
                        icon={<Wifi className="w-5 h-5 text-orange-400" />}
                        variant="orange"
                    />
                </div>
            )}
        </div>
    );
}

// Mini metrics inline display
export function AgentMetricsInline({ metrics }: { metrics: AgentMetrics }) {
    return (
        <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
                <Cpu className="w-3 h-3" /> {metrics.cpu}%
            </span>
            <span className="flex items-center gap-1 text-purple-400">
                <Activity className="w-3 h-3" /> {metrics.memory}%
            </span>
            <span className="flex items-center gap-1 text-blue-400">
                <HardDrive className="w-3 h-3" /> {metrics.storage}%
            </span>
        </div>
    );
}
