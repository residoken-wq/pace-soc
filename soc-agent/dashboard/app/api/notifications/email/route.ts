import { promises as fs } from 'fs';
import path from 'path';

// Settings file path
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// ... (keep interface and helper functions)

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
