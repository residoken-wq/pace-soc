"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import RuleModal from '../../components/RuleModal';
import { Shield, Search, Filter, ToggleLeft, ToggleRight, ExternalLink, AlertTriangle, Cpu, Network, HardDrive, Server, Plus, Pencil, Trash2 } from 'lucide-react';

interface Rule {
    id: string;
    name: string;
    category: string;
    severity: string;
    description: string;
    mitre?: { tactic: string; technique: string; techniqueId: string };
    wazuhRuleIds?: string[];  // Linked Wazuh Manager rule IDs
    enabled: boolean;
    conditions: string;
    action: string;
}

export default function RulesPage() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ category: 'all', severity: 'all', search: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/rules');
            const data = await res.json();
            setRules(data.rules || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRules(); }, []);

    const toggleRule = async (ruleId: string) => {
        await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle', ruleId })
        });
        fetchRules();
    };

    const handleCreateRule = () => {
        setEditingRule(null);
        setModalOpen(true);
    };

    const handleEditRule = (rule: Rule) => {
        setEditingRule(rule);
        setModalOpen(true);
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ruleId })
        });
        fetchRules();
    };

    const handleSaveRule = async (formData: any) => {
        const rulePayload = {
            name: formData.name,
            category: formData.category,
            severity: formData.severity,
            description: formData.description,
            conditions: formData.conditions,
            action: formData.action,
            enabled: formData.enabled,
            mitre: formData.mitreTactic ? {
                tactic: formData.mitreTactic,
                technique: formData.mitreTechnique,
                techniqueId: formData.mitreTechniqueId
            } : undefined
        };

        if (editingRule) {
            // Update existing rule
            await fetch('/api/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', ruleId: editingRule.id, rule: rulePayload })
            });
        } else {
            // Create new rule
            await fetch('/api/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', rule: rulePayload })
            });
        }
        fetchRules();
    };

    const filteredRules = rules.filter(rule => {
        if (filter.category !== 'all' && rule.category !== filter.category) return false;
        if (filter.severity !== 'all' && rule.severity !== filter.severity) return false;
        if (filter.search && !rule.name.toLowerCase().includes(filter.search.toLowerCase()) &&
            !rule.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
        return true;
    });

    const getCategoryIcon = (cat: string) => {
        const icons: any = {
            'AUTH': <Shield className="w-4 h-4" />,
            'NET': <Network className="w-4 h-4" />,
            'FIM': <HardDrive className="w-4 h-4" />,
            'SYS': <Server className="w-4 h-4" />
        };
        return icons[cat] || <AlertTriangle className="w-4 h-4" />;
    };

    const getSeverityColor = (sev: string) => {
        const colors: any = {
            'critical': 'bg-red-500/10 text-red-400 border-red-500/30',
            'high': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
            'medium': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
            'low': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
            'info': 'bg-slate-500/10 text-slate-400 border-slate-500/30'
        };
        return colors[sev] || colors['info'];
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">SOC Alert Rules</h2>
                        <p className="text-slate-400">Manage detection rules with MITRE ATT&CK mapping</p>
                    </div>
                    <button
                        onClick={handleCreateRule}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create Rule
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search rules..."
                                value={filter.search}
                                onChange={e => setFilter({ ...filter, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <select
                        value={filter.category}
                        onChange={e => setFilter({ ...filter, category: e.target.value })}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                    >
                        <option value="all">All Categories</option>
                        <option value="AUTH">Authentication</option>
                        <option value="NET">Network</option>
                        <option value="FIM">File Integrity</option>
                        <option value="SYS">System</option>
                    </select>
                    <select
                        value={filter.severity}
                        onChange={e => setFilter({ ...filter, severity: e.target.value })}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                    >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                {/* Rules Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="text-slate-400 text-left bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">ID</th>
                                <th className="px-6 py-4 font-medium">Rule</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium">Severity</th>
                                <th className="px-6 py-4 font-medium">MITRE ATT&CK</th>
                                <th className="px-6 py-4 font-medium">Wazuh Rules</th>
                                <th className="px-6 py-4 font-medium">Action</th>
                                <th className="px-6 py-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredRules.map(rule => (
                                <tr key={rule.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleRule(rule.id)}>
                                            {rule.enabled ? (
                                                <ToggleRight className="w-6 h-6 text-emerald-400" />
                                            ) : (
                                                <ToggleLeft className="w-6 h-6 text-slate-500" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-400">{rule.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-200 font-medium">{rule.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{rule.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs">
                                            {getCategoryIcon(rule.category)} {rule.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                                            {rule.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {rule.mitre ? (
                                            <a
                                                href={`https://attack.mitre.org/techniques/${rule.mitre.techniqueId}/`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                            >
                                                {rule.mitre.techniqueId} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-slate-500 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {rule.wazuhRuleIds && rule.wazuhRuleIds.length > 0 ? (
                                            <span
                                                className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs font-mono cursor-help"
                                                title={rule.wazuhRuleIds.join(', ')}
                                            >
                                                {rule.wazuhRuleIds.length} rules
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${rule.action === 'block' ? 'bg-red-500/20 text-red-400' :
                                            rule.action === 'alert' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {rule.action.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditRule(rule)}
                                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRules.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            No rules found matching your criteria.
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <StatCard label="Total Rules" value={rules.length} />
                    <StatCard label="Enabled" value={rules.filter(r => r.enabled).length} color="emerald" />
                    <StatCard label="Critical" value={rules.filter(r => r.severity === 'critical').length} color="red" />
                    <StatCard label="With MITRE" value={rules.filter(r => r.mitre).length} color="blue" />
                </div>
            </main>

            {/* Rule Modal */}
            <RuleModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveRule}
                editRule={editingRule}
            />
        </div>
    );
}

function StatCard({ label, value, color = 'slate' }: any) {
    const colors: any = {
        slate: 'text-slate-400',
        emerald: 'text-emerald-400',
        red: 'text-red-400',
        blue: 'text-blue-400'
    };
    return (
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
        </div>
    );
}

