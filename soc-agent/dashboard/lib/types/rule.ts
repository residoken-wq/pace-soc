// SOC Rule type definitions

export type RuleCategory = 'AUTH' | 'NET' | 'FIM' | 'SYS';
export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RuleAction = 'alert' | 'block' | 'notify';

export interface RuleMitre {
    tactic: string;
    technique: string;
    techniqueId: string;
}

export interface SOCRule {
    id: string;
    name: string;
    category: RuleCategory;
    severity: RuleSeverity;
    description: string;
    mitre?: RuleMitre;
    enabled: boolean;
    conditions: string;
    action: RuleAction;
}

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
    AUTH: 'Authentication',
    NET: 'Network',
    FIM: 'File Integrity',
    SYS: 'System',
};

export const SEVERITY_ORDER: RuleSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

export const SEVERITY_STYLES: Record<RuleSeverity, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    info: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};
