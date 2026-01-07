"use client";

import React, { useEffect, useState } from 'react';
import { Shield, Activity, Server, FileText, CheckCircle, ExternalLink, Terminal, Users, AlertTriangle, Bell, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import RealTimeCharts from '../components/RealTimeCharts';
import AgentsList from '../components/AgentsList';

interface Agent {
  id: string;
  name: string;
  ip: string;
  status: string;
  os: string;
}

interface Alert {
  id: string;
  timestamp: string;
  rule: { id: string; level: number; description: string };
  agent: { name: string };
}

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  disconnectedAgents: number;
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<Record<string, { cpu: number; memory: number; storage: number }>>({});
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0, activeAgents: 0, disconnectedAgents: 0,
    totalAlerts: 0, criticalAlerts: 0, warningAlerts: 0, infoAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; name: string; ip: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, alertsRes, metricsRes] = await Promise.all([
        fetch('/api/wazuh/agents'),
        fetch('/api/wazuh/alerts?limit=50'),
        fetch('/api/wazuh/syscollector')
      ]);
      const agentsData = await agentsRes.json();
      const alertsData = await alertsRes.json();
      const metricsData = await metricsRes.json();

      const agentsList = agentsData.agents || [];
      const alertsList = alertsData.alerts || [];

      setAgents(agentsList);
      setAlerts(alertsList);

      // Store metrics by agent ID
      const metricsMap: Record<string, { cpu: number; memory: number; storage: number }> = {};
      if (metricsData.metrics) {
        metricsData.metrics.forEach((m: any) => {
          metricsMap[m.agentId] = { cpu: m.cpu || 0, memory: m.memory || 0, storage: m.storage || 0 };
        });
      }
      setMetrics(metricsMap);

      // Calculate stats
      const active = agentsList.filter((a: Agent) => a.status === 'active').length;
      const disconnected = agentsList.filter((a: Agent) => a.status === 'disconnected' || a.status === 'never_connected').length;
      const critical = alertsList.filter((a: Alert) => a.rule.level >= 12).length;
      const warning = alertsList.filter((a: Alert) => a.rule.level >= 7 && a.rule.level < 12).length;
      const info = alertsList.filter((a: Alert) => a.rule.level < 7).length;

      setStats({
        totalAgents: agentsList.length,
        activeAgents: active,
        disconnectedAgents: disconnected,
        totalAlerts: alertsList.length,
        criticalAlerts: critical,
        warningAlerts: warning,
        infoAlerts: info
      });

      setError(agentsData.success === false ? agentsData.error : null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const totalAlertsNonZero = stats.totalAlerts || 1; // Prevent division by zero

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">SOC Dashboard</h1>
            <p className="text-slate-400 text-sm">Real-time security monitoring</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-3 bg-yellow-500/10 text-yellow-400 text-sm rounded-lg border border-yellow-500/20">
            ⚠️ Using fallback data: {error}
          </div>
        )}

        {/* Summary Stats Row - Live Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Agents"
            value={stats.totalAgents}
            icon={<Users className="w-5 h-5" />}
            color="emerald"
          />
          <SummaryCard
            label="Active"
            value={stats.activeAgents}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <SummaryCard
            label="Disconnected"
            value={stats.disconnectedAgents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
          <SummaryCard
            label="Alerts (Recent)"
            value={stats.totalAlerts}
            icon={<Bell className="w-5 h-5" />}
            color="yellow"
            trend={`${stats.criticalAlerts} critical`}
          />
        </div>

        {/* Real-time Charts */}
        <RealTimeCharts
          agentName={selectedAgent ? selectedAgent.name : "SOC Manager (Local)"}
          agentIp={selectedAgent ? selectedAgent.ip : undefined}
          agentId={selectedAgent ? selectedAgent.id : undefined}
        />

        {/* Agent Status Grid - Live Data */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Agent Status Overview
            </h2>
            <span className="text-xs text-slate-500">Auto-refresh: 30s</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {agents.slice(0, 10).map(agent => {
              const agentMetrics = metrics[agent.id] || { cpu: 0, memory: 0, storage: 0 };
              const isSelected = selectedAgent?.ip === agent.ip;
              return (
                <AgentStatusTile
                  key={agent.id}
                  name={agent.name}
                  ip={agent.ip}
                  status={agent.status}
                  cpu={agentMetrics.cpu}
                  memory={agentMetrics.memory}
                  storage={agentMetrics.storage}
                  isSelected={isSelected}
                  onClick={() => setSelectedAgent(isSelected ? null : { id: agent.id, name: agent.name, ip: agent.ip })}
                />
              );
            })}
            {agents.length === 0 && (
              <div className="col-span-5 text-center py-8 text-slate-500">
                No agents found
              </div>
            )}
          </div>
        </div>

        {/* Managed Agents Table */}
        <AgentsList />

        {/* Alert Severity Summary - Live Data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AlertSeverityCard
            level="Critical"
            count={stats.criticalAlerts}
            color="red"
            percentage={Math.round((stats.criticalAlerts / totalAlertsNonZero) * 100)}
          />
          <AlertSeverityCard
            level="Warning"
            count={stats.warningAlerts}
            color="yellow"
            percentage={Math.round((stats.warningAlerts / totalAlertsNonZero) * 100)}
          />
          <AlertSeverityCard
            level="Info"
            count={stats.infoAlerts}
            color="blue"
            percentage={Math.round((stats.infoAlerts / totalAlertsNonZero) * 100)}
          />
        </div>

        {/* Quick Actions / Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terminal / Logs Preview - Live Data */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-200">Recent Alerts</h3>
              </div>
              <span className="text-xs text-slate-500">Live Stream</span>
            </div>
            <div className="p-6 font-mono text-sm text-slate-400 space-y-2 h-48 overflow-y-auto custom-scrollbar">
              {alerts.slice(0, 5).map(alert => (
                <LogLine
                  key={alert.id}
                  time={getTimeAgo(alert.timestamp)}
                  level={alert.rule.level >= 12 ? 'CRITICAL' : alert.rule.level >= 7 ? 'WARNING' : 'INFO'}
                  message={alert.rule.description || `Rule ${alert.rule.id}`}
                />
              ))}
              {alerts.length === 0 && (
                <div className="text-slate-500 text-center py-4">No recent alerts</div>
              )}
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
                <ConfigRow label="Dashboard Version" value="v2.1.0" />
              </div>
            </div>

            <div className={`p-4 ${stats.disconnectedAgents > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} border rounded-xl flex gap-4 items-start`}>
              {stats.disconnectedAgents > 0 ? (
                <>
                  <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-400 text-sm">Agents Offline</h4>
                    <p className="text-yellow-300/80 text-sm mt-1">
                      {stats.activeAgents} of {stats.totalAgents} agents reporting. {stats.disconnectedAgents} disconnected.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-400 text-sm">System Operational</h4>
                    <p className="text-emerald-300/80 text-sm mt-1">
                      All {stats.totalAgents} agents reporting normally.
                    </p>
                  </div>
                </>
              )}
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
function AgentStatusTile({ name, ip, status, cpu, memory, storage, isSelected, onClick }: any) {
  const isActive = status === 'active';

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer group
        ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30' :
          isActive ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' :
            'bg-red-500/5 border-red-500/30 hover:bg-red-500/10'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></span>
        <span className="text-xs text-slate-500 font-mono">{ip}</span>
      </div>
      <div className="text-sm font-medium text-slate-200 break-words mb-2">{name}</div>
      {isActive ? (
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="flex items-center gap-1 text-emerald-400" title="CPU">
            <Cpu className="w-3 h-3" /> {cpu}%
          </span>
          <span className="flex items-center gap-1 text-purple-400" title="Memory (RAM)">
            <Activity className="w-3 h-3" /> {memory}%
          </span>
          <span className="flex items-center gap-1 text-blue-400" title="Storage">
            <HardDrive className="w-3 h-3" /> {storage}%
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
      <span className="text-slate-300 truncate">{message}</span>
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
