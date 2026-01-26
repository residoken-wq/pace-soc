
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

        // Run Analyzers
        const report = {
            general: {
                status: response.status,
                url: response.url,
                duration: `${duration}ms`,
                size: html.length
            },
            headers: WebAnalyzers.analyzeHeaders(headers),
            cookies: WebAnalyzers.analyzeCookies(headers),
            tech: await WebAnalyzers.detectTech(targetUrl, headers, html),
            robots: await WebAnalyzers.analyzeRobots(targetUrl)
        };

        return NextResponse.json({ success: true, report });

    } catch (error: any) {
        console.error('Web Analysis Failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to analyze target. Host may be unreachable.'
        }, { status: 500 });
    }
}
