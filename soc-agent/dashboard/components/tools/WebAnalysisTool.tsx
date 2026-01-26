"use client";

import React, { useState } from 'react';
import { Search, Loader2, Shield, Eye, Lock, Globe, AlertTriangle, CheckCircle, FileText, Server } from 'lucide-react';

interface AnalysisReport {
    general: {
        status: number;
        url: string;
        duration: string;
        size: number;
        ip?: string;
    };
    headers: Record<string, { status: string; message: string; details?: string; score?: number }>;
    cookies: { status: string; message: string; score?: number }[];
    tech: { status: string; message: string; details?: string }[];
    robots: { status: string; message: string; details?: string[] } | null;
    content?: { status: string; message: string; details?: string }[];
    ssl?: { status: string; message: string; details?: string };
}

export function WebAnalysisTool() {
    const [url, setUrl] = useState('');
    const [isDeepScan, setIsDeepScan] = useState(false);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<AnalysisReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        if (!url) return;
        setLoading(true);
        setReport(null);
        setError(null);

        try {
            const res = await fetch('/api/tools/web-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, scanType: isDeepScan ? 'deep' : 'quick' })
            });
            const data = await res.json();

            if (data.success) {
                setReport(data.report);
            } else {
                setError(data.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-100">Web Application Analysis</h3>
                    <p className="text-sm text-slate-400">Scan websites for security headers, CMS info, and vulnerabilities.</p>
                </div>
            </div>

            {/* Input Section */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter URL (e.g. http://192.168.1.100)"
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 select-none">
                        <input
                            type="checkbox"
                            checked={isDeepScan}
                            onChange={(e) => setIsDeepScan(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                        />
                        <span>Deep Scan (Slow)</span>
                    </label>
                    <button
                        onClick={handleScan}
                        disabled={loading || !url}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        {loading ? 'Scanning...' : 'Analyze'}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            )}

            {/* Results Grid */}
            {report && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* General Info */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <ResultMetric label="Status" value={report.general.status} icon={<Activity />} color={report.general.status === 200 ? 'text-emerald-400' : 'text-yellow-400'} />
                        <ResultMetric label="Host IP" value={report.general.ip || 'N/A'} icon={<Globe />} color="text-slate-300" />
                        <ResultMetric label="Response" value={report.general.duration} icon={<Loader2 />} color="text-blue-400" />
                        <ResultMetric label="Size" value={`${(report.general.size / 1024).toFixed(2)} KB`} icon={<FileText />} color="text-slate-400" />
                        <ResultMetric label="Tech Stack" value={report.tech.length + ' detected'} icon={<Server />} color="text-purple-400" />
                    </div>

                    {/* Deep Scan Results */}
                    {(report.content || report.ssl) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {report.ssl && (
                                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                                    <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-emerald-400" /> SSL/TLS Protocol
                                    </h4>
                                    <ResultItem label="HTTPS Status" status={report.ssl.status} message={report.ssl.message} />
                                    {report.ssl.details && <p className="text-xs text-slate-400 mt-2 ml-1">{report.ssl.details}</p>}
                                </div>
                            )}
                            {report.content && (
                                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                                    <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <Search className="w-5 h-5 text-orange-400" /> Content Discovery
                                    </h4>
                                    {report.content.length > 0 ? (
                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                            {report.content.map((c, i) => (
                                                <ResultItem key={i} label="Exposed Path" status={c.status} message={c.message} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 italic">No sensitive paths found in dictionary scan.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Security Headers */}
                        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                            <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-emerald-400" /> Security Headers
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(report.headers).map(([key, res]) => (
                                    <ResultItem key={key} label={key} status={res.status} message={res.message} />
                                ))}
                            </div>
                        </div>

                        {/* Tech & Cookies */}
                        <div className="space-y-6">
                            {/* Tech Stack */}
                            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                                <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <Server className="w-5 h-5 text-purple-400" /> Technology Stack
                                </h4>
                                <div className="space-y-2">
                                    {report.tech.length > 0 ? (
                                        report.tech.map((t, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700/50 p-2 rounded">
                                                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                                {t.message}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-slate-500 italic">No specific technologies detected.</div>
                                    )}
                                </div>
                            </div>

                            {/* Cookies */}
                            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                                <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-orange-400" /> Cookies & Storage
                                </h4>
                                {report.cookies.length > 0 ? (
                                    <div className="space-y-2">
                                        {report.cookies.map((c, i) => (
                                            <ResultItem key={i} label={`Cookie ${i + 1}`} status={c.status} message={c.message} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 italic">No cookies found.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Robots.txt */}
                    {report.robots && (
                        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                            <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-blue-400" /> Robots.txt Analysis
                            </h4>
                            <div className="text-sm text-slate-300 mb-2">{report.robots.message}</div>
                            {report.robots.details && (
                                <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-slate-400 max-h-32 overflow-y-auto">
                                    {report.robots.details.map((l, i) => <div key={i}>{l}</div>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ResultMetric({ label, value, icon, color }: any) {
    return (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className={`flex items-center gap-2 ${color} mb-1`}>
                {React.cloneElement(icon, { className: "w-4 h-4" })}
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
        </div>
    );
}

function Activity() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>; }

function ResultItem({ label, status, message }: { label: string, status: string, message: string }) {
    const getIcon = () => {
        if (status === 'pass') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
        if (status === 'fail') return <AlertTriangle className="w-4 h-4 text-red-400" />;
        if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
    };

    const getBg = () => {
        if (status === 'pass') return 'bg-emerald-500/5 border-emerald-500/20';
        if (status === 'fail') return 'bg-red-500/5 border-red-500/20';
        if (status === 'warning') return 'bg-yellow-500/5 border-yellow-500/20';
        return 'bg-blue-500/5 border-blue-500/20';
    };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${getBg()}`}>
            <div className="mt-0.5 shrink-0">{getIcon()}</div>
            <div>
                <div className="text-xs font-bold uppercase text-slate-400 mb-0.5">{label}</div>
                <div className="text-sm text-slate-200">{message}</div>
            </div>
        </div>
    );
}
