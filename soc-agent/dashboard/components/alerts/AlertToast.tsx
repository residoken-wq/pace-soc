"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Shield, Skull, UserX, FileWarning, Key } from 'lucide-react';
import { clsx } from 'clsx';

export interface SecurityAlert {
    id: string;
    timestamp: string;
    rule: {
        id: string;
        level: number;
        description: string;
        mitre?: { id: string; tactic: string }[];
    };
    agent: {
        id: string;
        name: string;
        ip: string;
    };
    srcIp?: string;  // Source/Attacker IP
    attackType: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

interface AlertToastProps {
    alert: SecurityAlert;
    onDismiss: (id: string) => void;
    autoHide?: number; // milliseconds
}

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-900/90 border-red-500',
        icon: 'text-red-400',
        pulse: 'animate-pulse'
    },
    high: {
        bg: 'bg-orange-900/90 border-orange-500',
        icon: 'text-orange-400',
        pulse: ''
    },
    medium: {
        bg: 'bg-yellow-900/90 border-yellow-500',
        icon: 'text-yellow-400',
        pulse: ''
    },
    low: {
        bg: 'bg-blue-900/90 border-blue-500',
        icon: 'text-blue-400',
        pulse: ''
    }
};

const ATTACK_ICONS: Record<string, React.ReactNode> = {
    'Brute-force Attack': <Key className="w-5 h-5" />,
    'DDoS Attack': <Skull className="w-5 h-5" />,
    'Abnormal Login': <UserX className="w-5 h-5" />,
    'Malicious File Activity': <FileWarning className="w-5 h-5" />,
    'Privilege Escalation': <Shield className="w-5 h-5" />,
};

export function AlertToast({ alert, onDismiss, autoHide = 10000 }: AlertToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (autoHide > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, autoHide);
            return () => clearTimeout(timer);
        }
    }, [autoHide]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            onDismiss(alert.id);
        }, 300);
    };

    if (!isVisible) return null;

    const styles = SEVERITY_STYLES[alert.severity];
    const icon = ATTACK_ICONS[alert.attackType] || <AlertTriangle className="w-5 h-5" />;

    return (
        <div
            className={clsx(
                'relative flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-xl backdrop-blur-sm transition-all duration-300',
                styles.bg,
                isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0',
                styles.pulse
            )}
        >
            <div className={clsx('shrink-0 mt-0.5', styles.icon)}>
                {icon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={clsx(
                        'px-2 py-0.5 rounded text-xs font-bold uppercase',
                        alert.severity === 'critical' && 'bg-red-500 text-white',
                        alert.severity === 'high' && 'bg-orange-500 text-white',
                        alert.severity === 'medium' && 'bg-yellow-500 text-black',
                        alert.severity === 'low' && 'bg-blue-500 text-white'
                    )}>
                        {alert.severity}
                    </span>
                    <span className="text-sm font-semibold text-white">{alert.attackType}</span>
                </div>

                <p className="text-sm text-slate-200 line-clamp-2">{alert.rule.description}</p>

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Agent: {alert.agent.name}</span>
                    {alert.srcIp && alert.srcIp !== '-' && (
                        <span className="text-amber-400 font-mono">⚡ {alert.srcIp}</span>
                    )}
                    {alert.rule.mitre?.[0] && (
                        <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded">
                            {alert.rule.mitre[0].id}
                        </span>
                    )}
                </div>
            </div>

            <button
                onClick={handleDismiss}
                className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
            >
                <X className="w-4 h-4 text-slate-400" />
            </button>
        </div>
    );
}

// Container for multiple toasts
interface AlertToastContainerProps {
    alerts: SecurityAlert[];
    onDismiss: (id: string) => void;
    maxVisible?: number;
}

export function AlertToastContainer({ alerts, onDismiss, maxVisible = 5 }: AlertToastContainerProps) {
    const visibleAlerts = alerts.slice(0, maxVisible);

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-96 max-w-[calc(100vw-2rem)]">
            {visibleAlerts.map(alert => (
                <AlertToast
                    key={alert.id}
                    alert={alert}
                    onDismiss={onDismiss}
                />
            ))}
            {alerts.length > maxVisible && (
                <div className="text-center text-sm text-slate-400 bg-slate-800/80 py-2 rounded-lg">
                    +{alerts.length - maxVisible} more alerts
                </div>
            )}
        </div>
    );
}
