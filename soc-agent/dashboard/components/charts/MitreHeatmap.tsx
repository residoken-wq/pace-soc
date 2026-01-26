"use client";

import React from 'react';
import { clsx } from 'clsx';
import { Shield, ExternalLink } from 'lucide-react';

// MITRE ATT&CK Tactics in order
const MITRE_TACTICS = [
    'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
    'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
    'Collection', 'Command and Control', 'Exfiltration', 'Impact'
];

// Sample techniques per tactic (simplified)
const TACTICS_TECHNIQUES: Record<string, { id: string; name: string }[]> = {
    'Initial Access': [
        { id: 'T1078', name: 'Valid Accounts' },
        { id: 'T1190', name: 'Exploit Public-Facing Application' },
        { id: 'T1566', name: 'Phishing' },
    ],
    'Execution': [
        { id: 'T1059', name: 'Command and Scripting Interpreter' },
        { id: 'T1204', name: 'User Execution' },
    ],
    'Persistence': [
        { id: 'T1136', name: 'Create Account' },
        { id: 'T1053', name: 'Scheduled Task/Job' },
    ],
    'Privilege Escalation': [
        { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
        { id: 'T1548', name: 'Abuse Elevation Control Mechanism' },
    ],
    'Defense Evasion': [
        { id: 'T1070', name: 'Indicator Removal' },
        { id: 'T1036', name: 'Masquerading' },
    ],
    'Credential Access': [
        { id: 'T1110', name: 'Brute Force' },
        { id: 'T1003', name: 'OS Credential Dumping' },
    ],
    'Discovery': [
        { id: 'T1046', name: 'Network Service Discovery' },
        { id: 'T1082', name: 'System Information Discovery' },
    ],
    'Lateral Movement': [
        { id: 'T1021', name: 'Remote Services' },
    ],
    'Collection': [
        { id: 'T1005', name: 'Data from Local System' },
    ],
    'Command and Control': [
        { id: 'T1071', name: 'Application Layer Protocol' },
        { id: 'T1571', name: 'Non-Standard Port' },
    ],
    'Exfiltration': [
        { id: 'T1041', name: 'Exfiltration Over C2 Channel' },
    ],
    'Impact': [
        { id: 'T1486', name: 'Data Encrypted for Impact' },
    ],
};

export interface TechniqueDetection {
    techniqueId: string;
    count: number;
    agents?: any[];
}

export interface MitreHeatmapProps {
    detections?: TechniqueDetection[];
    tactics?: string[];
    techniques?: Record<string, { id: string; name: string }[]>;
    onTechniqueClick?: (techniqueId: string) => void;
    filterEmpty?: boolean;
    className?: string;
}

export function MitreHeatmap({
    detections = [],
    tactics = MITRE_TACTICS,
    techniques = TACTICS_TECHNIQUES,
    onTechniqueClick,
    filterEmpty = false,
    className
}: MitreHeatmapProps) {
    const detectionMap = new Map(detections.map(d => [d.techniqueId, d.count]));

    const getHeatColor = (count: number) => {
        if (count === 0) return 'bg-slate-800/50 border-slate-700';
        if (count <= 2) return 'bg-yellow-500/20 border-yellow-500/40';
        if (count <= 5) return 'bg-orange-500/30 border-orange-500/50';
        return 'bg-red-500/40 border-red-500/60';
    };

    // Filter tactics if filterEmpty is true
    const visibleTactics = tactics.filter(tactic => {
        if (!filterEmpty) return true;
        const tacticTechniques = techniques[tactic] || [];
        // Only show tactic if it has at least one technique with detections
        return tacticTechniques.some(tech => (detectionMap.get(tech.id) || 0) > 0);
    });

    return (
        <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl p-6', className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold text-slate-200">MITRE ATT&CK Coverage</h3>
                </div>
                <div className="flex items-center gap-4">
                    {/* Legend */}
                    <div className="hidden md:flex gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-800 border border-slate-700" /> No hits</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500/20 border border-yellow-500/40" /> Low</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500/30 border border-orange-500/50" /> Med</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500/40 border border-red-500/60" /> High</span>
                    </div>
                    <a
                        href="https://attack.mitre.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                        View Full Matrix <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {visibleTactics.map((tactic) => {
                        let tacticTechniques = techniques[tactic] || [];

                        // Filter techniques if filterEmpty is true
                        if (filterEmpty) {
                            tacticTechniques = tacticTechniques.filter(tech => (detectionMap.get(tech.id) || 0) > 0);
                        }

                        return (
                            <div key={tactic} className="flex-1 min-w-[140px]">
                                <div className="text-[10px] text-slate-400 font-medium mb-2 truncate px-1" title={tactic}>
                                    {tactic}
                                </div>
                                <div className="space-y-1">
                                    {tacticTechniques.map((tech) => {
                                        const count = detectionMap.get(tech.id) || 0;
                                        return (
                                            <button
                                                key={tech.id}
                                                onClick={() => onTechniqueClick && onTechniqueClick(tech.id)}
                                                className={clsx(
                                                    'w-full text-left block p-2 rounded border text-[10px] transition-colors hover:ring-1 hover:ring-emerald-500/50',
                                                    getHeatColor(count)
                                                )}
                                                title={`${tech.name} (${count} detections)`}
                                            >
                                                <div className="font-mono text-slate-300">{tech.id}</div>
                                                <div className="truncate text-[9px] text-slate-500 mb-0.5" title={tech.name}>{tech.name}</div>
                                                {count > 0 && (
                                                    <div className="text-slate-400 font-medium">{count} hits</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {visibleTactics.length === 0 && (
                        <div className="w-full py-12 text-center text-slate-500 text-sm">
                            No active techniques found using current filter.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
