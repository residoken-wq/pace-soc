import * as cheerio from 'cheerio';

interface AnalysisResult {
    status: 'pass' | 'fail' | 'warning' | 'info';
    message: string;
    details?: any;
    score?: number; // 0-100 impact score
    remediation?: string; // Code snippet or advice
}

interface ScanReport {
    headers: Record<string, AnalysisResult>;
    cookies: AnalysisResult[];
    tech: AnalysisResult[];
    robots: AnalysisResult | null;
    content?: AnalysisResult[];
    ssl?: AnalysisResult;
    supplyChain?: AnalysisResult[];
    riskScore?: number;
    ip?: string;
}

export const WebAnalyzers = {
    /**
     * Calculate Risk Score (0-100)
     * Higher score = Safer
     */
    calculateRiskScore: (report: ScanReport): number => {
        let score = 100;

        // Header Deductions
        Object.values(report.headers).forEach(h => { if (h.score) score -= h.score; });

        // Cookie Deductions
        report.cookies.forEach(c => { if (c.score) score -= c.score; });

        // SSL Deduction
        if (report.ssl && report.ssl.score) score -= report.ssl.score;

        // Content Discovery Deductions
        if (report.content) {
            report.content.forEach(c => {
                if (c.status === 'fail') score -= 15;
                if (c.status === 'warning') score -= 5;
            });
        }

        // Supply Chain Deductions
        if (report.supplyChain) {
            report.supplyChain.forEach(s => {
                if (s.status === 'fail') score -= 20;
                if (s.status === 'warning') score -= 10;
            });
        }

        return Math.max(0, score);
    },

    /**
     * Supply Chain Intelligence (JS Library Check)
     */
    analyzeSupplyChain: async (html: string): Promise<AnalysisResult[]> => {
        const results: AnalysisResult[] = [];
        const $ = cheerio.load(html);

        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (!src) return;

            // Simple pattern matching for vulnerable libraries (Simulated DB)
            if (src.includes('jquery-1.12') || src.includes('jquery/1.1')) {
                results.push({
                    status: 'fail',
                    message: `Vulnerable Library: jQuery 1.x detected (${src})`,
                    details: 'CVE-2020-11022: Cross-site scripting (XSS)',
                    remediation: '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>'
                });
            } else if (src.includes('bootstrap/3.3')) {
                results.push({
                    status: 'warning',
                    message: `Outdated Library: Bootstrap 3 (${src})`,
                    details: 'EOL version. Upgrade to Bootstrap 5 recommended.',
                    remediation: 'npm install bootstrap@latest'
                });
            } else if (src.includes('angular.js') && !src.includes('1.8')) {
                results.push({
                    status: 'fail',
                    message: `Vulnerable Library: AngularJS 1.x (<1.8) detected`,
                    details: 'Multiple XSS vulnerabilities.',
                    remediation: 'Migrate to Angular 2+ or update to 1.8.3'
                });
            }
        });

        // If no findings but external scripts exist
        if (results.length === 0 && $('script[src^="http"]').length > 0) {
            results.push({ status: 'info', message: 'External scripts found but no known CVEs matched in quick DB.' });
        }

        return results;
    },

    /**
     * Generate Remediation Configs
     */
    generateRemediation: (findingType: string): string => {
        switch (findingType) {
            case 'HSTS':
                return `# Nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Apache (.htaccess)
<IfModule mod_headers.c>
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>`;
            case 'CSP':
                return `# Nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://trusted.cdn.com; object-src 'none';" always;`;
            case 'X-Frame':
                return `# Nginx
add_header X-Frame-Options "SAMEORIGIN" always;`;
            default:
                return 'No automated remediation available.';
        }
    },
    /**
     * Resolve Hostname to IP
     */
    resolveHost: async (hostname: string): Promise<string | null> => {
        try {
            // In Next.js Edge/Serverless, 'dns' might be restricted. 
            // We'll use a hacky but effective way via simple fetch to a public DNS over HTTPS if local fails,
            // or just rely on a mocked lookup if we assume local agent context.
            // For this realistic simulation, we'll try a fast DNS lookup via Google DNS API to avoid Node/OS dependencies issues in some environments.
            const res = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
            const data = await res.json();
            if (data.Answer && data.Answer.length > 0) {
                return data.Answer[0].data;
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Analyze SSL Certificate
     */
    analyzeSSL: async (url: string): Promise<AnalysisResult> => {
        if (!url.startsWith('https')) {
            return { status: 'warning', message: 'Not using HTTPS', score: 50 };
        }
        try {
            // A simple fetch confirms connection works, but to get Cert details in pure JS/Fetch environments is hard.
            // We assume backend Node.js environment where we could use 'https' module, but for portability in this demo
            // we will infer quality from the connection ability and Headers.
            const res = await fetch(url, { method: 'HEAD' });
            if (res.ok) {
                // Determine if HSTS is strict
                const hsts = res.headers.get('strict-transport-security');
                return {
                    status: 'pass',
                    message: hsts ? 'Secure Connection (HSTS Enabled)' : 'Secure Connection (HTTPS Valid)',
                    details: 'Certificate Chain appears valid.'
                };
            }
            return { status: 'fail', message: 'SSL Connection Failed' };
        } catch (e) {
            return { status: 'fail', message: 'Invalid SSL Certificate or Connection Error' };
        }
    },

    /**
     * Content Discovery (Directory Fuzzing)
     */
    analyzeContent: async (baseUrl: string): Promise<AnalysisResult[]> => {
        const paths = [
            '/admin', '/login', '/dashboard',
            '/.env', '/config.php', '/backup',
            '/.git/config', '/api', '/swagger.json'
        ];

        const findings: AnalysisResult[] = [];

        // Run in parallel
        const promises = paths.map(async (path) => {
            try {
                const target = new URL(path, baseUrl).toString();
                const res = await fetch(target, { method: 'HEAD', redirect: 'manual' });
                if (res.status === 200 || res.status === 403 || res.status === 401) {
                    let impact = 'info';
                    if (path.includes('.env') || path.includes('.git')) impact = 'fail'; // High severity

                    return {
                        status: impact as any,
                        message: `Found: ${path} (Status: ${res.status})`,
                        details: target
                    };
                }
            } catch (e) { /* ignore connection errors */ }
            return null;
        });

        const results = await Promise.all(promises);
        return results.filter(Boolean) as AnalysisResult[];
    },

    /**
     * Analyze HTTP Security Headers
     */
    analyzeHeaders: (headers: Headers): Record<string, AnalysisResult> => {
        const results: Record<string, AnalysisResult> = {};

        // 1. Strict-Transport-Security
        const hsts = headers.get('strict-transport-security');
        if (hsts) {
            results['HSTS'] = { status: 'pass', message: 'HSTS is enabled.', details: hsts, score: 0 };
        } else {
            results['HSTS'] = {
                status: 'fail',
                message: 'Strict-Transport-Security header is missing.',
                score: 20,
                remediation: WebAnalyzers.generateRemediation('HSTS')
            };
        }

        // 2. Content-Security-Policy
        const csp = headers.get('content-security-policy');
        if (csp) {
            results['CSP'] = { status: 'pass', message: 'CSP is configured.', details: csp, score: 0 };
        } else {
            results['CSP'] = {
                status: 'warning',
                message: 'Content-Security-Policy header is missing.',
                score: 15,
                remediation: WebAnalyzers.generateRemediation('CSP')
            };
        }

        // 3. X-Frame-Options
        const xfo = headers.get('x-frame-options');
        if (xfo) {
            results['X-Frame'] = { status: 'pass', message: `X-Frame-Options is set to ${xfo}.`, score: 0 };
        } else {
            results['X-Frame'] = {
                status: 'fail',
                message: 'X-Frame-Options header is missing. Site may be vulnerable to Clickjacking.',
                score: 10,
                remediation: WebAnalyzers.generateRemediation('X-Frame')
            };
        }

        // 4. Server Leakage
        const server = headers.get('server');
        if (server) {
            results['Server'] = { status: 'info', message: `Server banner exposed: ${server}`, score: 5 };
        }

        return results;
    },

    /**
     * Analyze Cookies for Security Flags
     */
    analyzeCookies: (headers: Headers): AnalysisResult[] => {
        const results: AnalysisResult[] = [];
        const setCookie = headers.get('set-cookie');

        if (!setCookie) return results;

        // Simple split for multiple cookies (approximation)
        const cookies = setCookie.split(/,(?=\s*\w+=)/g);

        cookies.forEach(c => {
            const name = c.split('=')[0].trim();
            const flags: string[] = [];

            if (!c.toLowerCase().includes('secure')) flags.push('Missing Secure');
            if (!c.toLowerCase().includes('httponly')) flags.push('Missing HttpOnly');
            if (!c.toLowerCase().includes('samesite')) flags.push('Missing SameSite');

            if (flags.length > 0) {
                results.push({
                    status: 'warning',
                    message: `Cookie '${name}' is missing security flags: ${flags.join(', ')}`,
                    score: 5 * flags.length
                });
            } else {
                results.push({
                    status: 'pass',
                    message: `Cookie '${name}' is secure.`
                });
            }
        });

        return results;
    },

    /**
     * Simple Tech/CMS Detection based on Headers and Content
     */
    detectTech: async (url: string, headers: Headers, html: string): Promise<AnalysisResult[]> => {
        const results: AnalysisResult[] = [];
        const lowerHtml = html.toLowerCase();

        // 1. Detect CMS by Meta Generator
        if (lowerHtml.includes('content="wordpress')) {
            results.push({ status: 'info', message: 'CMS Detected: WordPress', details: 'Found meta generator tag' });
        } else if (lowerHtml.includes('content="drupal')) {
            results.push({ status: 'info', message: 'CMS Detected: Drupal', details: 'Found meta generator tag' });
        } else if (lowerHtml.includes('content="joomla')) {
            results.push({ status: 'info', message: 'CMS Detected: Joomla', details: 'Found meta generator tag' });
        }

        // 2. Detect JS Frameworks (Signatures)
        if (lowerHtml.includes('react') || lowerHtml.includes('_next')) {
            results.push({ status: 'info', message: 'Framework: React.js (Likely Next.js)', details: 'Found common scripts' });
        }
        if (lowerHtml.includes('vue')) {
            results.push({ status: 'info', message: 'Framework: Vue.js', details: 'Found common scripts' });
        }

        // 3. Detect Server from Header
        const server = headers.get('server');
        if (server) {
            results.push({ status: 'info', message: `Web Server: ${server}` });
        }

        // 4. Detect Powered-By
        const poweredBy = headers.get('x-powered-by');
        if (poweredBy) {
            results.push({ status: 'info', message: `Backend: ${poweredBy}` });
        }

        return results;
    },

    /**
     * Check Robots.txt
     */
    analyzeRobots: async (baseUrl: string): Promise<AnalysisResult | null> => {
        try {
            const res = await fetch(new URL('/robots.txt', baseUrl).toString());
            if (res.ok) {
                const text = await res.text();
                const disallows = text.split('\n').filter(l => l.trim().toLowerCase().startsWith('disallow:'));
                return {
                    status: disallows.length > 0 ? 'info' : 'warning',
                    message: `Found robots.txt with ${disallows.length} disallow rules.`,
                    details: disallows.slice(0, 5) // Preview first 5
                };
            }
            return { status: 'info', message: 'No robots.txt found.' };
        } catch (e) {
            return null;
        }
    }
};
