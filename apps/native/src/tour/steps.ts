import type { TranslatableKey } from "@/i18n/catalog";

import type { TourSlotId } from "./tour-geometry";
import type { TourId } from "./tour-state";

export type TourStepTarget = { id: string; kind: "registered" } | { kind: "slot"; slot: TourSlotId };

export interface TourStep {
    copy: TranslatableKey;
    id: string;
    target: TourStepTarget;
}

export const LOG_STEPS: readonly TourStep[] = [
    { copy: "tour.log.add", id: "add", target: { id: "log.add", kind: "registered" } },
    { copy: "tour.log.search", id: "search", target: { kind: "slot", slot: "log.search" } },
    { copy: "tour.log.profiles", id: "profiles", target: { id: "log.profiles", kind: "registered" } },
];

export const SPOTLIGHT_STEPS: Record<Exclude<TourId, "log">, TourStep> = {
    balances: { copy: "tour.balances", id: "balances", target: { kind: "slot", slot: "balances.add" } },
    insights: { copy: "tour.insights", id: "insights", target: { id: "insights.everything", kind: "registered" } },
    settings: { copy: "tour.settings", id: "settings", target: { id: "settings.integrations", kind: "registered" } },
    subscriptions: {
        copy: "tour.subscriptions",
        id: "subscriptions",
        target: { id: "log.subscriptions", kind: "registered" },
    },
};

export function stepsFor(tour: TourId): readonly TourStep[] {
    return tour === "log" ? LOG_STEPS : [SPOTLIGHT_STEPS[tour]];
}
