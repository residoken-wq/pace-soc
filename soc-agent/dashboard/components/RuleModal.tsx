"use client";

import React, { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, Network, HardDrive, Server, ExternalLink } from 'lucide-react';
import { MITRE_TACTICS } from '../lib/rules';

interface RuleFormData {
    name: string;
    category: 'AUTH' | 'NET' | 'FIM' | 'SYS';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    mitreTactic: string;
    mitreTechnique: string;
    mitreTechniqueId: string;
    conditions: string;
    action: 'alert' | 'block' | 'notify';
    enabled: boolean;
}

interface RuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: RuleFormData) => void;
    editRule?: any;
}

const MITRE_TECHNIQUES: { [key: string]: { name: string; id: string }[] } = {
    'Initial Access': [
        { name: 'Valid Accounts', id: 'T1078' },
        { name: 'Exploit Public-Facing Application', id: 'T1190' },
        { name: 'Phishing', id: 'T1566' }
    ],
    'Execution': [
        { name: 'Command and Scripting Interpreter', id: 'T1059' },
        { name: 'Malicious File', id: 'T1204.002' },
        { name: 'User Execution', id: 'T1204' }
    ],
    'Persistence': [
        { name: 'Create Account', id: 'T1136' },
        { name: 'Boot or Logon Autostart Execution', id: 'T1547' },
        { name: 'Scheduled Task/Job', id: 'T1053' }
    ],
    'Privilege Escalation': [
        { name: 'Exploitation for Privilege Escalation', id: 'T1068' },
        { name: 'Abuse Elevation Control Mechanism', id: 'T1548' },
        { name: 'Process Injection', id: 'T1055' }
    ],
    'Defense Evasion': [
        { name: 'Obfuscated Files or Information', id: 'T1027' },
        { name: 'Masquerading', id: 'T1036' },
        { name: 'Indicator Removal', id: 'T1070' }
    ],
    'Credential Access': [
        { name: 'Brute Force', id: 'T1110' },
        { name: 'OS Credential Dumping', id: 'T1003' },
        { name: 'Credentials from Password Stores', id: 'T1555' }
    ],
    'Discovery': [
        { name: 'Network Service Discovery', id: 'T1046' },
        { name: 'System Information Discovery', id: 'T1082' },
        { name: 'Account Discovery', id: 'T1087' }
    ],
    'Lateral Movement': [
        { name: 'Remote Services', id: 'T1021' },
        { name: 'Lateral Tool Transfer', id: 'T1570' }
    ],
    'Collection': [
        { name: 'Data from Local System', id: 'T1005' },
        { name: 'Screen Capture', id: 'T1113' }
    ],
    'Command and Control': [
        { name: 'Application Layer Protocol', id: 'T1071' },
        { name: 'DNS', id: 'T1071.004' },
        { name: 'Proxy', id: 'T1090' }
    ],
    'Exfiltration': [
        { name: 'Exfiltration Over C2 Channel', id: 'T1041' },
        { name: 'Exfiltration Over Web Service', id: 'T1567' }
    ],
    'Impact': [
        { name: 'Data Destruction', id: 'T1485' },
        { name: 'Service Stop', id: 'T1489' }
    ],
    'Reconnaissance': [
        { name: 'Active Scanning', id: 'T1595' },
        { name: 'Gather Victim Network Information', id: 'T1590' }
    ]
};

const initialFormData: RuleFormData = {
    name: '',
    category: 'AUTH',
    severity: 'medium',
    description: '',
    mitreTactic: '',
    mitreTechnique: '',
    mitreTechniqueId: '',
    conditions: '',
    action: 'alert',
    enabled: true
};

