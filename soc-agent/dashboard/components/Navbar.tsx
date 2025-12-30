
import React from 'react';
import { Shield, Settings, Bell, Network, FileText, BarChart3, Book } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
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
