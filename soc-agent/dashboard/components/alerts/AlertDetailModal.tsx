"use client";

import React, { useState } from 'react';
import { X, Clock, Server, MapPin, FileText, Shield, Brain, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { Alert, getAlertSeverity, SEVERITY_COLORS } from '@/lib/types/alert';
import { getTimeAgo } from '@/lib/types/common';
import { clsx } from 'clsx';

interface AlertDetailModalProps {
    alert: Alert | null;
    onClose: () => void;
}

type TabType = 'overview' | 'fulllog' | 'analysis';

export function AlertDetailModal({ alert, onClose }: AlertDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    if (!alert) return null;

    const severity = getAlertSeverity(alert.rule.level);
    const colors = SEVERITY_COLORS[severity];

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'alert',
                    data: {
                        rule: alert.rule,
                        agent: alert.agent,
                        location: alert.location,
                        fullLog: alert.fullLog,
                        mitre: alert.mitre,
                    }
                })
            });
            const data = await res.json();
            setAnalysis(data.analysis || data.error || 'Không thể phân tích');
        } catch (e: any) {
            setAnalysis('Lỗi: ' + e.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const tabs = [
        { id: 'overview' as TabType, label: 'Tổng quan' },
        { id: 'fulllog' as TabType, label: 'Full Log' },
        { id: 'analysis' as TabType, label: 'AI Analysis' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className={clsx('p-4 border-b border-slate-700', colors.bg)}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={clsx('px-2 py-0.5 rounded text-xs font-bold uppercase', colors.bg, colors.border, colors.text, 'border')}>
                                    {severity}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">Level {alert.rule.level}</span>
                            </div>
                            <h2 className={clsx('text-lg font-bold', colors.text)}>
                                {alert.rule.description || `Rule ${alert.rule.id}`}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'px-4 py-3 text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                                    : 'text-slate-400 hover:text-slate-200'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <InfoCard icon={<Clock className="w-4 h-4" />} label="Thời gian" value={new Date(alert.timestamp).toLocaleString('vi-VN')} subValue={getTimeAgo(alert.timestamp)} />
                                <InfoCard icon={<Server className="w-4 h-4" />} label="Agent" value={alert.agent.name} subValue={alert.agent.ip || '-'} />
                                <InfoCard icon={<Shield className="w-4 h-4" />} label="Rule ID" value={alert.rule.id} subValue={alert.rule.groups?.join(', ') || '-'} />
                                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Location" value={alert.location || '-'} />
                            </div>

                            {/* MITRE ATT&CK */}
                            {alert.mitre && (alert.mitre.tactic || alert.mitre.technique) && (
                                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                                    <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> MITRE ATT&CK
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {alert.mitre.tactic && (
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                                Tactic: {alert.mitre.tactic}
                                            </span>
                                        )}
                                        {alert.mitre.technique && (
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                                Technique: {alert.mitre.technique}
                                            </span>
                                        )}
                                        {alert.mitre.techniqueId && (
                                            <a
                                                href={`https://attack.mitre.org/techniques/${alert.mitre.techniqueId.replace('.', '/')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs flex items-center gap-1 hover:bg-blue-500/30"
                                            >
                                                {alert.mitre.techniqueId} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Rule Groups */}
                            {alert.rule.groups && alert.rule.groups.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-slate-400 mb-2">Rule Groups</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {alert.rule.groups.map((g, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded text-xs">
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'fulllog' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-slate-400">Raw Log</h4>
                                <button
                                    onClick={() => handleCopy(alert.fullLog || '')}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                                {alert.fullLog || 'No full log available'}
                            </pre>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="space-y-4">
                            {!analysis && !analyzing && (
                                <div className="text-center py-8">
                                    <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                    <p className="text-slate-400 mb-4">Sử dụng AI để phân tích alert này</p>
                                    <button
                                        onClick={handleAnalyze}
                                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Phân tích với AI
                                    </button>
                                </div>
                            )}
                            {analyzing && (
                                <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang phân tích...
                                </div>
                            )}
                            {analysis && (
                                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <pre className="whitespace-pre-wrap text-sm text-slate-300">{analysis}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue?: string }) {
    return (
        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                {icon} {label}
            </div>
            <div className="text-slate-200 font-medium truncate">{value}</div>
            {subValue && <div className="text-slate-500 text-xs truncate">{subValue}</div>}
        </div>
    );
}
