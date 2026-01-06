"use client";
// Settings Page - SOC Dashboard v1.1 - TypeScript strict mode fix

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { Save, Bell, Server, Cpu, HardDrive, Check, Loader2, Database, Mail, MessageSquare, Wifi, XCircle } from 'lucide-react';

interface Settings {
    alertThresholds: {
        cpuWarning: number;
        diskCritical: number;
        memoryWarning: number;
    };
    services: {
        wazuhAgent: boolean;
        promtail: boolean;
        nodeExporter: boolean;
    };
    wazuh: {
        managerUrl: string;
        apiUser: string;
        apiPassword: string;
    };
    notifications: {
        emailEnabled: boolean;
        slackEnabled: boolean;
        webhookUrl: string;
    };
}

const defaultSettings: Settings = {
    alertThresholds: { cpuWarning: 80, diskCritical: 90, memoryWarning: 85 },
    services: { wazuhAgent: true, promtail: true, nodeExporter: true },
    wazuh: { managerUrl: 'https://192.168.1.206:55000', apiUser: 'wazuh-wui', apiPassword: 'wazuh-wui' },
    notifications: { emailEnabled: false, slackEnabled: false, webhookUrl: '' }
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.settings) {
                setSettings({ ...defaultSettings, ...data.settings });
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });
            const data = await res.json();
            if (data.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(data.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const updateThreshold = (key: keyof Settings['alertThresholds'], value: number) => {
        setSettings({
            ...settings,
            alertThresholds: { ...settings.alertThresholds, [key]: value }
        });
    };

    const toggleService = (key: keyof Settings['services']) => {
        setSettings({
            ...settings,
            services: { ...settings.services, [key]: !settings.services[key] }
        });
    };

    const updateWazuh = (key: keyof Settings['wazuh'], value: string) => {
        setSettings({
            ...settings,
            wazuh: { ...settings.wazuh, [key]: value }
        });
    };

    const updateNotifications = (key: keyof Settings['notifications'], value: boolean | string) => {
        setSettings({
            ...settings,
            notifications: { ...settings.notifications, [key]: value }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">Configuration</h2>
                        <p className="text-slate-400">Manage agent settings and alert thresholds.</p>
                    </div>
                    {saved && (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <Check className="w-4 h-4" /> Saved successfully
                        </div>
                    )}
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20">
                        {error}
                    </div>
                )}

                {/* Alert Thresholds */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                        <Bell className="w-5 h-5" /> Alert Thresholds
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-6">
                        <ThresholdSlider
                            icon={<Cpu className="w-5 h-5 text-slate-400" />}
                            label="High CPU Warning"
                            value={settings.alertThresholds.cpuWarning}
                            onChange={(v: number) => updateThreshold('cpuWarning', v)}
                            color="emerald"
                        />
                        <ThresholdSlider
                            icon={<HardDrive className="w-5 h-5 text-slate-400" />}
                            label="Disk Usage Critical"
                            value={settings.alertThresholds.diskCritical}
                            onChange={(v: number) => updateThreshold('diskCritical', v)}
                            color="red"
                        />
                        <ThresholdSlider
                            icon={<Database className="w-5 h-5 text-slate-400" />}
                            label="Memory Warning"
                            value={settings.alertThresholds.memoryWarning}
                            onChange={(v: number) => updateThreshold('memoryWarning', v)}
                            color="yellow"
                        />
                    </div>
                </section>

                {/* Wazuh Manager */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                        <Server className="w-5 h-5" /> Wazuh Manager Connection
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Manager URL</label>
                            <input
                                type="text"
                                value={settings.wazuh.managerUrl}
                                onChange={(e) => updateWazuh('managerUrl', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                                placeholder="https://192.168.1.206:55000"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">API User</label>
                                <input
                                    type="text"
                                    value={settings.wazuh.apiUser}
                                    onChange={(e) => updateWazuh('apiUser', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                                    placeholder="wazuh-wui"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">API Password</label>
                                <input
                                    type="password"
                                    value={settings.wazuh.apiPassword || ''}
                                    onChange={(e) => updateWazuh('apiPassword', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <TestConnectionButton settings={settings} />
                    </div>
                </section>

                {/* Monitored Services */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                        <Server className="w-5 h-5" /> Monitored Services
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6">
                        <div className="space-y-4">
                            <ToggleItem
                                label="Wazuh Agent"
                                description="Security Events & FIM"
                                checked={settings.services.wazuhAgent}
                                onChange={() => toggleService('wazuhAgent')}
                            />
                            <ToggleItem
                                label="Promtail"
                                description="Log Aggregation to Loki"
                                checked={settings.services.promtail}
                                onChange={() => toggleService('promtail')}
                            />
                            <ToggleItem
                                label="Node Exporter"
                                description="System Metrics for Prometheus"
                                checked={settings.services.nodeExporter}
                                onChange={() => toggleService('nodeExporter')}
                            />
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                        <Mail className="w-5 h-5" /> Notifications
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
                        <ToggleItem
                            label="Email Notifications"
                            description="Send alerts via email"
                            checked={settings.notifications.emailEnabled}
                            onChange={() => updateNotifications('emailEnabled', !settings.notifications.emailEnabled)}
                        />
                        <ToggleItem
                            label="Slack Notifications"
                            description="Send alerts to Slack channel"
                            checked={settings.notifications.slackEnabled}
                            onChange={() => updateNotifications('slackEnabled', !settings.notifications.slackEnabled)}
                        />
                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Webhook URL</label>
                            <input
                                type="text"
                                value={settings.notifications.webhookUrl}
                                onChange={(e) => updateNotifications('webhookUrl', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-orange-500"
                                placeholder="https://hooks.slack.com/..."
                            />
                        </div>
                    </div>
                </section>

                {/* Wazuh Agent Installation */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-teal-400 flex items-center gap-2">
                        <Server className="w-5 h-5" /> Wazuh Agent Installation
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
                        <p className="text-sm text-slate-400">
                            Quick install command for Linux machines. Run as root on target servers:
                        </p>
                        <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto">
                            <code>curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh && sudo WAZUH_MANAGER='{settings.wazuh.managerUrl.replace('https://', '').replace(':55000', '')}' bash wazuh-install.sh</code>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <h4 className="text-sm font-medium text-slate-200 mb-2">Ubuntu/Debian</h4>
                                <code className="text-xs text-slate-400 font-mono">
                                    apt-get install -y wazuh-agent
                                </code>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <h4 className="text-sm font-medium text-slate-200 mb-2">CentOS/RHEL</h4>
                                <code className="text-xs text-slate-400 font-mono">
                                    yum install -y wazuh-agent
                                </code>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            Use the <a href="/tools" className="text-teal-400 hover:underline">Network Tools</a> page for scanning hosts and generating installation scripts.
                        </p>
                    </div>
                </section>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save Changes</>
                        )}
                    </button>
                </div>

            </main>
        </div>
    );
}

function ThresholdSlider({ icon, label, value, onChange, color }: any) {
    const colorClasses: any = {
        emerald: 'accent-emerald-500 text-emerald-400',
        red: 'accent-red-500 text-red-400',
        yellow: 'accent-yellow-500 text-yellow-400'
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-3">
                {icon}
                <label className="text-slate-200">{label}</label>
            </div>
            <div className="col-span-2">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span className={`font-mono ${colorClasses[color]}`}>{value}%</span>
                    <span>100%</span>
                </div>
            </div>
        </div>
    );
}

function ToggleItem({ label, description, checked, onChange }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div>
                <p className="text-slate-200 font-medium">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
                <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${checked ? 'left-5' : 'left-0.5'}`}
                />
            </button>
        </div>
    );
}

function TestConnectionButton({ settings }: { settings: Settings }) {
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const testConnection = async () => {
        setTesting(true);
        setResult(null);
        try {
            const res = await fetch('/api/wazuh/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    managerUrl: settings.wazuh.managerUrl,
                    apiUser: settings.wazuh.apiUser,
                    apiPassword: settings.wazuh.apiPassword
                })
            });
            const data = await res.json();
            setResult({ success: data.success, message: data.message || data.error });
        } catch (e: any) {
            setResult({ success: false, message: e.message });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
            <button
                onClick={testConnection}
                disabled={testing}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                Test Connection
            </button>
            {result && (
                <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.success ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {result.message}
                </div>
            )}
        </div>
    );
}
