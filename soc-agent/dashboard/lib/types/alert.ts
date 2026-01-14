// Alert type definitions

export interface AlertRule {
    id: string;
    level: number;
    description: string;
    groups?: string[];
}

export interface AlertAgent {
    id: string;
    name: string;
    ip?: string;
}

export interface AlertMitre {
    tactic?: string;
    technique?: string;
    techniqueId?: string;
}

export interface Alert {
    id: string;
    timestamp: string;
    rule: AlertRule;
    agent: AlertAgent;
    location?: string;
    fullLog?: string;
    mitre?: AlertMitre;
}

export type AlertSeverity = 'critical' | 'high' | 'warning' | 'info';

export function getAlertSeverity(level: number): AlertSeverity {
    if (level >= 12) return 'critical';
    if (level >= 10) return 'high';
    if (level >= 7) return 'warning';
    return 'info';
}

export const SEVERITY_COLORS = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
};
