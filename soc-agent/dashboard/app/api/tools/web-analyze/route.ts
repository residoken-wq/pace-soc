
import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';
import { WebAnalyzers } from '@/lib/tools/web-analyzers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL
        let targetUrl = url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'http://' + targetUrl;
        }

        const parsed = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
            return NextResponse.json({ error: 'Only credential-free HTTP(S) URLs are allowed' }, { status: 400 });
        }
        const addresses = net.isIP(parsed.hostname) ? [parsed.hostname] : (await dns.lookup(parsed.hostname, { all: true })).map(entry => entry.address);
        if (addresses.some(isBlockedAddress)) {
            return NextResponse.json({ error: 'Private, loopback, link-local and metadata targets are not allowed' }, { status: 403 });
        }

        // Perform the Main Request
        const start = Date.now();
        console.log(`Analyzing: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            redirect: 'manual',
            headers: {
                'User-Agent': 'SOC-Agent-WebScanner/1.0'
            }
        });

        if (response.status >= 300 && response.status < 400) {
            return NextResponse.json({ error: 'Redirects are not allowed for web analysis' }, { status: 400 });
        }

        const headers = response.headers;
        const html = await response.text();
        const duration = Date.now() - start;

        // Basic Info
        const host = new URL(targetUrl).hostname;
        const ip = await WebAnalyzers.resolveHost(host);

        // Run Analyzers
        const report: any = {
            general: {
                status: response.status,
                url: response.url,
                duration: `${duration}ms`,
                size: html.length,
                ip: ip || 'Unknown'
            },
            headers: WebAnalyzers.analyzeHeaders(headers),
            cookies: WebAnalyzers.analyzeCookies(headers),
            tech: await WebAnalyzers.detectTech(targetUrl, headers, html),
            robots: await WebAnalyzers.analyzeRobots(targetUrl)
        };

        // Deep Scan Modules
        if (body.scanType === 'deep') {
            console.log('Running Deep Scan modules...');
            const [content, ssl, supplyChain] = await Promise.all([
                WebAnalyzers.analyzeContent(targetUrl),
                WebAnalyzers.analyzeSSL(targetUrl),
                WebAnalyzers.analyzeSupplyChain(html)
            ]);
            report.content = content;
            report.ssl = ssl;
            report.supplyChain = supplyChain;
        }

        // Calculate Final Risk Score
        report.riskScore = WebAnalyzers.calculateRiskScore(report);

        return NextResponse.json({ success: true, report });

    } catch (error: any) {
        console.error('Web Analysis Failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to analyze target. Host may be unreachable.'
        }, { status: 500 });
    }
}

function isBlockedAddress(address: string): boolean {
    if (address === '::1' || address === '0.0.0.0' || address.startsWith('fe80:') || address.startsWith('fc') || address.startsWith('fd')) return true;
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 169 && parts[1] === 254 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31 || parts[0] === 192 && parts[1] === 168;
}
