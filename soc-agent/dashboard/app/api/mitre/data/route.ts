import { NextRequest, NextResponse } from 'next/server';

const MITRE_ENTERPRISE_JSON_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';

// In-memory cache to avoid fetching 10MB JSON on every request
let cache: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    try {
        const now = Date.now();
        if (!cache || forceRefresh || (now - lastFetchTime > CACHE_TTL)) {
            console.log('Fetching MITRE data from source...');
            const response = await fetch(MITRE_ENTERPRISE_JSON_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch MITRE data: ${response.statusText}`);
            }
            const data = await response.json();

            // Process data to extract useful structure
            const tactics = new Set<string>();
            const techniques: Record<string, any[]> = {};
            const techniqueDetails: Record<string, any> = {};

            // Parse STIX objects
            const objects = data.objects || [];

            // First pass: Find all tactics
            const xMitreTactics = objects.filter((o: any) => o.type === 'x-mitre-tactic');
            const tacticMap = new Map();
            xMitreTactics.forEach((t: any) => {
                tacticMap.set(t.x_mitre_shortname, t.name);
            });

            // Second pass: Find techniques (attack-pattern)
            const attackPatterns = objects.filter((o: any) => o.type === 'attack-pattern' && !o.revoked && !o.x_mitre_deprecated);

            attackPatterns.forEach((ap: any) => {
                const externalRef = ap.external_references?.find((r: any) => r.source_name === 'mitre-attack');
                if (!externalRef) return;

                const techniqueId = externalRef.external_id;
                const techniqueName = ap.name;
                const description = ap.description;

                techniqueDetails[techniqueId] = {
                    id: techniqueId,
                    name: techniqueName,
                    description,
                    url: externalRef.url
                };

                // Map to tactics
                if (ap.kill_chain_phases) {
                    ap.kill_chain_phases.forEach((kcp: any) => {
                        if (kcp.kill_chain_name === 'mitre-attack') {
                            const tacticSlug = kcp.phase_name;
                            const tacticName = tacticMap.get(tacticSlug) || tacticSlug; // Convert slug to display name

                            // Use tacticName as key to match frontend lookup
                            if (!techniques[tacticName]) {
                                techniques[tacticName] = [];
                            }
                            techniques[tacticName].push({
                                id: techniqueId,
                                name: techniqueName
                            });
                        }
                    });
                }
            });

            cache = {
                timestamp: now,
                tactics: Array.from(tacticMap.values()), // List of tactic names
                tacticMap: Object.fromEntries(tacticMap), // slug -> Name
                techniques, // tacticSlug -> List of techniques
                details: techniqueDetails // ID -> Details
            };
            lastFetchTime = now;
        }

        return NextResponse.json(cache);
    } catch (error) {
        console.error('Error in MITRE API:', error);
        return NextResponse.json({ error: 'Failed to fetch MITRE data' }, { status: 500 });
    }
}
