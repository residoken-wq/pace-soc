"use client";

import React from 'react';
import Navbar from '../../components/Navbar';
import { TrafficMonitor } from '../../components/threats/TrafficMonitor';
import { WebAnalysisTool } from '../../components/tools/WebAnalysisTool'; // Linking existing tool for cohesion
import { ShieldAlert, Globe, Activity } from 'lucide-react';

export default function ThreatsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                        Advanced Threat Detection
                    </h2>
                    <p className="text-slate-400">Real-time monitoring of L3/L4/L7 attacks and Web Exploits.</p>
                </div>

                {/* DDoS & Traffic Monitor (Top Priority) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3">
                        <TrafficMonitor />
                    </div>
                </div>

                {/* Attack Surface & Deep Analysis */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Web Attack Surface Analysis
                    </h3>
                    <WebAnalysisTool />
                </div>
            </main>
        </div>
    );
}
