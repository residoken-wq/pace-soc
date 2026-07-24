import React from "react";
import Navbar from "@/components/Navbar";
import { LucideIcon } from "lucide-react";

export type Metric = { label: string; value: string | number; detail: string; tone?: "green" | "amber" | "red" | "blue" };
export type WorkItem = { title: string; description: string; meta: string; status: string; tone?: "green" | "amber" | "red" | "blue" };

const tones = {
    green: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    red: "text-red-300 bg-red-500/10 border-red-500/20",
    blue: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
};

export function ProductPage({ icon: Icon, eyebrow, title, description, metrics, sectionTitle, sectionDescription, items, action }: {
    icon: LucideIcon; eyebrow: string; title: string; description: string; metrics: Metric[];
    sectionTitle: string; sectionDescription: string; items: WorkItem[]; action: string;
}) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Navbar />
            <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-7">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400 mb-3"><Icon className="w-4 h-4" />{eyebrow}</div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
                        <p className="mt-2 text-slate-400 leading-6">{description}</p>
                    </div>
                    <button className="shrink-0 px-4 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-sm font-semibold">{action}</button>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {metrics.map(metric => (
                        <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
                            <p className="text-xs text-slate-500">{metric.label}</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-100">{metric.value}</p>
                            <p className={`mt-2 text-xs ${metric.tone === "red" ? "text-red-400" : metric.tone === "amber" ? "text-amber-400" : "text-slate-500"}`}>{metric.detail}</p>
                        </div>
                    ))}
                </div>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-800">
                        <h2 className="text-lg font-semibold text-slate-100">{sectionTitle}</h2>
                        <p className="text-sm text-slate-500 mt-1">{sectionDescription}</p>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {items.map(item => (
                            <div key={item.title} className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-slate-200">{item.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                </div>
                                <span className="text-xs text-slate-500 sm:w-36">{item.meta}</span>
                                <span className={`w-fit px-2.5 py-1 rounded-full border text-xs ${tones[item.tone || "blue"]}`}>{item.status}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
