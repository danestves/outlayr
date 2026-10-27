import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { env } from "@outlayr/env/backend";
import { RevenueCat } from "convex-revenuecat";
import { ConvexError } from "convex/values";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";

export const PRO_ENTITLEMENT_ID = "pro";

const REVENUECAT_TIMEOUT_MS = 10_000;

export const revenuecat = new RevenueCat(components.revenuecat, {
    REVENUECAT_WEBHOOK_AUTH: env.REVENUECAT_WEBHOOK_AUTH,
});

export async function isPro(ctx: Parameters<typeof revenuecat.hasEntitlement>[0], userId: string): Promise<boolean> {
    return revenuecat.hasEntitlement(ctx, { appUserId: userId, entitlementId: PRO_ENTITLEMENT_ID });
}

export async function eraseUpstreamCustomer(appUserId: string): Promise<void> {
    if (!env.REVENUECAT_SECRET_KEY) {
        throw new Error("REVENUECAT_SECRET_KEY is not set; the upstream customer cannot be erased");
    }
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
        method: "DELETE",
        signal: AbortSignal.timeout(REVENUECAT_TIMEOUT_MS),
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`RevenueCat customer erase failed with ${response.status}`);
    }
}

export async function requirePro(ctx: Parameters<typeof isPro>[0], userId: string): Promise<void> {
    if (!(await isPro(ctx, userId))) {
        throw new ConvexError("Outlayr Pro is required for this");
    }
}

const decodeSubscriberResponse = Schema.decodeUnknownOption(
    Schema.Struct({ subscriber: Schema.Record(Schema.String, Schema.Unknown) })
);

/** Whether an authoritative payload still lists Pro at all, expired or not. */
export const listsPro = Schema.is(
    Schema.Struct({
        entitlements: Schema.Struct({ [PRO_ENTITLEMENT_ID]: Schema.Record(Schema.String, Schema.Unknown) }),
    })
);

export const syncLimiter = new RateLimiter(components.rateLimiter, {
    revenuecatSync: { capacity: 12, kind: "token bucket", period: HOUR, rate: 12 },
});

// A thrown fetch or decode means the store did not answer, like a non-2xx; only those two are caught here.
export async function storeSubscriber(appUserId: string) {
    try {
        const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
            headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
            signal: AbortSignal.timeout(REVENUECAT_TIMEOUT_MS),
        });
        if (!response.ok) {
            return null;
        }
        return Option.match(decodeSubscriberResponse(await response.json()), {
            onNone: () => null,
            onSome: ({ subscriber }) => subscriber,
        });
    } catch (error) {
        console.warn("[revenuecat] subscriber read failed", error);
        return null;
    }
}