export default function RuleModal({ isOpen, onClose, onSave, editRule }: RuleModalProps) {
    const [formData, setFormData] = useState<RuleFormData>(initialFormData);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editRule) {
            setFormData({
                name: editRule.name || '',
                category: editRule.category || 'AUTH',
                severity: editRule.severity || 'medium',
                description: editRule.description || '',
                mitreTactic: editRule.mitre?.tactic || '',
                mitreTechnique: editRule.mitre?.technique || '',
                mitreTechniqueId: editRule.mitre?.techniqueId || '',
                conditions: editRule.conditions || '',
                action: editRule.action || 'alert',
                enabled: editRule.enabled ?? true
            });
        } else {
            setFormData(initialFormData);
        }
        setErrors({});
    }, [editRule, isOpen]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = 'Rule name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.conditions.trim()) newErrors.conditions = 'Conditions are required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (e) {
            console.error('Save failed', e);
        } finally {
            setSaving(false);
        }
    };

    const handleTacticChange = (tactic: string) => {
        setFormData({
            ...formData,
            mitreTactic: tactic,
            mitreTechnique: '',
            mitreTechniqueId: ''
        });
    };

    const handleTechniqueChange = (index: number) => {
        const techniques = MITRE_TECHNIQUES[formData.mitreTactic] || [];
        const tech = techniques[index];
        if (tech) {
            setFormData({
                ...formData,
                mitreTechnique: tech.name,
                mitreTechniqueId: tech.id
            });
        }
    };

    const getCategoryIcon = (cat: string) => {
        const icons: any = {
            'AUTH': <Shield className="w-4 h-4" />,
            'NET': <Network className="w-4 h-4" />,
            'FIM': <HardDrive className="w-4 h-4" />,
            'SYS': <Server className="w-4 h-4" />
        };
        return icons[cat] || <AlertTriangle className="w-4 h-4" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        {editRule ? 'Edit Rule' : 'Create New Rule'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Rule Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Brute Force Detection"
                            className={`w-full px-4 py-2.5 bg-slate-800 border ${errors.name ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500`}
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Category & Severity Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['AUTH', 'NET', 'FIM', 'SYS'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, category: cat })}
                                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-xs transition-all ${formData.category === cat
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        {getCategoryIcon(cat)}
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
                            <select
                                value={formData.severity}
                                onChange={e => setFormData({ ...formData, severity: e.target.value as any })}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                            >
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="info">Info</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what this rule detects..."
                            rows={2}
                            className={`w-full px-4 py-2.5 bg-slate-800 border ${errors.description ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 resize-none`}
                        />
                        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
                    </div>

                    {/* MITRE ATT&CK Section */}
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-blue-400">MITRE ATT&CK Mapping (Optional)</h3>
                            {formData.mitreTechniqueId && (
                                <a
                                    href={`https://attack.mitre.org/techniques/${formData.mitreTechniqueId}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View on MITRE <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Tactic</label>
                                <select
                                    value={formData.mitreTactic}
                                    onChange={e => handleTacticChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200"
                                >
                                    <option value="">Select Tactic...</option>
                                    {MITRE_TACTICS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Technique</label>
                                <select
                                    value={MITRE_TECHNIQUES[formData.mitreTactic]?.findIndex(t => t.name === formData.mitreTechnique) ?? ''}
                                    onChange={e => handleTechniqueChange(parseInt(e.target.value))}
                                    disabled={!formData.mitreTactic}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 disabled:opacity-50"
                                >
                                    <option value="">Select Technique...</option>
                                    {(MITRE_TECHNIQUES[formData.mitreTactic] || []).map((t, i) => (
                                        <option key={t.id} value={i}>{t.id} - {t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Conditions */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Detection Conditions *</label>
                        <input
                            type="text"
                            value={formData.conditions}
                            onChange={e => setFormData({ ...formData, conditions: e.target.value })}
                            placeholder="e.g., failed_logins > 5 within 5 minutes"
                            className={`w-full px-4 py-2.5 bg-slate-800 border ${errors.conditions ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500`}
                        />
                        {errors.conditions && <p className="text-red-400 text-xs mt-1">{errors.conditions}</p>}
                    </div>

                    {/* Action & Enabled Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Action</label>
                            <div className="flex gap-2">
                                {(['alert', 'block', 'notify'] as const).map(act => (
                                    <button
                                        key={act}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, action: act })}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${formData.action === act
                                            ? act === 'block' ? 'bg-red-500/20 border-red-500 text-red-400'
                                                : act === 'alert' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                                    : 'bg-blue-500/20 border-blue-500 text-blue-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        {act.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                            <label className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600">
                                <span className="text-slate-300">{formData.enabled ? 'Enabled' : 'Disabled'}</span>
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-slate-700 rounded-full relative peer-checked:bg-emerald-500 transition-colors">
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.enabled ? 'left-5' : 'left-0.5'}`} />
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : editRule ? 'Update Rule' : 'Create Rule'}
                    </button>
                </div>
            </div>
        </div>
    );
}
