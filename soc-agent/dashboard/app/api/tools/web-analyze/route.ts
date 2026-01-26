
import { NextRequest, NextResponse } from 'next/server';
import { WebAnalyzers } from '@/lib/tools/web-analyzers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, options } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL
        let targetUrl = url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'http://' + targetUrl;
        }

        // Perform the Main Request
        const start = Date.now();
        console.log(`Analyzing: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'SOC-Agent-WebScanner/1.0'
            }
        });

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
