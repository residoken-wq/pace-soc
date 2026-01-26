"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { MitreHeatmap, TechniqueDetection, MitreHeatmapProps } from '@/components/charts/MitreHeatmap';
import { Shield, ExternalLink, Filter, RotateCw, Loader2 } from 'lucide-react';
import { MITRE_TACTICS } from '@/lib/rules';
import { TechniqueDetailModal } from '@/components/mitre/TechniqueDetailModal';

export default function MitrePage() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Data states
    const [mitreData, setMitreData] = useState<{
        tactics: string[];
        techniques: Record<string, any[]>;
        details: Record<string, any>;
    } | null>(null);

    const [stats, setStats] = useState<{
        detections: TechniqueDetection[];
        map: Map<string, TechniqueDetection>;
    }>({ detections: [], map: new Map() });

    // UI states
    const [showFullMatrix, setShowFullMatrix] = useState(false);
    const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (forceRefresh = false) => {
        if (forceRefresh) setUpdating(true);
        else setLoading(true);

        try {
            // 1. Fetch MITRE definitions
            const mitreRes = await fetch(`/api/mitre/data${forceRefresh ? '?refresh=true' : ''}`);
            const mitreJson = await mitreRes.json();

            // 2. Fetch Stats
            const statsRes = await fetch('/api/mitre/stats');
            const statsJson = await statsRes.json(); // Array of { techniqueId, count, agents }

            if (mitreJson.tactics) {
                setMitreData(mitreJson);
            }

            if (Array.isArray(statsJson)) {
                setStats({
                    detections: statsJson,
                    map: new Map(statsJson.map((d: any) => [d.techniqueId, d]))
                });
            }

        } catch (error) {
            console.error('Failed to load MITRE data:', error);
        } finally {
            setLoading(false);
            setUpdating(false);
        }
    };

    const handleTechniqueClick = (id: string) => {
        setSelectedTechniqueId(id);
    };

    const handleCloseModal = () => {
        setSelectedTechniqueId(null);
    };

    // Calculate summary stats
    const totalDetections = stats.detections.reduce((acc, d) => acc + d.count, 0);
    const coveredTechniques = stats.detections.length;
    // Count unique techniques with hits
    const coveredTactics = new Set(
        stats.detections.map(d => {
            if (!mitreData) return '';
            const tacticsOfTech = Object.entries(mitreData.techniques).filter(([, techs]) =>
                techs.some(t => t.id === d.techniqueId)
            ).map(([tactic]) => tactic);
            return tacticsOfTech[0] || '';
        })
    ).size;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-[1700px] mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <Shield className="w-6 h-6 text-emerald-400" />
                            MITRE ATT&CK Navigator
                        </h2>
                        <p className="text-slate-400">Technique coverage based on SOC rules and detected alerts</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter Toggle */}
                        <div className="bg-slate-800 rounded-lg p-1 flex border border-slate-700">
                            <button
                                onClick={() => setShowFullMatrix(false)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${!showFullMatrix ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Active Only
                            </button>
                            <button
                                onClick={() => setShowFullMatrix(true)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${showFullMatrix ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Full Matrix
                            </button>
                        </div>

                        <div className="w-px h-8 bg-slate-800 mx-2"></div>

                        <button
                            onClick={() => loadData(true)}
                            disabled={updating || loading}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <RotateCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                            {updating ? 'Updating...' : 'Update Definitions'}
                        </button>
                        <a
                            href="https://attack.mitre.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm flex items-center gap-2"
                        >
                            View MITRE <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        label="Tactics Covered"
                        value={`${coveredTactics} / ${mitreData?.tactics?.length || 12}`}
                        color="emerald"
                    />
                    <StatCard
                        label="Techniques Detected"
                        value={coveredTechniques}
                        color="blue"
                    />
                    <StatCard
                        label="Total Detections"
                        value={totalDetections}
                        color="yellow"
                    />
                    <StatCard
                        label="High Activity"
                        value={stats.detections.filter(d => d.count >= 6).length}
                        color="red"
                    />
                </div>

                {/* MITRE Heatmap */}
                {loading && !mitreData ? (
                    <div className="flex items-center justify-center p-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <MitreHeatmap
                        detections={stats.detections}
                        tactics={mitreData?.tactics}
                        techniques={mitreData?.techniques}
                        onTechniqueClick={handleTechniqueClick}
                        filterEmpty={!showFullMatrix}
                        className="min-h-[500px]"
                    />
                )}

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

            {/* Detail Modal */}
            {selectedTechniqueId && mitreData && (
                <TechniqueDetailModal
                    isOpen={!!selectedTechniqueId}
                    onClose={handleCloseModal}
                    technique={{
                        id: selectedTechniqueId,
                        name: mitreData.details[selectedTechniqueId]?.name || selectedTechniqueId,
                        description: mitreData.details[selectedTechniqueId]?.description,
                        url: mitreData.details[selectedTechniqueId]?.url
                    }}
                    stats={{
                        count: stats.map.get(selectedTechniqueId)?.count || 0,
                        agents: stats.map.get(selectedTechniqueId)?.agents || []
                    }}
                />
            )}
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
