"use client";

import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import SystemDiagnostics from '../../components/SystemDiagnostics';
import { Wifi, Search, CheckCircle, XCircle, Loader2, Terminal, Download, Plus, Network, Activity } from 'lucide-react';

interface ScanResult {
    ip: string;
    status: 'online' | 'offline' | 'error';
    latency: number | null;
    service?: string;
}

export default function ToolsPage() {
    const [scanSubnet, setScanSubnet] = useState('192.168.1.0/24');
    const [pingTargets, setPingTargets] = useState('192.168.1.1, 192.168.1.206');
    const [scanning, setScanning] = useState(false);
    const [pinging, setPinging] = useState(false);
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const [pingResults, setPingResults] = useState<ScanResult[]>([]);

    const handleScan = async () => {
        setScanning(true);
        setScanResults([]);
        try {
            const res = await fetch('/api/network', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'scan', subnet: scanSubnet })
            });
            const data = await res.json();
            if (data.success) {
                setScanResults(data.results || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setScanning(false);
        }
    };

    const handlePing = async () => {
        setPinging(true);
        setPingResults([]);
        try {
            const targets = pingTargets.split(',').map(ip => ip.trim()).filter(Boolean);
            const res = await fetch('/api/network', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ping', targets })
            });
            const data = await res.json();
            if (data.success) {
                setPingResults(data.results || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setPinging(false);
        }
    };

    const generateInstallScript = (ip: string) => {
        const managerIP = '192.168.1.206';
        return `#!/bin/bash
# Wazuh Agent Installation Script for ${ip}
# Run as root on the target machine

WAZUH_MANAGER="${managerIP}"
AGENT_NAME="${ip.replace(/\./g, '-')}"

# Download and install Wazuh agent
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee -a /etc/apt/sources.list.d/wazuh.list
apt-get update
WAZUH_MANAGER="$WAZUH_MANAGER" WAZUH_AGENT_NAME="$AGENT_NAME" apt-get install -y wazuh-agent

# Enable and start
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

echo "Wazuh agent installed. Check status: systemctl status wazuh-agent"`;
    };

    const downloadScript = (ip: string) => {
        const script = generateInstallScript(ip);
        const blob = new Blob([script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `install-wazuh-agent-${ip.replace(/\./g, '-')}.sh`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Network className="w-6 h-6 text-emerald-400" />
                        Network Tools
                    </h2>
                    <p className="text-slate-400">Scan network and install Wazuh agents on discovered hosts</p>
                </div>

                {/* System Diagnostics */}
                <SystemDiagnostics />

                {/* Ping Tool */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> Ping Hosts
                    </h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={pingTargets}
                            onChange={(e) => setPingTargets(e.target.value)}
                            placeholder="192.168.1.1, 192.168.1.206"
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handlePing}
                            disabled={pinging}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {pinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                            Ping
                        </button>
                    </div>
                    {pingResults.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {pingResults.map((r, i) => (
                                <div key={i} className={`p-3 rounded-lg border ${r.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {r.status === 'online' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                                        <span className="font-mono text-sm">{r.ip}</span>
                                    </div>
                                    {r.latency && <span className="text-xs text-slate-400">{r.latency}ms</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Network Scan */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                        <Search className="w-5 h-5" /> Network Scan
                    </h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={scanSubnet}
                            onChange={(e) => setScanSubnet(e.target.value)}
                            placeholder="192.168.1.0/24"
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={handleScan}
                            disabled={scanning}
                            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Scan
                        </button>
                    </div>
                    {scanning && (
                        <div className="text-center py-8 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            Scanning network... This may take a moment.
                        </div>
                    )}
                    {scanResults.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm text-slate-400 mb-3">Found {scanResults.length} online hosts:</h4>
                            <div className="space-y-2">
                                {scanResults.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            <span className="font-mono">{r.ip}</span>
                                            {r.latency && <span className="text-xs text-slate-500">{r.latency}ms</span>}
                                        </div>
                                        <button
                                            onClick={() => downloadScript(r.ip)}
                                            className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Install Script
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Agent Installation Guide */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                        <Terminal className="w-5 h-5" /> Quick Install Command
                    </h3>
                    <p className="text-sm text-slate-400">Run this on any Linux machine to install and connect Wazuh agent to the SOC Manager:</p>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto">
                        <code>curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh && sudo WAZUH_MANAGER='192.168.1.206' bash wazuh-install.sh</code>
                    </div>
                    <div className="text-xs text-slate-500">
                        After installation, the agent will be visible in the SOC Dashboard within 1-2 minutes.
                    </div>
                </section>

            </main>
        </div>
    );
}
