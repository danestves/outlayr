import { AUTOLOG_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";

import { posthog } from "@/lib/posthog";

export type AutologTrigger = "notification_access" | "bank_texts" | "wallet_shortcut" | "bank_shortcut";

export type AutologSurface = "onboarding" | "settings";

type AutologSetup =
    | { outcome: "started" | "denied" | "skipped" | "granted"; surface: AutologSurface; trigger: AutologTrigger }
    | { outcome: "granted"; trigger: "wallet_shortcut" | "bank_shortcut" };

const started = new Set<AutologTrigger>();

export const setupStarted = (trigger: AutologTrigger): boolean => started.has(trigger);

export function trackAutologSetup(event: AutologSetup): void {
    if (event.outcome === "started") {
        started.add(event.trigger);
    }
    if (Date.now() >= AUTOLOG_ANALYTICS_AT_MS) {
        posthog?.capture("autolog_setup", event);
    }
}
