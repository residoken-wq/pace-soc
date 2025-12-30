"use client";

import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import { FileDown, FileText, Calendar, Filter, Loader2, CheckCircle, AlertTriangle, Shield, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
    const [generating, setGenerating] = useState(false);
    const [reportType, setReportType] = useState<'alerts' | 'agents' | 'rules' | 'summary'>('summary');
    const [dateRange, setDateRange] = useState('7d');
    const [format, setFormat] = useState<'csv' | 'json'>('csv');
    const [generated, setGenerated] = useState(false);

    const generateReport = async () => {
        setGenerating(true);
        setGenerated(false);

        try {
            // Fetch data based on report type
            let data: any[] = [];
            let filename = '';

            if (reportType === 'alerts') {
                const res = await fetch('/api/wazuh/alerts?limit=500');
                const json = await res.json();
                data = json.alerts || [];
                filename = `soc-alerts-report-${new Date().toISOString().split('T')[0]}`;
            } else if (reportType === 'agents') {
                const res = await fetch('/api/wazuh/agents');
                const json = await res.json();
                data = json.agents || [];
                filename = `soc-agents-report-${new Date().toISOString().split('T')[0]}`;
            } else if (reportType === 'rules') {
                const res = await fetch('/api/rules');
                const json = await res.json();
                data = json.rules || [];
                filename = `soc-rules-report-${new Date().toISOString().split('T')[0]}`;
            } else {
                // Summary report
                const [alertsRes, agentsRes, rulesRes] = await Promise.all([
                    fetch('/api/wazuh/alerts?limit=100'),
                    fetch('/api/wazuh/agents'),
                    fetch('/api/rules')
                ]);
                const alerts = await alertsRes.json();
                const agents = await agentsRes.json();
                const rules = await rulesRes.json();

                data = [{
                    generatedAt: new Date().toISOString(),
                    dateRange,
                    totalAgents: agents.agents?.length || 0,
                    activeAgents: agents.agents?.filter((a: any) => a.status === 'active').length || 0,
                    totalAlerts: alerts.alerts?.length || 0,
                    criticalAlerts: alerts.alerts?.filter((a: any) => a.rule?.level >= 12).length || 0,
                    warningAlerts: alerts.alerts?.filter((a: any) => a.rule?.level >= 7 && a.rule?.level < 12).length || 0,
                    totalRules: rules.rules?.length || 0,
                    enabledRules: rules.rules?.filter((r: any) => r.enabled).length || 0
                }];
                filename = `soc-summary-report-${new Date().toISOString().split('T')[0]}`;
            }

            // Generate file content
            let content: string;
            let mimeType: string;

            if (format === 'csv') {
                if (data.length === 0) {
                    content = 'No data available';
                } else {
                    const headers = Object.keys(data[0]);
                    const rows = data.map(row =>
                        headers.map(h => {
                            const val = row[h];
                            if (typeof val === 'object') return JSON.stringify(val);
                            return `"${String(val).replace(/"/g, '""')}"`;
                        }).join(',')
                    );
                    content = [headers.join(','), ...rows].join('\n');
                }
                mimeType = 'text/csv';
                filename += '.csv';
            } else {
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                filename += '.json';
            }

            // Download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            setGenerated(true);
            setTimeout(() => setGenerated(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-emerald-400" />
                        Reports & Export
                    </h2>
                    <p className="text-slate-400">Generate and download security reports</p>
                </div>

                {/* Report Configuration */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-slate-200">Report Configuration</h3>

                    {/* Report Type */}
                    <div className="space-y-3">
                        <label className="text-sm text-slate-400">Report Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <ReportTypeCard
                                icon={<Shield className="w-5 h-5" />}
                                label="Summary"
                                description="Overview statistics"
                                selected={reportType === 'summary'}
                                onClick={() => setReportType('summary')}
                            />
                            <ReportTypeCard
                                icon={<AlertTriangle className="w-5 h-5" />}
                                label="Alerts"
                                description="Security alerts"
                                selected={reportType === 'alerts'}
                                onClick={() => setReportType('alerts')}
                            />
                            <ReportTypeCard
                                icon={<CheckCircle className="w-5 h-5" />}
                                label="Agents"
                                description="Agent status"
                                selected={reportType === 'agents'}
                                onClick={() => setReportType('agents')}
                            />
                            <ReportTypeCard
                                icon={<FileText className="w-5 h-5" />}
                                label="Rules"
                                description="SOC rules"
                                selected={reportType === 'rules'}
                                onClick={() => setReportType('rules')}
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Date Range
                            </label>
                            <select
                                value={dateRange}
                                onChange={e => setDateRange(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                            >
                                <option value="1d">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400 flex items-center gap-2">
                                <FileDown className="w-4 h-4" /> Export Format
                            </label>
                            <select
                                value={format}
                                onChange={e => setFormat(e.target.value as 'csv' | 'json')}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                            >
                                <option value="csv">CSV (Excel compatible)</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        {generated && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                <CheckCircle className="w-4 h-4" /> Report downloaded successfully
                            </div>
                        )}
                        {!generated && <div />}
                        <button
                            onClick={generateReport}
                            disabled={generating}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {generating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                            ) : (
                                <><FileDown className="w-4 h-4" /> Generate Report</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Quick Reports */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Quick Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <QuickReportButton
                            label="Daily Summary"
                            onClick={() => { setReportType('summary'); setDateRange('1d'); setTimeout(generateReport, 100); }}
                        />
                        <QuickReportButton
                            label="Weekly Alerts"
                            onClick={() => { setReportType('alerts'); setDateRange('7d'); setTimeout(generateReport, 100); }}
                        />
                        <QuickReportButton
                            label="All Agents Status"
                            onClick={() => { setReportType('agents'); setDateRange('all'); setTimeout(generateReport, 100); }}
                        />
                    </div>
                </div>

            </main>
        </div>
    );
}

function ReportTypeCard({ icon, label, description, selected, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl border text-left transition-all ${selected
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
        >
            <div className="mb-2">{icon}</div>
            <div className="font-medium">{label}</div>
            <div className="text-xs text-slate-500">{description}</div>
        </button>
    );
}

function QuickReportButton({ label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors text-left"
        >
            <FileDown className="w-4 h-4 text-slate-400 mb-2" />
            <div className="text-sm font-medium text-slate-200">{label}</div>
        </button>
    );
}
