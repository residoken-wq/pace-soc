"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Activity, Shield, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { SecurityAlert, AlertToastContainer } from './AlertToast';

interface LiveAttackFeedProps {
    className?: string;
    maxItems?: number;
    showToasts?: boolean;
}

export function LiveAttackFeed({ className, maxItems = 20, showToasts = true }: LiveAttackFeedProps) {
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [newAlerts, setNewAlerts] = useState<SecurityAlert[]>([]); // For toast notifications
    const [isConnected, setIsConnected] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [lastHeartbeat, setLastHeartbeat] = useState<string>('');
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Connect to SSE stream
        const connect = () => {
            eventSourceRef.current = new EventSource('/api/alerts/stream');

            eventSourceRef.current.onopen = () => {
                setIsConnected(true);
                console.log('Alert stream connected');
            };

            eventSourceRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'connected') {
                        setIsConnected(true);
                    } else if (data.type === 'heartbeat') {
                        setLastHeartbeat(data.time);
                    } else if (data.type === 'initial') {
                        // Handle initial batch of alerts
                        const initialAlerts: SecurityAlert[] = data.alerts || [];
                        setAlerts(initialAlerts.slice(0, maxItems));
                    } else if (data.type === 'alert') {
                        const alert: SecurityAlert = data.alert;

                        // Add to feed (newest first)
                        setAlerts(prev => {
                            const exists = prev.some(a => a.id === alert.id);
                            if (exists) return prev;
                            return [alert, ...prev].slice(0, maxItems);
                        });

                        // Add to toast queue if severity is high enough
                        if (showToasts && (alert.severity === 'critical' || alert.severity === 'high')) {
                            setNewAlerts(prev => [...prev, alert]);

                            // Browser notification
                            if (Notification.permission === 'granted') {
                                new Notification(`🚨 ${alert.attackType}`, {
                                    body: `${alert.rule.description}\nAgent: ${alert.agent.name}`,
                                    icon: '/icon-alert.png',
                                    tag: alert.id
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            };

            eventSourceRef.current.onerror = () => {
                setIsConnected(false);
                // Reconnect after 5 seconds
                setTimeout(connect, 5000);
            };
        };

        connect();

        // Request notification permission
        if (showToasts && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            eventSourceRef.current?.close();
        };
    }, [maxItems, showToasts]);

    const handleDismissToast = (id: string) => {
        setNewAlerts(prev => prev.filter(a => a.id !== id));
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-400 bg-red-500/20';
            case 'high': return 'text-orange-400 bg-orange-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20';
            default: return 'text-blue-400 bg-blue-500/20';
        }
    };

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;

    return (
        <>
            {/* Toast Container */}
            {showToasts && (
                <AlertToastContainer alerts={newAlerts} onDismiss={handleDismissToast} />
            )}

            {/* Live Feed Widget */}
            <div className={clsx('bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden', className)}>
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800/30"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            'w-2 h-2 rounded-full',
                            isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                        )} />
                        <Activity className="w-5 h-5 text-emerald-400" />
                        <span className="font-semibold text-slate-200">Live Attack Feed</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {criticalCount > 0 && (
                            <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded animate-pulse">
                                {criticalCount} CRITICAL
                            </span>
                        )}
                        {highCount > 0 && (
                            <span className="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded">
                                {highCount} HIGH
                            </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                </div>

                {/* Feed Content */}
                {isExpanded && (
                    <div className="max-h-80 overflow-y-auto">
                        {alerts.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Monitoring for security threats...</p>
                                <p className="text-xs mt-1">High priority alerts will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="p-3 hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={clsx('mt-1 p-1.5 rounded', getSeverityColor(alert.severity))}>
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={clsx(
                                                        'text-xs font-bold uppercase px-1.5 py-0.5 rounded',
                                                        getSeverityColor(alert.severity)
                                                    )}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-200">{alert.attackType}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-1">{alert.rule.description}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <span>{alert.agent.name}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
