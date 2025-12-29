
import React from 'react';
import Navbar from '../../components/Navbar';
import { Save, Bell, Server, Cpu, HardDrive } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Configuration</h2>
                    <p className="text-slate-400">Manage agent settings and alert thresholds.</p>
                </div>

                {/* Alert Thresholds */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                        <Bell className="w-5 h-5" /> Alert Thresholds
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-6">

                        {/* CPU */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div className="flex items-center gap-3">
                                <Cpu className="w-5 h-5 text-slate-400" />
                                <label className="text-slate-200">High CPU Warning</label>
                            </div>
                            <div className="col-span-2">
                                <input type="range" min="0" max="100" defaultValue="80" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0%</span>
                                    <span className="text-emerald-400 font-mono">80%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>

                        {/* Disk */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div className="flex items-center gap-3">
                                <HardDrive className="w-5 h-5 text-slate-400" />
                                <label className="text-slate-200">Disk Usage Critical</label>
                            </div>
                            <div className="col-span-2">
                                <input type="range" min="0" max="100" defaultValue="90" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0%</span>
                                    <span className="text-red-400 font-mono">90%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Agent Services */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                        <Server className="w-5 h-5" /> Monitored Services
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6">
                        <div className="space-y-4">
                            <ToggleItem label="Wazuh Agent" description="Security Events & FIM" defaultChecked />
                            <ToggleItem label="Promtail" description="Log Aggregation" defaultChecked />
                            <ToggleItem label="Node Exporter" description="System Metrics" defaultChecked />
                        </div>
                    </div>
                </section>

                <div className="flex justify-end">
                    <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                </div>

            </main>
        </div>
    );
}

function ToggleItem({ label, description, defaultChecked }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div>
                <p className="text-slate-200 font-medium">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
        </div>
    )
}
