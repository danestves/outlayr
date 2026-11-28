import { USAGE_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";

import { posthog } from "@/lib/posthog";

interface UsageEvents {
    item_deleted: {
        kind: "entry" | "transfer" | "account" | "budget" | "category" | "goal" | "purchase" | "recurring";
    };
    notification_permission: { granted: boolean };
    signed_in: { method: "apple" | "email" | "google" };
}

export type DeletedItemKind = UsageEvents["item_deleted"]["kind"];

const disclosed = () => Date.now() >= USAGE_ANALYTICS_AT_MS;

export function trackUsage<Event extends keyof UsageEvents>(event: Event, properties: UsageEvents[Event]): void {
    if (disclosed()) {
        posthog?.capture(event, properties);
    }
}
