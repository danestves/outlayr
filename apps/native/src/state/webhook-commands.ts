import { api } from "@outlayr/backend/convex/_generated/api";

import { cloudMutation } from "@/lib/convex";
import type { WebhookEndpointId } from "@/lib/webhook-settings";

import { createCommand } from "./atom-command";

export const setInboundTokenCommand = createCommand({
    execute: ({ token }: { token: string }) => cloudMutation(api.webhooks.setInboundToken, { token }),
    label: "webhooks:set-inbound-token",
});

export const revokeInboundTokenCommand = createCommand({
    execute: () => cloudMutation(api.webhooks.revokeInboundToken, {}),
    label: "webhooks:revoke-inbound-token",
});

export const addEndpointCommand = createCommand({
    execute: ({ secret, url }: { secret: string; url: string }) =>
        cloudMutation(api.webhooks.addEndpoint, { secret, url }),
    label: "webhooks:add-endpoint",
});

export const removeEndpointCommand = createCommand({
    execute: ({ endpointId }: { endpointId: WebhookEndpointId }) =>
        cloudMutation(api.webhooks.removeEndpoint, { endpointId }),
    label: "webhooks:remove-endpoint",
});

export const setEndpointSecretCommand = createCommand({
    execute: ({ endpointId, secret }: { endpointId: WebhookEndpointId; secret: string }) =>
        cloudMutation(api.webhooks.setEndpointSecret, { endpointId, secret }),
    label: "webhooks:set-endpoint-secret",
});

export const testEndpointCommand = createCommand({
    execute: ({ endpointId }: { endpointId: WebhookEndpointId }) =>
        cloudMutation(api.webhooks.testEndpoint, { endpointId }),
    label: "webhooks:test-endpoint",
});
