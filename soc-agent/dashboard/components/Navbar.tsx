"use client";

import React, { useEffect, useState } from "react";
import {
    Activity, Bell, BookOpen, Building2, ChevronDown, FileText, HeartPulse,
    LayoutDashboard, LogOut, Menu, Network, PackageSearch, Radar, ScrollText,
    Settings, Shield, ShieldAlert, Siren, SlidersHorizontal, User, Wrench, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const sections = [
    {
        label: "Command center",
        items: [
            { href: "/", label: "Overview", icon: LayoutDashboard },
            { href: "/alerts", label: "Alert queue", icon: Bell },
        ],
    },
    {
        label: "Fleet & assets",
        items: [
            { href: "/devices", label: "Ubuntu devices", icon: PackageSearch },
            { href: "/health", label: "Hardware health", icon: HeartPulse },
            { href: "/organization", label: "Organization", icon: Building2 },
        ],
    },
    {
        label: "Security operations",
        items: [
            { href: "/ransomware", label: "Ransomware defense", icon: Siren },
            { href: "/threats", label: "Network detection", icon: Radar },
            { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
            { href: "/mitre", label: "MITRE coverage", icon: Shield },
            { href: "/logs", label: "Event explorer", icon: ScrollText },
        ],
    },
    {
        label: "Administration",
        items: [
            { href: "/rules", label: "Detection rules", icon: SlidersHorizontal },
            { href: "/reports", label: "Reports", icon: FileText },
            { href: "/tools", label: "Response tools", icon: Wrench },
            { href: "/settings", label: "Settings", icon: Settings },
            { href: "/guide", label: "Documentation", icon: BookOpen },
        ],
    },
];

export default function Navbar() {
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const cookie = document.cookie.split(";").find(c => c.trim().startsWith("soc_auth="));
        if (!cookie) return;
        try {
            const payload = JSON.parse(atob(cookie.split("=")[1].split(".")[1]));
            setUser({ name: payload.name, role: payload.role });
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => setMobileOpen(false), [pathname]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        document.cookie = "soc_auth=; Max-Age=0; path=/";
        router.push("/login");
        router.refresh();
    };

    return (
        <>
            <header className="lg:hidden sticky top-0 z-50 h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 backdrop-blur">
                <Brand compact />
                <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg border border-slate-700 text-slate-300" aria-label="Open navigation">
                    <Menu className="w-5 h-5" />
                </button>
            </header>

            {mobileOpen && <button className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

            <aside className={`soc-sidebar fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-950 flex flex-col transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="h-20 px-5 flex items-center justify-between border-b border-slate-800/80">
                    <Brand />
                    <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400 lg:hidden" aria-label="Close navigation"><X className="w-5 h-5" /></button>
                </div>

                <div className="px-4 pt-4">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Platform operational
                        </div>
                        <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                    {sections.map(section => (
                        <div key={section.label}>
                            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{section.label}</p>
                            <div className="space-y-0.5">
                                {section.items.map(item => {
                                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                                    const Icon = item.icon;
                                    return (
                                        <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent"}`}>
                                            <Icon className="w-4 h-4 shrink-0" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-800">
                    {user ? (
                        <div className="relative">
                            <button onClick={() => setProfileOpen(!profileOpen)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900 text-left">
                                <span className="w-9 h-9 grid place-items-center rounded-lg bg-slate-800 text-slate-300"><User className="w-4 h-4" /></span>
                                <span className="min-w-0 flex-1"><span className="block text-sm text-slate-200 truncate">{user.name}</span><span className="block text-xs text-slate-500 capitalize">{user.role}</span></span>
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                            </button>
                            {profileOpen && <button onClick={handleLogout} className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10"><LogOut className="w-4 h-4" />Sign out</button>}
                        </div>
                    ) : <div className="px-3 py-2 text-xs text-slate-600">Secure session</div>}
                </div>
            </aside>
        </>
    );
}

function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <Link href="/" className="flex items-center gap-3">
            <span className="w-9 h-9 grid place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-950"><Network className="w-5 h-5 text-slate-950" /></span>
            <span><span className="block text-sm font-bold text-slate-100 tracking-wide">PACE Sentinel</span>{!compact && <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Ubuntu operations</span>}</span>
        </Link>
    );
}
