import { api } from "@outlayr/backend/convex/_generated/api";
import { useQueries } from "convex/react";

import type { WebhookStatusView } from "@/lib/webhook-settings";

const STATUS_REQUEST = { status: { args: {}, query: api.webhooks.status } };

export type WebhookStatusResult =
    | { kind: "error" }
    | { kind: "loading" }
    | { kind: "ready"; status: WebhookStatusView };

export function useWebhookStatus(): WebhookStatusResult {
    const result: WebhookStatusView | Error | undefined = useQueries(STATUS_REQUEST).status;
    if (result instanceof Error) {
        return { kind: "error" };
    }
    if (result === undefined) {
        return { kind: "loading" };
    }
    return { kind: "ready", status: result };
}
