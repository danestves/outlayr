import { createContext, use, useState } from "react";
import type { ReactNode } from "react";
import { Skeleton } from "skullet/react";

import { DashboardContext } from "./dashboard";
import type { Dashboard } from "./dashboard";
import { sampleDashboard } from "./sample";

export function useSample() {
    const [sample] = useState(() => sampleDashboard(Date.now()));
    return sample;
}

const SampledContext = createContext(false);

/** True under a `Sampled` skeleton, for a card whose loading shape is not the shape of its sample. */
export const useSampled = () => use(SampledContext);

interface SampledProps {
    children: ReactNode;
    label?: string;
    sample: Dashboard;
}

export function Sampled({ children, label, sample }: SampledProps) {
    return (
        <Skeleton label={label} loading>
            <SampledContext value>
                <DashboardContext value={sample}>{children}</DashboardContext>
            </SampledContext>
        </Skeleton>
    );
}
