import { useState } from "react";
import type { ReactNode } from "react";
import { Skeleton } from "skullet/react";

import { DashboardContext } from "./dashboard";
import type { Dashboard } from "./dashboard";
import { sampleDashboard } from "./sample";

export function useSample() {
    const [sample] = useState(() => sampleDashboard(Date.now()));
    return sample;
}

interface SampledProps {
    children: ReactNode;
    label?: string;
    sample: Dashboard;
}

export function Sampled({ children, label, sample }: SampledProps) {
    return (
        <Skeleton label={label} loading>
            <DashboardContext value={sample}>{children}</DashboardContext>
        </Skeleton>
    );
}
