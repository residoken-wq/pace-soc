import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';

export interface VulnerabilityData {
    id: string;
    cve: string;
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cvss: number;
    package?: string;
    version?: string;
    fixedVersion?: string;
    agent: string;
    agentId: string;
    detectedAt: string;
    status: 'open' | 'fixed' | 'ignored';
    reference?: string;
}

function mapSeverity(cvss: number): 'critical' | 'high' | 'medium' | 'low' {
    if (cvss >= 9.0) return 'critical';
    if (cvss >= 7.0) return 'high';
    if (cvss >= 4.0) return 'medium';
    return 'low';
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId');
        const severity = searchParams.get('severity');
        const limit = parseInt(searchParams.get('limit') || '100');

        let allVulnerabilities: VulnerabilityData[] = [];

        // Get list of agents
        const agentsRes = await wazuhFetch('/agents?status=active&limit=50');
        const agents = agentsRes.data?.affected_items || [];

        // Fetch vulnerabilities for each agent (or specific agent)
        const targetAgents = agentId
            ? agents.filter((a: any) => a.id === agentId)
            : agents;

        for (const agent of targetAgents) {
            try {
                // Wazuh vulnerability endpoint
                const vulnRes = await wazuhFetch(`/vulnerability/${agent.id}?limit=50`);
                const vulns = vulnRes.data?.affected_items || [];

                const agentVulns: VulnerabilityData[] = vulns.map((v: any, idx: number) => ({
                    id: `${agent.id}-${v.cve || idx}`,
                    cve: v.cve || v.reference || `VULN-${idx}`,
                    name: v.title || v.name || 'Unknown vulnerability',
                    severity: v.severity?.toLowerCase() || mapSeverity(v.cvss_score || v.cvss || 0),
                    cvss: v.cvss_score || v.cvss || 0,
                    package: v.package?.name || v.name,
                    version: v.package?.version || v.version,
                    fixedVersion: v.package?.fixed_version,
                    agent: agent.name,
                    agentId: agent.id,
                    detectedAt: v.detected_at || v.date || new Date().toISOString(),
                    status: v.status || 'open',
                    reference: v.reference
                }));

                allVulnerabilities = [...allVulnerabilities, ...agentVulns];
            } catch (e) {
                console.log(`No vulnerabilities for agent ${agent.id}`);
            }
        }

        // Apply severity filter
        if (severity && severity !== 'all') {
            allVulnerabilities = allVulnerabilities.filter(v => v.severity === severity);
        }

        // Sort by CVSS score descending
        allVulnerabilities.sort((a, b) => b.cvss - a.cvss);

        // Calculate stats
        const stats = {
            total: allVulnerabilities.length,
            critical: allVulnerabilities.filter(v => v.severity === 'critical').length,
            high: allVulnerabilities.filter(v => v.severity === 'high').length,
            medium: allVulnerabilities.filter(v => v.severity === 'medium').length,
            low: allVulnerabilities.filter(v => v.severity === 'low').length,
            open: allVulnerabilities.filter(v => v.status === 'open').length,
            fixed: allVulnerabilities.filter(v => v.status === 'fixed').length,
        };

        return NextResponse.json({
            success: true,
            stats,
            vulnerabilities: allVulnerabilities.slice(0, limit)
        });

    } catch (error: any) {
        console.error('Vulnerabilities API Error:', error);

        // Return empty with error
        return NextResponse.json({
            success: false,
            error: error.message,
            stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, fixed: 0 },
            vulnerabilities: [],
            message: 'Vulnerability scanning requires Wazuh vulnerability detector module'
        });
    }
}
