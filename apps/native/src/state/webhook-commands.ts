import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";

import { cloudMutation } from "@/lib/convex";
import type { WebhookEndpointId } from "@/lib/webhook-settings";

import { createCommand } from "./atom-command";

// Each secret travels back with the call that saved it, so a slower overlapping save cannot show the wrong one.
export const setInboundTokenCommand = createCommand({
    execute: ({ token }: { token: string }) =>
        cloudMutation(api.webhooks.setInboundToken, { token }).pipe(Effect.map((saved) => ({ saved, token }))),
    label: "webhooks:set-inbound-token",
});

export const revokeInboundTokenCommand = createCommand({
    execute: () => cloudMutation(api.webhooks.revokeInboundToken, {}),
    label: "webhooks:revoke-inbound-token",
});

export const addEndpointCommand = createCommand({
    execute: ({ secret, url }: { secret: string; url: string }) =>
        cloudMutation(api.webhooks.addEndpoint, { secret, url }).pipe(Effect.map((result) => ({ result, secret }))),
    label: "webhooks:add-endpoint",
});

export const removeEndpointCommand = createCommand({
    execute: ({ endpointId }: { endpointId: WebhookEndpointId }) =>
        cloudMutation(api.webhooks.removeEndpoint, { endpointId }),
    label: "webhooks:remove-endpoint",
});

export const setEndpointSecretCommand = createCommand({
    execute: ({ endpointId, secret }: { endpointId: WebhookEndpointId; secret: string }) =>
        cloudMutation(api.webhooks.setEndpointSecret, { endpointId, secret }).pipe(
            Effect.map((saved) => ({ saved, secret }))
        ),
    label: "webhooks:set-endpoint-secret",
});

export const testEndpointCommand = createCommand({
    execute: ({ endpointId }: { endpointId: WebhookEndpointId }) =>
        cloudMutation(api.webhooks.testEndpoint, { endpointId }),
    label: "webhooks:test-endpoint",
});
