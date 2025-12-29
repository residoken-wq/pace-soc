import React from 'react';
import { Shield, Activity, Server, FileText, CheckCircle, ExternalLink, Terminal } from 'lucide-react';
import Navbar from '../components/Navbar';
import RealTimeCharts from '../components/RealTimeCharts';
import AgentsList from '../components/AgentsList';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Real-time Charts */}
        <RealTimeCharts />

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            title="Wazuh Agent"
            status="Active"
            icon={<Shield className="w-6 h-6 text-white" />}
            color="emerald"
            details="Security Monitoring & FIM"
            link="#"
          />
          <StatusCard
            title="Promtail"
            status="Active"
            icon={<FileText className="w-6 h-6 text-white" />}
            color="blue"
            details="Log Shipping to Loki"
            link="#"
          />
          <StatusCard
            title="Node Exporter"
            status="Active"
            icon={<Activity className="w-6 h-6 text-white" />}
            color="purple"
            details="System Metrics Exporter"
            link="http://localhost:9100/metrics"
          />
        </div>

        {/* Managed Agents */}
        <AgentsList />

        {/* Quick Actions / Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terminal / Logs Preview */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-200">Agent Logs (Preview)</h3>
              </div>
              <span className="text-xs text-slate-500">Live Stream via Loki</span>
            </div>
            <div className="p-6 font-mono text-sm text-slate-400 space-y-2 h-64 overflow-y-auto custom-scrollbar">
              <div className="flex gap-3">
                <span className="text-slate-600">[10:00:01]</span>
                <span className="text-emerald-400">INFO</span>
                <span>Wazuh agent started successfully. Connected to manager.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-600">[10:00:02]</span>
                <span className="text-blue-400">DEBUG</span>
                <span>Promtail: tailing /var/ossec/logs/alerts/alerts.json</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-600">[10:00:05]</span>
                <span className="text-emerald-400">INFO</span>
                <span>Node Exporter listening on :9100</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-600">[10:05:00]</span>
                <span className="text-yellow-400">WARN</span>
                <span>Filesystem watch limit high (Simulated).</span>
              </div>
              {/* Simulated Logs */}
            </div>
          </div>

          {/* Configuration Info */}
          <div className="space-y-6">
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-slate-400" />
                Agent Configuration
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">Manager IP</span>
                  <span className="text-emerald-400 font-mono">192.168.1.206</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">Loki Endpoint</span>
                  <span className="text-blue-400 font-mono">http://...:3100</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">Agent Name</span>
                  <span className="text-purple-400 font-mono">soc-agent-container</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-4 items-start">
              <CheckCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-400 text-sm">System Healthy</h4>
                <p className="text-blue-300/80 text-sm mt-1">
                  All agents are reporting correctly. No critical errors detected in the last 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusCard({ title, status, icon, color, details, link }: any) {
  const colorClasses: any = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}/10 border ${colorClasses[color]}/20`}>
          {icon}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded text-xs font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          {status}
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{details}</p>

      <a href={link} className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors gap-1 group-hover:gap-2">
        View Details <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}
