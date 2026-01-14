"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import { MitreHeatmap } from '@/components/charts/MitreHeatmap';
import { Shield, ExternalLink, Filter, Search } from 'lucide-react';
import { MITRE_TACTICS } from '@/lib/rules';

// Sample detection data - in production would come from API
const SAMPLE_DETECTIONS = [
    { techniqueId: 'T1110', count: 8 },  // Brute Force
    { techniqueId: 'T1078', count: 3 },  // Valid Accounts
    { techniqueId: 'T1059', count: 5 },  // Command and Scripting
    { techniqueId: 'T1071', count: 12 }, // Application Layer Protocol
    { techniqueId: 'T1046', count: 4 },  // Network Service Discovery
    { techniqueId: 'T1136', count: 2 },  // Create Account
];

export default function MitrePage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <Shield className="w-6 h-6 text-emerald-400" />
                            MITRE ATT&CK Navigator
                        </h2>
                        <p className="text-slate-400">Technique coverage based on SOC rules and detected alerts</p>
                    </div>
                    <a
                        href="https://attack.mitre.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2"
                    >
                        View MITRE ATT&CK <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        label="Tactics Covered"
                        value={`${new Set(SAMPLE_DETECTIONS.map(_ => 'X')).size} / 12`}
                        color="emerald"
                    />
                    <StatCard
                        label="Techniques Detected"
                        value={SAMPLE_DETECTIONS.length}
                        color="blue"
                    />
                    <StatCard
                        label="Total Detections"
                        value={SAMPLE_DETECTIONS.reduce((sum, d) => sum + d.count, 0)}
                        color="yellow"
                    />
                    <StatCard
                        label="High Activity"
                        value={SAMPLE_DETECTIONS.filter(d => d.count >= 6).length}
                        color="red"
                    />
                </div>

                {/* MITRE Heatmap */}
                <MitreHeatmap detections={SAMPLE_DETECTIONS} />

                {/* Tactics Reference */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        Tactics Reference
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {MITRE_TACTICS.map((tactic, idx) => (
                            <a
                                key={tactic}
                                href={`https://attack.mitre.org/tactics/TA00${(idx + 1).toString().padStart(2, '0')}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-emerald-500/50 transition-colors group"
                            >
                                <div className="text-xs text-slate-500 mb-1">TA00{(idx + 1).toString().padStart(2, '0')}</div>
                                <div className="text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
                                    {tactic}
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        red: 'bg-red-500/10 border-red-500/30 text-red-400',
    };

    return (
        <div className={`p-4 rounded-xl border ${colors[color]}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
        </div>
    );
}
