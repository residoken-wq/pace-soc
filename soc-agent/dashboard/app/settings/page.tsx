"use client";
// Settings Page - SOC Dashboard v1.1 - TypeScript strict mode fix

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { Save, Bell, Server, Cpu, HardDrive, Check, Loader2, Database, Mail, MessageSquare, Wifi, XCircle, Trash2, AlertTriangle, Key, Sparkles, Brain } from 'lucide-react';

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
    smtp?: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
        from: string;
        to: string;
    };
    ai?: {
        enabled: boolean;
        provider: 'gemini';
        apiKey: string;
        model: string;
    };
}

const defaultSettings: Settings = {
    alertThresholds: { cpuWarning: 80, diskCritical: 90, memoryWarning: 85 },
    services: { wazuhAgent: true, promtail: true, nodeExporter: true },
    wazuh: { managerUrl: 'https://192.168.1.206:55000', apiUser: 'wazuh-wui', apiPassword: 'wazuh-wui' },
    notifications: { emailEnabled: false, slackEnabled: false, webhookUrl: '' },
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        password: '',
        from: 'SOC Alert <soc@example.com>',
        to: 'admin@example.com'
    },
    ai: {
        enabled: false,
        provider: 'gemini',
        apiKey: '',
        model: 'gemini-1.5-flash'
    }
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateWazuh('managerUrl', e.target.value)}
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateWazuh('apiUser', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                                    placeholder="wazuh-wui"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">API Password</label>
                                <input
                                    type="password"
                                    value={settings.wazuh.apiPassword || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateWazuh('apiPassword', e.target.value)}
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
                        {/* SMTP Configuration - Only show if Email is enabled */}
                        {settings.notifications.emailEnabled && (
                            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <h4 className="text-sm font-medium text-slate-300">SMTP Settings</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Host</label>
                                        <input
                                            type="text"
                                            value={settings.smtp?.host || ''}
                                            onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp!, host: e.target.value } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                                            placeholder="smtp.gmail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Port</label>
                                        <input
                                            type="number"
                                            value={settings.smtp?.port || 587}
                                            onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp!, port: parseInt(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">User</label>
                                        <input
                                            type="text"
                                            value={settings.smtp?.user || ''}
                                            onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp!, user: e.target.value } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={settings.smtp?.password || ''}
                                            onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp!, password: e.target.value } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">From Address</label>
                                        <input
                                            type="text"
                                            value={settings.smtp?.from || ''}
                                            onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp!, from: e.target.value } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                                            placeholder="SOC Alert <soc@example.com>"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">To Address</label>
                                        <input
                                            type="text"
                                            value={settings.smtp?.to || ''}
                                            onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp!, to: e.target.value } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                </div>
                                <TestEmailButton settings={settings} />
                            </div>
                        )}

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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotifications('webhookUrl', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-orange-500"
                                placeholder="https://hooks.slack.com/..."
                            />
                        </div>
                    </div>
                </section>



                {/* AI Integration */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                        <Brain className="w-5 h-5" /> AI Integration
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-200">AI Analysis (Gemini)</h3>
                                    <p className="text-sm text-slate-400">Enable AI-powered insights and threat detection</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.ai?.enabled}
                                    onChange={e => {
                                        const ai = settings.ai || { provider: 'gemini', apiKey: '', model: 'gemini-1.5-flash', enabled: false };
                                        setSettings({ ...settings, ai: { ...ai, enabled: e.target.checked } });
                                    }}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {settings.ai?.enabled && (
                            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Provider</label>
                                        <select
                                            disabled
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed text-sm"
                                            value="gemini"
                                        >
                                            <option value="gemini">Google Gemini</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="password"
                                                value={settings.ai?.apiKey || ''}
                                                onChange={e => setSettings({ ...settings, ai: { ...settings.ai!, apiKey: e.target.value } })}
                                                placeholder="Enter your Gemini API Key"
                                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono text-sm"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Model</label>
                                        <select
                                            value={settings.ai?.model || 'gemini-1.5-flash'}
                                            onChange={e => setSettings({ ...settings, ai: { ...settings.ai!, model: e.target.value } })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm"
                                        >
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
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

                {/* Log Cleanup / Data Retention */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" /> Data Retention & Cleanup
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-yellow-400 font-medium">Automatic Log Cleanup</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Logs and alerts older than the retention period will be permanently deleted to save storage space.
                                </p>
                            </div>
                        </div>

                        <LogCleanupSection />
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseInt(e.target.value))}
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

function LogCleanupSection() {
    const [retentionDays, setRetentionDays] = useState(180); // 6 months default
    const [cleaning, setCleaning] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; deleted?: number } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleCleanup = async () => {
        setCleaning(true);
        setResult(null);
        try {
            const res = await fetch('/api/logs/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retentionDays })
            });
            const data = await res.json();
            setResult({
                success: data.success,
                message: data.message || data.error,
                deleted: data.deleted
            });
        } catch (e: any) {
            setResult({ success: false, message: e.message });
        } finally {
            setCleaning(false);
            setShowConfirm(false);
        }
    };

    const retentionOptions = [
        { value: 30, label: '1 Month' },
        { value: 90, label: '3 Months' },
        { value: 180, label: '6 Months' },
        { value: 365, label: '1 Year' },
    ];

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm text-slate-300 mb-2">Log Retention Period</label>
                <div className="flex gap-2 flex-wrap">
                    {retentionOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setRetentionDays(opt.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${retentionDays === opt.value
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Logs older than {retentionDays} days will be deleted when cleanup runs.
                </p>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear Old Logs Now
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">Delete logs older than {retentionDays} days?</span>
                        <button
                            onClick={handleCleanup}
                            disabled={cleaning}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Confirm Delete
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {result && (
                <div className={`p-4 rounded-lg border ${result.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    <div className="flex items-center gap-2">
                        {result.success ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span>{result.message}</span>
                        {result.deleted !== undefined && (
                            <span className="ml-2 text-slate-400">({result.deleted} records deleted)</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function TestEmailButton({ settings }: { settings: Settings }) {
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const sendTestEmail = async () => {
        setSending(true);
        setResult(null);
        try {
            const res = await fetch('/api/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: settings.smtp,
                    to: settings.smtp?.to
                })
            });
            const data = await res.json();
            setResult({ success: data.success, message: data.message || data.error });
        } catch (e: any) {
            setResult({ success: false, message: e.message });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
            <button
                onClick={sendTestEmail}
                disabled={sending}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Test Email
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

