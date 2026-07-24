import { MonitorSmartphone } from "lucide-react";
import { ProductPage } from "@/components/ProductPage";

export default function DevicesPage() {
    return <ProductPage icon={MonitorSmartphone} eyebrow="Fleet & assets" title="Ubuntu device fleet" description="One inventory for every managed Ubuntu Desktop endpoint, with ownership, lifecycle, compliance, and live agent status." action="Enroll device"
        metrics={[
            { label: "Managed devices", value: 128, detail: "+6 this month" },
            { label: "Online now", value: 119, detail: "93% fleet availability", tone: "green" },
            { label: "Needs attention", value: 7, detail: "3 high priority", tone: "amber" },
            { label: "Unassigned", value: 2, detail: "Awaiting ownership", tone: "blue" },
        ]}
        sectionTitle="Device inventory" sectionDescription="Priority view of assets requiring an operator decision."
        items={[
            { title: "finance-ws-024", description: "Ubuntu 24.04 LTS · Dell Latitude 5440 · Nguyễn An", meta: "Finance / Bangkok", status: "Healthy", tone: "green" },
            { title: "design-ws-011", description: "Ubuntu 22.04 LTS · ThinkPad P1 · Lê Mai", meta: "Creative / HCMC", status: "Disk warning", tone: "amber" },
            { title: "ops-kiosk-003", description: "Ubuntu 22.04 LTS · Intel NUC · Unassigned", meta: "Operations / Hanoi", status: "Offline", tone: "red" },
            { title: "eng-ws-087", description: "Ubuntu 24.04 LTS · Framework 13 · Trần Minh", meta: "Engineering / Remote", status: "Healthy", tone: "green" },
        ]} />;
}
