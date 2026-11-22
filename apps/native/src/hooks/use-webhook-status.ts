import { api } from "@outlayr/backend/convex/_generated/api";
import { useQueries } from "convex/react";

import type { WebhookStatusView } from "@/lib/webhook-settings";

const STATUS_REQUEST = { status: { args: {}, query: api.webhooks.status } };

export function useWebhookStatus(): WebhookStatusView | undefined {
    const result: WebhookStatusView | Error | undefined = useQueries(STATUS_REQUEST).status;
    return result instanceof Error ? undefined : result;
}
