// SOC Alert Rules - Predefined rules with MITRE ATT&CK mapping

export interface SOCRule {
    id: string;
    name: string;
    category: 'AUTH' | 'NET' | 'FIM' | 'SYS';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    mitre?: {
        tactic: string;
        technique: string;
        techniqueId: string;
    };
    // Wazuh Manager rule IDs that map to this SOC rule
    wazuhRuleIds?: string[];
    enabled: boolean;
    conditions: string;
    action: 'alert' | 'block' | 'notify';
}

export const SOC_RULES: SOCRule[] = [
    // Authentication & Access Rules
    {
        id: 'AUTH-001',
        name: 'Brute Force Attack',
        category: 'AUTH',
        severity: 'critical',
        description: 'Multiple failed login attempts detected from single source',
        mitre: { tactic: 'Credential Access', technique: 'Brute Force', techniqueId: 'T1110' },
        wazuhRuleIds: ['5710', '5711', '5712', '5716', '5720', '5758', '5760', '5763', '100300'],
        enabled: true,
        conditions: 'failed_logins > 5 within 5 minutes',
        action: 'alert'
    },
    {
        id: 'AUTH-002',
        name: 'Unusual Login Location',
        category: 'AUTH',
        severity: 'high',
        description: 'Login detected from new geographic location',
        mitre: { tactic: 'Initial Access', technique: 'Valid Accounts', techniqueId: 'T1078' },
        wazuhRuleIds: ['5501', '5502', '5503', '5715', '100301', '100302'],
        enabled: true,
        conditions: 'login_location NOT IN known_locations',
        action: 'alert'
    },
    {
        id: 'AUTH-003',
        name: 'Privilege Escalation',
        category: 'AUTH',
        severity: 'critical',
        description: 'User privilege escalation detected',
        mitre: { tactic: 'Privilege Escalation', technique: 'Exploitation for Privilege Escalation', techniqueId: 'T1068' },
        wazuhRuleIds: ['5400', '5401', '5402', '5403', '5404', '5405', '5453'],
        enabled: true,
        conditions: 'sudo OR su command executed',
        action: 'alert'
    },
    {
        id: 'AUTH-004',
        name: 'Service Account Anomaly',
        category: 'AUTH',
        severity: 'high',
        description: 'Service account used outside normal hours',
        wazuhRuleIds: ['5901', '5902', '5903'],
        enabled: true,
        conditions: 'service_account login outside business_hours',
        action: 'alert'
    },

    // Network Security Rules
    {
        id: 'NET-001',
        name: 'Port Scan Detected',
        category: 'NET',
        severity: 'medium',
        description: 'Network port scanning activity detected',
        mitre: { tactic: 'Reconnaissance', technique: 'Network Service Discovery', techniqueId: 'T1046' },
        wazuhRuleIds: ['4100', '4101', '4102', '4103'],
        enabled: true,
        conditions: 'connection_attempts > 100 to different ports within 1 minute',
        action: 'alert'
    },
    {
        id: 'NET-002',
        name: 'Unusual Outbound Traffic',
        category: 'NET',
        severity: 'high',
        description: 'Large data transfer to external IP detected',
        mitre: { tactic: 'Exfiltration', technique: 'Exfiltration Over C2 Channel', techniqueId: 'T1041' },
        enabled: true,
        conditions: 'outbound_data > 500MB within 1 hour',
        action: 'alert'
    },
    {
        id: 'NET-003',
        name: 'DNS Tunneling Attempt',
        category: 'NET',
        severity: 'critical',
        description: 'Suspicious DNS query pattern detected',
        mitre: { tactic: 'Command and Control', technique: 'DNS', techniqueId: 'T1071.004' },
        enabled: true,
        conditions: 'dns_query length > 50 characters',
        action: 'block'
    },
    {
        id: 'NET-004',
        name: 'C2 Beacon Pattern',
        category: 'NET',
        severity: 'critical',
        description: 'Regular beacon pattern to unknown external IP',
        mitre: { tactic: 'Command and Control', technique: 'Application Layer Protocol', techniqueId: 'T1071' },
        enabled: true,
        conditions: 'periodic_connection to unknown_ip every 60 seconds',
        action: 'block'
    },

    // File Integrity Rules
    {
        id: 'FIM-001',
        name: 'Critical System File Modified',
        category: 'FIM',
        severity: 'critical',
        description: 'Modification detected in /etc/passwd, /etc/shadow, or similar',
        mitre: { tactic: 'Persistence', technique: 'Create Account', techniqueId: 'T1136' },
        wazuhRuleIds: ['550', '551', '552', '553', '554', '555', '556', '557', '558', '559', '560', '561', '562', '100303'],
        enabled: true,
        conditions: 'file_modified IN [/etc/passwd, /etc/shadow, /etc/sudoers]',
        action: 'alert'
    },
    {
        id: 'FIM-002',
        name: 'Configuration File Changed',
        category: 'FIM',
        severity: 'medium',
        description: 'Application configuration file modified',
        wazuhRuleIds: ['550', '551', '552', '553'],
        enabled: true,
        conditions: 'file_modified IN /etc/*.conf',
        action: 'alert'
    },
    {
        id: 'FIM-003',
        name: 'New Executable Created',
        category: 'FIM',
        severity: 'high',
        description: 'New executable file created in monitored directory',
        mitre: { tactic: 'Execution', technique: 'Command and Scripting Interpreter', techniqueId: 'T1059' },
        wazuhRuleIds: ['554', '555', '556'],
        enabled: true,
        conditions: 'file_created with executable permission',
        action: 'alert'
    },
    {
        id: 'FIM-004',
        name: 'Malware Signature Detected',
        category: 'FIM',
        severity: 'critical',
        description: 'Known malware hash detected on system',
        mitre: { tactic: 'Execution', technique: 'Malicious File', techniqueId: 'T1204.002' },
        wazuhRuleIds: ['510', '511', '87103', '87104', '87105'],
        enabled: true,
        conditions: 'file_hash IN malware_database',
        action: 'block'
    },

    // System Health Rules
    {
        id: 'SYS-001',
        name: 'High CPU Usage',
        category: 'SYS',
        severity: 'medium',
        description: 'CPU usage above 90% for extended period',
        enabled: true,
        conditions: 'cpu_usage > 90% for 10 minutes',
        action: 'alert'
    },
    {
        id: 'SYS-002',
        name: 'Disk Space Critical',
        category: 'SYS',
        severity: 'high',
        description: 'Disk usage above 95%',
        enabled: true,
        conditions: 'disk_usage > 95%',
        action: 'alert'
    },
    {
        id: 'SYS-003',
        name: 'Service Crashed',
        category: 'SYS',
        severity: 'high',
        description: 'Critical service stopped unexpectedly',
        enabled: true,
        conditions: 'service_status changed from running to stopped',
        action: 'alert'
    },
    {
        id: 'SYS-004',
        name: 'Agent Disconnected',
        category: 'SYS',
        severity: 'medium',
        description: 'Wazuh agent lost connection to manager',
        enabled: true,
        conditions: 'agent_status = disconnected for 5 minutes',
        action: 'notify'
    }
];

export const MITRE_TACTICS = [
    'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
    'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
    'Collection', 'Command and Control', 'Exfiltration', 'Impact', 'Reconnaissance'
];

// Build lookup map: Wazuh Rule ID -> SOC Rule
const wazuhToSocRuleMap = new Map<string, SOCRule>();
SOC_RULES.forEach(rule => {
    rule.wazuhRuleIds?.forEach(wazuhId => {
        wazuhToSocRuleMap.set(wazuhId, rule);
    });
});

/**
 * Find the SOC rule that matches a given Wazuh rule ID
 */
export function findSOCRuleByWazuhId(wazuhRuleId: string): SOCRule | undefined {
    return wazuhToSocRuleMap.get(wazuhRuleId);
}

/**
 * Check if a Wazuh rule ID is mapped to any SOC rule
 */
export function isWazuhRuleMapped(wazuhRuleId: string): boolean {
    return wazuhToSocRuleMap.has(wazuhRuleId);
}

/**
 * Get all Wazuh rule IDs that are mapped to SOC rules
 */
export function getMappedWazuhRuleIds(): string[] {
    return Array.from(wazuhToSocRuleMap.keys());
}
