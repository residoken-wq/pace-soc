import { Building2 } from "lucide-react";
import { ProductPage } from "@/components/ProductPage";

export default function OrganizationPage() {
    return <ProductPage icon={Building2} eyebrow="Asset organization" title="Organization structure" description="A friendly GLPI-style model connecting companies, locations, departments, people, devices, contracts, and support responsibility." action="Add entity"
        metrics={[
            { label: "Organizations", value: 3, detail: "1 parent · 2 subsidiaries" },
            { label: "Locations", value: 8, detail: "Across 3 regions" },
            { label: "Departments", value: 14, detail: "All have an owner", tone: "green" },
            { label: "Asset coverage", value: "98%", detail: "2 assets unassigned", tone: "amber" },
        ]}
        sectionTitle="Organization map" sectionDescription="Browse ownership and responsibility without navigating a complex CMDB."
        items={[
            { title: "PACE Group", description: "Parent organization · 128 Ubuntu devices · 246 people", meta: "Global", status: "Active", tone: "green" },
            { title: "Engineering", description: "42 devices · Owner: Trần Minh · Support: Platform team", meta: "PACE Group", status: "Compliant", tone: "green" },
            { title: "Finance", description: "26 devices · Owner: Nguyễn An · 1 health warning", meta: "PACE Group", status: "Review", tone: "amber" },
            { title: "Operations", description: "31 devices · 1 unassigned kiosk · 1 offline device", meta: "PACE Group", status: "Action needed", tone: "red" },
        ]} />;
}
