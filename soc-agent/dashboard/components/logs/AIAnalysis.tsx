"use client";

import React, { useState } from 'react';
import { Brain, Loader2, X, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LogEntry } from './LogTable';

export interface AnalysisResult {
    summary: string;
    insights: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIAnalysisProps {
    logs: LogEntry[];
    className?: string;
}

export function AIAnalysis({ logs, className }: AIAnalysisProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setResult(null);

        // Simulate AI analysis - in production would call actual AI endpoint
        await new Promise(resolve => setTimeout(resolve, 1500));

        const errorCount = logs.filter(l => l.level === 'error').length;
        const warnCount = logs.filter(l => l.level === 'warn').length;

        const insights: string[] = [];
        const recommendations: string[] = [];

        // Analyze patterns
        const authLogs = logs.filter(l => l.source === 'auth' || l.message.toLowerCase().includes('auth'));
        if (authLogs.filter(l => l.level === 'error').length > 3) {
            insights.push(`Detected ${authLogs.filter(l => l.level === 'error').length} authentication failures - possible brute force attempt`);
            recommendations.push('Review failed login attempts and consider implementing rate limiting');
        }

        const sshLogs = logs.filter(l => l.message.toLowerCase().includes('ssh'));
        if (sshLogs.length > 0) {
            insights.push(`Found ${sshLogs.length} SSH-related log entries`);
            if (sshLogs.some(l => l.level === 'error')) {
                recommendations.push('Investigate SSH connection failures and verify authorized keys');
            }
        }

        if (errorCount > 10) {
            insights.push(`High error rate detected: ${errorCount} errors in analyzed period`);
            recommendations.push('Review system health and check for service degradation');
        }

        if (insights.length === 0) {
            insights.push('No significant anomalies detected in the analyzed logs');
        }
        if (recommendations.length === 0) {
            recommendations.push('Continue monitoring - no immediate action required');
        }

        const riskLevel = errorCount > 10 ? 'high' : errorCount > 5 ? 'medium' : 'low';

        setResult({
            summary: `Analyzed ${logs.length} logs. Found ${errorCount} errors and ${warnCount} warnings.`,
            insights,
            recommendations,
            riskLevel,
        });

        setLoading(false);
    };

    const riskColors = {
        low: 'text-emerald-400 bg-emerald-500/10',
        medium: 'text-yellow-400 bg-yellow-500/10',
        high: 'text-orange-400 bg-orange-500/10',
        critical: 'text-red-400 bg-red-500/10',
    };

    return (
        <>
            <Button
                onClick={() => { setIsOpen(true); handleAnalyze(); }}
                variant="secondary"
                className={className}
            >
                <Brain className="w-4 h-4" />
                AI Analysis
            </Button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
                <ModalHeader onClose={() => setIsOpen(false)}>
                    <Brain className="w-6 h-6 text-purple-400" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-100">AI Log Analysis</h3>
                        <p className="text-xs text-slate-500">Powered by pattern recognition</p>
                    </div>
                </ModalHeader>

                <ModalContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                            <p className="text-slate-400">Analyzing {logs.length} log entries...</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-200">Analysis Summary</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[result.riskLevel]}`}>
                                        {result.riskLevel.toUpperCase()} RISK
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm">{result.summary}</p>
                            </div>

                            {/* Insights */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                    Key Insights
                                </h4>
                                <ul className="space-y-2">
                                    {result.insights.map((insight, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                                            {insight}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommendations */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                                    Recommendations
                                </h4>
                                <ul className="space-y-2">
                                    {result.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : null}
                </ModalContent>

                <ModalFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
                    <Button onClick={handleAnalyze} loading={loading}>Re-analyze</Button>
                </ModalFooter>
            </Modal>
        </>
    );
}
