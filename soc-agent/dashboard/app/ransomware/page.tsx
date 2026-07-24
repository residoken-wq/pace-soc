import { Siren } from "lucide-react";
import { ProductPage } from "@/components/ProductPage";

export default function RansomwarePage() {
    return <ProductPage icon={Siren} eyebrow="Minimal-resource XDR" title="Ransomware defense" description="Correlate endpoint behavior, file activity, identity signals, and network anomalies while keeping the Ubuntu agent lightweight." action="Start investigation"
        metrics={[
            { label: "Protection status", value: "Active", detail: "128 of 128 protected", tone: "green" },
            { label: "Open incidents", value: 1, detail: "Medium confidence", tone: "amber" },
            { label: "Blocked actions", value: 18, detail: "Last 30 days", tone: "green" },
            { label: "Agent overhead", value: "0.8%", detail: "Fleet median CPU" },
        ]}
        sectionTitle="Detection storyline" sectionDescription="Related NDR and XDR signals are grouped into one incident instead of separate noisy alerts."
        items={[
            { title: "Unusual bulk file rename sequence", description: "design-ws-019 · 864 files changed by an unsigned process.", meta: "3 signals · 4m", status: "Investigate", tone: "amber" },
            { title: "Known ransomware canary touched", description: "lab-ws-004 · Process isolated before encryption spread.", meta: "7 signals · 3d", status: "Contained", tone: "green" },
            { title: "SMB enumeration burst", description: "ops-ws-012 · Lateral discovery behavior blocked at endpoint.", meta: "4 signals · 8d", status: "Contained", tone: "green" },
            { title: "Backup service stopped", description: "finance-ws-014 · Authorized maintenance matched change window.", meta: "2 signals · 12d", status: "Benign", tone: "blue" },
        ]} />;
}
