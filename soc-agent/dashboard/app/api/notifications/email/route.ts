import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

// Settings file path
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

interface AlertEmailRequest {
    severity: string;
    attackType: string;
    description: string;
    agent: string;
    ip: string;
    timestamp: string;
    ruleId?: string;
    mitre?: string;
}

const SEVERITY_COLORS = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#2563eb'
};

function generateEmailHtml(alert: AlertEmailRequest): string {
    const color = SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] || '#64748b';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; }
        .header { background: ${color}; padding: 20px; text-align: center; }
        .header h1 { margin: 0; color: white; font-size: 24px; }
        .content { padding: 24px; }
        .field { margin-bottom: 16px; }
        .label { color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
        .value { color: #f1f5f9; font-size: 16px; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; background: ${color}; color: white; }
        .footer { padding: 16px 24px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px; }
        .mitre { background: #7c3aed; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Security Alert</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Severity</div>
                <span class="severity">${alert.severity}</span>
            </div>
            <div class="field">
                <div class="label">Attack Type</div>
                <div class="value">${alert.attackType}</div>
            </div>
            <div class="field">
                <div class="label">Description</div>
                <div class="value">${alert.description}</div>
            </div>
            <div class="field">
                <div class="label">Agent</div>
                <div class="value">${alert.agent} (${alert.ip})</div>
            </div>
            <div class="field">
                <div class="label">Timestamp</div>
                <div class="value">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>
            ${alert.ruleId ? `
            <div class="field">
                <div class="label">Rule ID</div>
                <div class="value">${alert.ruleId}</div>
            </div>
            ` : ''}
            ${alert.mitre ? `
            <div class="field">
                <div class="label">MITRE ATT&CK</div>
                <span class="mitre">${alert.mitre}</span>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            SOC Dashboard - Security Operations Center<br>
            This is an automated alert. Please review and take appropriate action.
        </div>
    </div>
</body>
</html>`;
}

export async function POST(request: Request) {
    try {
        const alert: AlertEmailRequest = await request.json();

        // Validate required fields
        if (!alert.severity || !alert.attackType || !alert.description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Load settings
        let smtpSettings: any = null;
        let recipients: string[] = [];

        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
            const settings = JSON.parse(data);
            // Check if email is enabled in settings
            if (!settings.notifications?.emailEnabled) {
                return NextResponse.json({ success: true, message: 'Email notifications disabled in settings' });
            }
            smtpSettings = settings.smtp;

            // Handle multiple recipients (split by comma if string)
            if (smtpSettings?.to) {
                recipients = smtpSettings.to.split(',').map((e: string) => e.trim()).filter(Boolean);
            }
        } catch (e) {
            console.warn('Could not load settings.json, falling back to env vars');
        }

        // Fallback to Environment Variables if no settings or missing fields
        const host = smtpSettings?.host || process.env.EMAIL_HOST || 'smtp.gmail.com';
        const port = smtpSettings?.port || parseInt(process.env.EMAIL_PORT || '587');
        const user = smtpSettings?.user || process.env.EMAIL_USER || '';
        const pass = smtpSettings?.password || process.env.EMAIL_PASS || '';
        const from = smtpSettings?.from || process.env.EMAIL_FROM || 'SOC Dashboard <soc@company.com>';

        if (recipients.length === 0) {
            const envRecipients = process.env.ALERT_RECIPIENTS || '';
            recipients = envRecipients.split(',').filter(Boolean);
        }

        // Check if email is configured
        if (!user || !pass || recipients.length === 0) {
            console.log('Email not configured, skipping notification');
            return NextResponse.json({
                success: false,
                message: 'Email not configured. Check Settings or Environment Variables.'
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            tls: { rejectUnauthorized: false }
        });

        // Generate email content
        const subjectPrefix = alert.severity === 'critical' ? '🚨 CRITICAL' :
            alert.severity === 'high' ? '⚠️ HIGH' : '📢';

        const mailOptions = {
            from,
            to: recipients.join(', '), // Nodemailer supports comma separated string
            subject: `${subjectPrefix} Security Alert: ${alert.attackType} on ${alert.agent}`,
            html: generateEmailHtml(alert)
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Email sent successfully' });

    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
