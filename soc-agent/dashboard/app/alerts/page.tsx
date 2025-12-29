
import React from 'react';
import Navbar from '../../components/Navbar';
import { AlertTriangle, CheckCircle, ShieldAlert, Filter } from 'lucide-react';

export default function AlertsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">Security Alerts</h2>
                        <p className="text-slate-400">Real-time security events and system warnings.</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 flex items-center gap-2 transition-colors">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>

                {/* Alerts List */}
                <div className="space-y-4">
                    <AlertItem
                        severity="critical"
                        title="SSH Authentication Failure (Multiple)"
                        source="Wazuh Agent"
                        time="2 mins ago"
                        description="Multiple failed login attempts detected from IP 192.168.1.50."
                    />
                    <AlertItem
                        severity="warning"
                        title="High CPU Usage"
                        source="Node Exporter"
                        time="15 mins ago"
                        description="System CPU usage exceeded 85% for 5 minutes."
                    />
                    <AlertItem
                        severity="info"
                        title="Package Updated"
                        source="Wazuh FIM"
                        time="1 hour ago"
                        description="Package 'curl' was updated via apt-get."
                    />
                    <AlertItem
                        severity="success"
                        title="System Backup Completed"
                        source="Cron Job"
                        time="2 hours ago"
                        description="Daily system snapshot created successfully."
                    />
                </div>

            </main>
        </div>
    );
}

function AlertItem({ severity, title, source, time, description }: any) {
    const styles: any = {
        critical: { border: "border-red-500/50", bg: "bg-red-500/5", icon: <ShieldAlert className="w-6 h-6 text-red-500" />, text: "text-red-400" },
        warning: { border: "border-yellow-500/50", bg: "bg-yellow-500/5", icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />, text: "text-yellow-400" },
        info: { border: "border-blue-500/50", bg: "bg-blue-500/5", icon: <AlertTriangle className="w-6 h-6 text-blue-500" />, text: "text-blue-400" },
        success: { border: "border-emerald-500/50", bg: "bg-emerald-500/5", icon: <CheckCircle className="w-6 h-6 text-emerald-500" />, text: "text-emerald-400" }
    };

    const s = styles[severity] || styles.info;

    return (
        <div className={`p-5 rounded-xl border ${s.border} ${s.bg} flex gap-5 items-start transition-all hover:bg-slate-900`}>
            <div className="shrink-0 mt-1">
                {s.icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-bold ${s.text}`}>{title}</h4>
                    <span className="text-xs text-slate-500 font-mono">{time}</span>
                </div>
                <p className="text-slate-300 text-sm">{description}</p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Source: {source}</span>
                </div>
            </div>
        </div>
    )
}
