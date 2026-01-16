const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');

// Configuration
const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const SETTINGS_FILE = path.join(DASHBOARD_ROOT, 'data', 'settings.json');
const ENV_FILE = path.join(DASHBOARD_ROOT, '.env.local');

// Wazuh Indexer Defaults
let WAZUH_INDEXER_URL = 'https://127.0.0.1:9200';
let WAZUH_INDEXER_USER = 'admin';
let WAZUH_INDEXER_PASSWORD = 'admin'; // Default fallback

// Try to read .env.local for credentials (simple parsing)
if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
            if (key.trim() === 'WAZUH_INDEXER_URL') WAZUH_INDEXER_URL = cleanValue;
            if (key.trim() === 'WAZUH_INDEXER_USER') WAZUH_INDEXER_USER = cleanValue;
            if (key.trim() === 'WAZUH_INDEXER_PASSWORD') WAZUH_INDEXER_PASSWORD = cleanValue;
            if (key.trim() === 'WAZUH_API_PASSWORD' && !process.env.WAZUH_INDEXER_PASSWORD) WAZUH_INDEXER_PASSWORD = cleanValue;
        }
    });
}

// Allow self-signed certs
const agent = new https.Agent({
    rejectUnauthorized: false
});

async function main() {
    try {
        // 1. Load Settings
        if (!fs.existsSync(SETTINGS_FILE)) {
            console.error('Settings file not found:', SETTINGS_FILE);
            process.exit(1);
        }
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));

        if (!settings.notifications?.emailEnabled) {
            console.log('Email notifications are disabled in settings.');
            process.exit(0);
        }

        const smtp = settings.smtp;
        if (!smtp || !smtp.host) {
            console.error('SMTP settings are missing.');
            process.exit(1);
        }

        // 2. Query Wazuh Indexer for recent High Severity Alerts
        const minutes = 10;
        const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();

        const query = {
            size: 20,
            sort: [{ '@timestamp': 'desc' }],
            query: {
                bool: {
                    must: [
                        { range: { '@timestamp': { gte: `now-${minutes}m` } } },
                        { range: { 'rule.level': { gte: 10 } } } // High severity threshold
                    ]
                }
            }
        };

        const response = await fetch(`${WAZUH_INDEXER_URL}/wazuh-alerts-*/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64')
            },
            body: JSON.stringify(query),
            agent // Node 18+ fetch sometimes needs custom agent for SSL? 
            // Actually native fetch might strictly enforce SSL. 
            // We need to disable global SSL check or use httpsAgent.
        });

        // Native fetch in Node may not support 'agent' option directly depending on version,
        // but let's try setting process env globally for this script.
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        if (!response.ok) {
            throw new Error(`Indexer responded with ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        if (hits.length === 0) {
            console.log('No high severity alerts found in the last', minutes, 'minutes.');
            return;
        }

        console.log(`Found ${hits.length} high severity alerts.`);

        // 3. Send Email
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: {
                user: smtp.user,
                pass: smtp.password,
            },
            tls: { rejectUnauthorized: false }
        });

        // Build HTML Body
        const alertsHtml = hits.map(hit => {
            const src = hit._source;
            return `
                <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #ef4444; background: #fef2f2;">
                    <div style="font-weight: bold; color: #b91c1c;">${src.rule?.description || 'Unknown Alert'}</div>
                    <div style="font-size: 12px; color: #666;">
                        Level: ${src.rule?.level} | Agent: ${src.agent?.name} (${src.agent?.ip}) | srcIp: ${src.data?.srcip || '-'}
                    </div>
                    <div style="font-size: 12px; color: #444; margin-top: 4px;">${src.full_log || ''}</div>
                    <div style="font-size: 10px; color: #888;">${src['@timestamp']}</div>
                </div>
            `;
        }).join('');

        const html = `
            <h2>⚠️ SOC Security Alert (${hits.length})</h2>
            <p>High severity events detected in the last ${minutes} minutes:</p>
            ${alertsHtml}
            <br>
            <p><a href="${settings.wazuh?.managerUrl || '#'}">Open SOC Dashboard</a></p>
        `;

        const info = await transporter.sendMail({
            from: smtp.from,
            to: smtp.to,
            subject: `[SOC] ${hits.length} High Severity Alerts Detected`,
            html: html
        });

        console.log('Alert email sent:', info.messageId);

    } catch (error) {
        console.error('Error in mail-alert script:', error);
        process.exit(1);
    }
}

main();
