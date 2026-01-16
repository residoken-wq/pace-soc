import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Use provided settings (for testing unsaved changes) or load from file
        let settings = body.settings;

        if (!settings) {
            // Load saved settings if not provided in body
            try {
                const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
                const savedSettings = JSON.parse(data);
                settings = savedSettings.smtp;
            } catch (error) {
                return NextResponse.json({ success: false, error: 'No settings found' }, { status: 400 });
            }
        }

        if (!settings || !settings.host || !settings.user) {
            return NextResponse.json({ success: false, error: 'Invalid SMTP settings' }, { status: 400 });
        }

        const to = body.to || settings.to;
        const subject = 'SOC Dashboard: Test Email';
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #10b981;">SOC Dashboard Test</h2>
                <p>This is a test email from your Wazuh SOC Dashboard.</p>
                <p><strong>SMTP Host:</strong> ${settings.host}</p>
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
                <br/>
                <p style="color: #666; font-size: 12px;">If you received this, your email configuration is working correctly.</p>
            </div>
        `;

        const result = await sendEmail(settings, to, subject, html);

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Email sent successfully!' });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
