
"use client";

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export default function RealTimeCharts() {
  const [data, setData] = useState<any[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({ cpu: 0, ram: 0 });
  const [prevCpu, setPrevCpu] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
        try {
            const res = await fetch('/api/metrics');
            const metrics = await res.json();
            
            if (metrics.error) return;

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

            // Update Previous
            setPrevCpu(metrics.cpu);

            // Format current time
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

            const newDataPoint = {
                name: timeStr,
                cpu: Math.max(0, Math.min(100, Math.round(cpuPercent))),
                ram: metrics.ram.percent
            };

            // Update Current Display
            setCurrentMetrics({ 
                cpu: newDataPoint.cpu,
                ram: newDataPoint.ram 
            });

            // Update Chart History (Keep last 20 points)
            setData(prevData => {
                const newData = [...prevData, newDataPoint];
                return newData.slice(-20);
            });

        } catch (e) {
            console.error("Polling error", e);
        }
    }, 2000);

    return () => clearInterval(interval);
  }, [prevCpu]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CPU Chart */}
        <ChartCard title="CPU Usage" value={`${currentMetrics.cpu}%`} color="emerald">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" contentStyle={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                        itemStyle={{ color: '#10b981' }} 
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" />
                </AreaChart>
             </ResponsiveContainer>
        </ChartCard>

        {/* RAM Chart */}
        <ChartCard title="Memory Usage" value={`${currentMetrics.ram}%`} color="purple">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                        itemStyle={{ color: '#8b5cf6' }} 
                    />
                    <Area type="monotone" dataKey="ram" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRam)" />
                </AreaChart>
             </ResponsiveContainer>
        </ChartCard>
    </div>
  );
}

function ChartCard({ title, value, color, children }: any) {
    const colorClasses: any = {
        emerald: "text-emerald-400",
        purple: "text-purple-400"
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-80 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${colorClasses[color]}`} />
                    <h3 className="font-semibold text-slate-200">{title}</h3>
                </div>
                <span className={`text-2xl font-bold font-mono ${colorClasses[color]}`}>{value}</span>
            </div>
            <div className="flex-1 w-full min-h-0">
                {children}
            </div>
        </div>
    )
}
