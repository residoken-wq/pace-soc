import { HeartPulse } from "lucide-react";
import { ProductPage } from "@/components/ProductPage";

export default function HealthPage() {
    return <ProductPage icon={HeartPulse} eyebrow="Predictive diagnostics" title="Hardware health" description="Detect degradation early using SMART, thermal, memory, battery, and kernel telemetry—before hardware failure interrupts work." action="Run fleet check"
        metrics={[
            { label: "Fleet health", value: "94%", detail: "Stable over 7 days", tone: "green" },
            { label: "Early warnings", value: 7, detail: "2 require action today", tone: "amber" },
            { label: "Critical faults", value: 1, detail: "NVMe media errors", tone: "red" },
            { label: "Checks today", value: "31.4k", detail: "Lightweight local probes" },
        ]}
        sectionTitle="Predictive warnings" sectionDescription="Signals are correlated over time to avoid noisy single-sample alerts."
        items={[
            { title: "NVMe wear accelerating", description: "design-ws-011 · Media errors increased 4× in 72 hours.", meta: "Confidence 96%", status: "Replace soon", tone: "red" },
            { title: "Battery capacity degraded", description: "sales-ws-032 · Full-charge capacity is now 58% of design.", meta: "Confidence 91%", status: "Plan service", tone: "amber" },
            { title: "Memory pressure pattern", description: "eng-ws-041 · Repeated OOM events during normal workload.", meta: "Confidence 84%", status: "Diagnose", tone: "amber" },
            { title: "Thermal baseline recovered", description: "finance-ws-008 · CPU temperature returned to normal.", meta: "Observed 2h ago", status: "Resolved", tone: "green" },
        ]} />;
}
