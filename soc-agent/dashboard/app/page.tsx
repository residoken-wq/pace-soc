import React from 'react';
import { Shield, Activity, Server, FileText, CheckCircle, ExternalLink, Terminal, Users, AlertTriangle, Bell, Cpu, HardDrive } from 'lucide-react';
import Navbar from '../components/Navbar';
import RealTimeCharts from '../components/RealTimeCharts';
import AgentsList from '../components/AgentsList';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Agents"
            value="10"
            icon={<Users className="w-5 h-5" />}
            color="emerald"
            trend="+2 this week"
          />
          <SummaryCard
            label="Active"
            value="8"
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <SummaryCard
            label="Disconnected"
            value="2"
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
          <SummaryCard
            label="Alerts (24h)"
            value="156"
            icon={<Bell className="w-5 h-5" />}
            color="yellow"
            trend="12 critical"
          />
        </div>

        {/* Real-time Charts */}
        <RealTimeCharts />

        {/* Agent Status Grid - Compact View for 10 Agents */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Agent Status Overview
            </h2>
            <span className="text-xs text-slate-500">Auto-refresh: 30s</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <AgentStatusTile name="soc-main" ip="192.168.1.206" status="active" cpu={45} memory={62} />
            <AgentStatusTile name="web-srv-01" ip="192.168.1.100" status="active" cpu={23} memory={48} />
            <AgentStatusTile name="web-srv-02" ip="192.168.1.101" status="active" cpu={67} memory={71} />
            <AgentStatusTile name="db-primary" ip="192.168.1.110" status="active" cpu={34} memory={85} />
            <AgentStatusTile name="db-replica" ip="192.168.1.111" status="disconnected" cpu={0} memory={0} />
            <AgentStatusTile name="app-srv-01" ip="192.168.1.120" status="active" cpu={56} memory={59} />
            <AgentStatusTile name="app-srv-02" ip="192.168.1.121" status="active" cpu={41} memory={52} />
            <AgentStatusTile name="cache-srv" ip="192.168.1.130" status="active" cpu={12} memory={34} />
            <AgentStatusTile name="backup-srv" ip="192.168.1.140" status="disconnected" cpu={0} memory={0} />
            <AgentStatusTile name="monitor-srv" ip="192.168.1.150" status="active" cpu={28} memory={44} />
          </div>
        </div>

        {/* Managed Agents Table */}
        <AgentsList />

        {/* Alert Severity Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AlertSeverityCard level="Critical" count={12} color="red" percentage={8} />
          <AlertSeverityCard level="Warning" count={47} color="yellow" percentage={30} />
          <AlertSeverityCard level="Info" count={97} color="blue" percentage={62} />
        </div>

        {/* Quick Actions / Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terminal / Logs Preview */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-200">Recent Alerts</h3>
              </div>
              <span className="text-xs text-slate-500">Live Stream</span>
            </div>
            <div className="p-6 font-mono text-sm text-slate-400 space-y-2 h-48 overflow-y-auto custom-scrollbar">
              <LogLine time="18:52:01" level="CRITICAL" message="SSH brute force detected from 45.33.32.156" />
              <LogLine time="18:51:45" level="WARNING" message="High CPU usage on db-primary (92%)" />
              <LogLine time="18:50:22" level="INFO" message="File integrity check passed on web-srv-01" />
              <LogLine time="18:49:10" level="WARNING" message="Failed login attempt on app-srv-02" />
              <LogLine time="18:48:33" level="INFO" message="Agent backup-srv disconnected (scheduled maintenance)" />
            </div>
          </div>

          {/* Configuration Info */}
          <div className="space-y-4">
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-slate-400" />
                SOC Manager Configuration
              </h3>
              <div className="space-y-3 text-sm">
                <ConfigRow label="Wazuh Manager" value="192.168.1.206:55000" />
                <ConfigRow label="Loki Endpoint" value="192.168.1.206:3100" />
                <ConfigRow label="Prometheus" value="192.168.1.206:9090" />
                <ConfigRow label="Dashboard Version" value="v2.0.0" />
              </div>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-4 items-start">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-400 text-sm">System Operational</h4>
                <p className="text-emerald-300/80 text-sm mt-1">
                  8 of 10 agents reporting. 2 in scheduled maintenance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value, icon, color, trend }: any) {
  const colors: any = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    green: "from-green-500/20 to-green-500/5 border-green-500/30 text-green-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400",
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} border backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={colors[color].split(' ').pop()}>{icon}</span>
      </div>
      <div className="text-3xl font-bold text-slate-100">{value}</div>
      {trend && <div className="text-xs text-slate-500 mt-1">{trend}</div>}
    </div>
  );
}

// Agent Status Tile Component
function AgentStatusTile({ name, ip, status, cpu, memory }: any) {
  const isActive = status === 'active';

  return (
    <div className={`p-4 rounded-xl border ${isActive ? 'bg-slate-800/50 border-slate-700' : 'bg-red-500/5 border-red-500/30'} hover:bg-slate-800 transition-all cursor-pointer group`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></span>
        <span className="text-xs text-slate-500 font-mono">{ip}</span>
      </div>
      <div className="text-sm font-medium text-slate-200 truncate mb-2">{name}</div>
      {isActive ? (
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-400">
            <Cpu className="w-3 h-3" /> {cpu}%
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <HardDrive className="w-3 h-3" /> {memory}%
          </span>
        </div>
      ) : (
        <div className="text-xs text-red-400">Offline</div>
      )}
    </div>
  );
}

// Alert Severity Card
function AlertSeverityCard({ level, count, color, percentage }: any) {
  const colors: any = {
    red: { bg: "bg-red-500", bar: "bg-red-500/30", text: "text-red-400" },
    yellow: { bg: "bg-yellow-500", bar: "bg-yellow-500/30", text: "text-yellow-400" },
    blue: { bg: "bg-blue-500", bar: "bg-blue-500/30", text: "text-blue-400" },
  };
  const c = colors[color];

  return (
    <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-medium ${c.text}`}>{level}</span>
        <span className="text-2xl font-bold text-slate-100">{count}</span>
      </div>
      <div className={`h-2 rounded-full ${c.bar}`}>
        <div className={`h-full rounded-full ${c.bg}`} style={{ width: `${percentage}%` }}></div>
      </div>
      <div className="text-xs text-slate-500 mt-2">{percentage}% of total alerts</div>
    </div>
  );
}

// Log Line Component
function LogLine({ time, level, message }: any) {
  const levelColors: any = {
    CRITICAL: "text-red-400",
    WARNING: "text-yellow-400",
    INFO: "text-blue-400",
    DEBUG: "text-slate-500"
  };

  return (
    <div className="flex gap-3">
      <span className="text-slate-600">[{time}]</span>
      <span className={levelColors[level]}>{level}</span>
      <span className="text-slate-300">{message}</span>
    </div>
  );
}

// Config Row Component
function ConfigRow({ label, value }: any) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-800/50">
      <span className="text-slate-400">{label}</span>
      <span className="text-emerald-400 font-mono text-xs">{value}</span>
    </div>
  );
}
