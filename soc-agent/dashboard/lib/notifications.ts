// Notification utilities for browser and email alerts

export interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('Browser notifications not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

// Show browser notification
export function showBrowserNotification(options: NotificationOptions): Notification | null {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return null;
    }

    const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-shield.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
    });

    if (options.onClick) {
        notification.onclick = () => {
            window.focus();
            options.onClick?.();
            notification.close();
        };
    }

    return notification;
}

// Play alert sound
export function playAlertSound(type: 'critical' | 'high' | 'medium' = 'high') {
    // Create audio context for alert sound
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different frequencies for different severity
        switch (type) {
            case 'critical':
                oscillator.frequency.value = 880; // A5
                oscillator.type = 'square';
                break;
            case 'high':
                oscillator.frequency.value = 660; // E5
                oscillator.type = 'sawtooth';
                break;
            default:
                oscillator.frequency.value = 440; // A4
                oscillator.type = 'sine';
        }

        gainNode.gain.value = 0.1;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio not available');
    }
}

// Send email alert via API
export async function sendEmailAlert(alert: {
    severity: string;
    attackType: string;
    description: string;
    agent: string;
    ip: string;
    timestamp: string;
}): Promise<boolean> {
    try {
        const response = await fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
        });
        return response.ok;
    } catch (e) {
        console.error('Failed to send email alert:', e);
        return false;
    }
}

// Format alert for notification
export function formatAlertNotification(alert: {
    severity: string;
    attackType: string;
    rule: { description: string };
    agent: { name: string; ip: string };
}): NotificationOptions {
    const severityEmoji = {
        critical: '🚨',
        high: '⚠️',
        medium: '📢',
        low: 'ℹ️'
    }[alert.severity] || '🔔';

    return {
        title: `${severityEmoji} ${alert.attackType}`,
        body: `${alert.rule.description}\nAgent: ${alert.agent.name} (${alert.agent.ip})`,
        requireInteraction: alert.severity === 'critical',
        tag: `alert-${Date.now()}`
    };
}
