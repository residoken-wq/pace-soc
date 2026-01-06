
"use client";

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, HardDrive, Wifi, Cpu } from 'lucide-react';

export default function RealTimeCharts({ agentName = "SOC Manager (Local)", agentIp }: { agentName?: string; agentIp?: string }) {
    const [data, setData] = useState<any[]>([]);
    const [currentMetrics, setCurrentMetrics] = useState({ cpu: 0, ram: 0, disk: 0, network: 0 });
    const [prevCpu, setPrevCpu] = useState<any>(null);
    const [prevNetwork, setPrevNetwork] = useState<any>(null);

    // Reset data when agent changes
    useEffect(() => {
        setData([]);
        setPrevCpu(null);
        setPrevNetwork(null);
        setCurrentMetrics({ cpu: 0, ram: 0, disk: 0, network: 0 });
    }, [agentIp]);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const url = agentIp ? `/api/metrics?agentIp=${agentIp}` : '/api/metrics';
                const res = await fetch(url);
                const metrics = await res.json();

                if (metrics.error && !metrics.cpu) return;

                // Calculate CPU % based on delta
                let cpuPercent = 0;
                if (prevCpu && metrics.cpu) {
                    const deltaTotal = metrics.cpu.total - prevCpu.total;
                    const deltaIdle = metrics.cpu.idle - prevCpu.idle;
                    // prevent divide by zero
                    if (deltaTotal > 0) {
                        cpuPercent = ((deltaTotal - deltaIdle) / deltaTotal) * 100;
                    }
                }

                // Calculate Network Speed (KB/s) based on delta
                let networkSpeed = 0;
                if (prevNetwork && metrics.network) {
                    const deltaBytes = metrics.network.total - prevNetwork.total;
                    if (deltaBytes >= 0) {
                        networkSpeed = deltaBytes / 1024 / 2; // KB per second (interval is 2s)
                    }
                }

                // Fallback for simulation if no real data change (demo mode)
                if (cpuPercent === 0 && (!metrics.cpu || metrics.cpu.total === 0)) cpuPercent = Math.random() * 20 + 5;
                if (networkSpeed === 0 && (!metrics.network || metrics.network.total === 0)) networkSpeed = Math.random() * 50 + 10;

                // Disk percent
                const diskPercent = metrics.disk ? metrics.disk.percent : (Math.random() * 5 + 40); // Demo fallback

                // Update Previous
                setPrevCpu(metrics.cpu);
                setPrevNetwork(metrics.network);

                // Format current time
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

                const newDataPoint = {
                    name: timeStr,
                    cpu: Math.max(0, Math.min(100, Math.round(cpuPercent))),
                    ram: metrics.ram ? metrics.ram.percent : 0,
                    disk: Math.round(diskPercent),
                    network: Math.round(networkSpeed)
                };

                // Update Current Display
                setCurrentMetrics({
                    cpu: newDataPoint.cpu,
                    ram: newDataPoint.ram,
                    disk: newDataPoint.disk,
                    network: newDataPoint.network
                });

                // Update Chart History (Keep last 20 points)
                setData(prevData => {
                    const newData = [...prevData, newDataPoint];
                    return newData.slice(-20);
                });

            } catch (e) {
                console.error("Polling error", e);
            }
        };

        fetchMetrics(); // Initial fetch
        const interval = setInterval(fetchMetrics, 2000);

        return () => clearInterval(interval);
    }, [prevCpu, prevNetwork, agentIp]);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                {agentName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* CPU Chart */}
                <ChartCard title="CPU Usage" value={`${currentMetrics.cpu}%`} icon={<Cpu className="w-5 h-5 text-emerald-400" />} color="emerald">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#64748b" hide />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} width={30} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                            <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* RAM Chart */}
                <ChartCard title="Memory Usage" value={`${currentMetrics.ram}%`} icon={<Activity className="w-5 h-5 text-purple-400" />} color="purple">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#64748b" hide />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} width={30} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                            <Area type="monotone" dataKey="ram" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRam)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Disk Chart */}
                <ChartCard title="Disk Usage" value={`${currentMetrics.disk}%`} icon={<HardDrive className="w-5 h-5 text-blue-400" />} color="blue">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#64748b" hide />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} width={30} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                            <Area type="monotone" dataKey="disk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDisk)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Network Chart */}
                <ChartCard title="Network (KB/s)" value={`${currentMetrics.network}`} icon={<Wifi className="w-5 h-5 text-orange-400" />} color="orange">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#64748b" hide />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} width={30} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                            <Area type="monotone" dataKey="network" stroke="#f97316" fillOpacity={1} fill="url(#colorNet)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}

function ChartCard({ title, value, color, icon, children }: any) {
    const colorClasses: any = {
        emerald: "text-emerald-400",
        purple: "text-purple-400",
        blue: "text-blue-400",
        orange: "text-orange-400"
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-64 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="font-semibold text-slate-200 text-sm">{title}</h3>
                </div>
                <span className={`text-xl font-bold font-mono ${colorClasses[color]}`}>{value}</span>
            </div>
            <div className="flex-1 w-full min-h-0">
                {children}
            </div>
        </div>
    )
}
