import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Settings file path - in production, use a database
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

interface Settings {
    alertThresholds: {
        cpuWarning: number;
        diskCritical: number;
        memoryWarning: number;
    };
    services: {
        wazuhAgent: boolean;
        promtail: boolean;
        nodeExporter: boolean;
    };
    wazuh: {
        managerUrl: string;
        apiUser: string;
        // Password is not returned in GET for security
    };
    notifications: {
        emailEnabled: boolean;
        slackEnabled: boolean;
        webhookUrl: string;
    };
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
        from: string;
        to: string;
    };
    ai?: {
        enabled: boolean;
        provider: 'gemini';
        apiKey: string;
        model: string;
    };
}

const defaultSettings: Settings = {
    alertThresholds: {
        cpuWarning: 80,
        diskCritical: 90,
        memoryWarning: 85
    },
    services: {
        wazuhAgent: true,
        promtail: true,
        nodeExporter: true
    },
    wazuh: {
        managerUrl: 'https://192.168.1.206:55000',
        apiUser: 'wazuh-wui'
    },
    notifications: {
        emailEnabled: false,
        slackEnabled: false,
        webhookUrl: ''
    },
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        password: '',
        from: 'SOC Alert <soc@example.com>',
        to: 'admin@example.com'
    },
    ai: {
        enabled: false,
        provider: 'gemini',
        apiKey: '',
        model: 'gemini-1.5-flash'
    }
};

async function getSettings(): Promise<Settings> {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        return { ...defaultSettings, ...JSON.parse(data) };
    } catch (error) {
        // File doesn't exist, return defaults
        return defaultSettings;
    }
}

async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2));
    return updated;
}

export async function GET() {
    try {
        const settings = await getSettings();
        return NextResponse.json({
            success: true,
            settings
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            settings: defaultSettings
        });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { settings } = body;

        if (!settings) {
            return NextResponse.json({
                success: false,
                error: 'No settings provided'
            }, { status: 400 });
        }

        const updated = await saveSettings(settings);
        return NextResponse.json({
            success: true,
            message: 'Settings saved successfully',
            settings: updated
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
