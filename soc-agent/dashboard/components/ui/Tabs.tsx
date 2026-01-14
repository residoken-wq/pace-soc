"use client";

import React, { useState } from 'react';
import { clsx } from 'clsx';

export interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

export interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={clsx('flex gap-1 p-1 bg-slate-800/50 rounded-lg', className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={clsx(
                        'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                        activeTab === tab.id
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    )}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={clsx(
                            'px-1.5 py-0.5 rounded text-xs',
                            activeTab === tab.id ? 'bg-slate-600' : 'bg-slate-700'
                        )}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// Simple tab panel wrapper
export interface TabPanelProps {
    children: React.ReactNode;
    activeTab: string;
    tabId: string;
}

export function TabPanel({ children, activeTab, tabId }: TabPanelProps) {
    if (activeTab !== tabId) return null;
    return <div>{children}</div>;
}
