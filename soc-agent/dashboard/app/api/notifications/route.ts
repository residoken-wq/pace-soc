import { NextResponse } from 'next/server';

interface NotificationPayload {
    type: 'email' | 'slack' | 'webhook';
    subject?: string;
    message: string;
    severity?: 'critical' | 'warning' | 'info';
    alertId?: string;
    webhookUrl?: string;
}

export async function POST(request: Request) {
    try {
        const body: NotificationPayload = await request.json();
        const { type, subject, message, severity, alertId } = body;

        // Get settings (in production, load from database/file)
        const settingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/settings`);
        const settingsData = await settingsRes.json();
        const settings = settingsData.settings || {};

        if (type === 'slack' && settings.notifications?.slackEnabled) {
            const webhookUrl = settings.notifications?.webhookUrl;
            if (webhookUrl) {
                const color = severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#f59e0b' : '#3b82f6';

                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attachments: [{
                            color,
                            title: subject || 'SOC Alert',
                            text: message,
                            footer: `SOC Manager | Alert ID: ${alertId || 'N/A'}`,
                            ts: Math.floor(Date.now() / 1000)
                        }]
                    })
                });

                return NextResponse.json({
                    success: true,
                    message: 'Slack notification sent'
                });
            }
        }

        if (type === 'email' && settings.notifications?.emailEnabled) {
            // In production, integrate with email service (SendGrid, AWS SES, etc.)
            // For now, just log
            console.log('Email notification:', { subject, message, severity });

            return NextResponse.json({
                success: true,
                message: 'Email notification queued (not configured)'
            });
        }

        if (type === 'webhook') {
            const webhookUrl = body.webhookUrl || settings.notifications?.webhookUrl;
            if (webhookUrl) {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'soc_alert',
                        timestamp: new Date().toISOString(),
                        severity,
                        subject,
                        message,
                        alertId
                    })
                });

                return NextResponse.json({
                    success: true,
                    message: 'Webhook notification sent'
                });
            }
        }

        return NextResponse.json({
            success: false,
            message: 'Notification type not configured or enabled'
        });

    } catch (error: any) {
        console.error('Notification Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Test notification endpoint
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Notification API ready',
        supportedTypes: ['email', 'slack', 'webhook'],
        usage: {
            endpoint: 'POST /api/notifications',
            body: {
                type: 'slack | email | webhook',
                subject: 'Alert Title',
                message: 'Alert message content',
                severity: 'critical | warning | info',
                alertId: 'optional-alert-id'
            }
        }
    });
}
