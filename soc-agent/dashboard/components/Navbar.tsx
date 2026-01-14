
"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Settings, Bell, Network, FileText, BarChart3, Book, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
    const [showLogout, setShowLogout] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Try to get user info from cookie (decoded from JWT)
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith('soc_auth='));
        if (cookie) {
            try {
                const token = cookie.split('=')[1];
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ username: payload.username, name: payload.name, role: payload.role });
            } catch {
                setUser(null);
            }
        }
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            document.cookie = 'soc_auth=; Max-Age=0; path=/';
            router.push('/login');
            router.refresh();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-4 group">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                            <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                SOC Manager
                            </h1>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        <NavLink href="/" label="Overview" />
                        <NavLink href="/alerts" label="Alerts" icon={<Bell className="w-4 h-4" />} />
                        <NavLink href="/rules" label="Rules" icon={<FileText className="w-4 h-4" />} />
                        <NavLink href="/mitre" label="MITRE" icon={<Shield className="w-4 h-4" />} />
                        <NavLink href="/vulnerabilities" label="Vulns" icon={<Shield className="w-4 h-4" />} />
                        <NavLink href="/logs" label="Logs" icon={<FileText className="w-4 h-4" />} />
                        <NavLink href="/reports" label="Reports" icon={<BarChart3 className="w-4 h-4" />} />
                        <NavLink href="/tools" label="Tools" icon={<Network className="w-4 h-4" />} />
                        <NavLink href="/guide" label="Guide" icon={<Book className="w-4 h-4" />} />
                        <NavLink href="/settings" label="Settings" icon={<Settings className="w-4 h-4" />} />
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        System Active
                    </span>

                    {user && (
                        <div className="relative">
                            <button
                                onClick={() => setShowLogout(!showLogout)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                            >
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">{user.name}</span>
                            </button>

                            {showLogout && (
                                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
                                    <div className="px-4 py-2 border-b border-slate-700">
                                        <div className="text-sm text-slate-200">{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.role}</div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
    return (
        <Link href={href} className="px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium flex items-center gap-2">
            {icon}
            {label}
        </Link>
    )
}

