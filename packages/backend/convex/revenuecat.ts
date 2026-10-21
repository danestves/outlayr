import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { env } from "@outlayr/env/backend";
import { RevenueCat } from "convex-revenuecat";
import type { RevenueCatSubscriber } from "convex-revenuecat";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { optionalUserId } from "./lib/auth";

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

const subscriberResponse = z.object({ subscriber: z.looseObject({}) });

/** Whether an authoritative payload still lists Pro at all, expired or not. */
const listsPro = z.object({ entitlements: z.object({ [PRO_ENTITLEMENT_ID]: z.looseObject({}) }) });

const syncLimiter = new RateLimiter(components.rateLimiter, {
    revenuecatSync: { capacity: 12, kind: "token bucket", period: HOUR, rate: 12 },
});

export const mirrorSubscriber = internalMutation({
    args: { appUserId: v.string(), subscriber: v.string() },
    handler: async (ctx, args) => {
        const subscriber: RevenueCatSubscriber = JSON.parse(args.subscriber);
        // `syncSubscriber` never removes, and a revoked entitlement is absent rather than expired, so the mirror is
        // cleared when it disagrees. The re-sync below runs in the same transaction.
        if (!listsPro.safeParse(subscriber).success && (await isPro(ctx, args.appUserId))) {
            await revenuecat.deleteCustomer(ctx, { appUserId: args.appUserId });
        }
        await revenuecat.syncSubscriber(ctx, { appUserId: args.appUserId, subscriber });
        return isPro(ctx, args.appUserId);
    },
});

export const mirroredEntitlement = internalQuery({
    args: { appUserId: v.string() },
    handler: async (ctx, args) => isPro(ctx, args.appUserId),
});

export const sessionUserId = internalQuery({
    args: {},
    handler: async (ctx) => await optionalUserId(ctx),
    returns: v.union(v.string(), v.null()),
});

// The store is asked whenever possible: only it can remove an entitlement whose refund webhook was missed. The
// mirror is the fallback when it cannot be asked, since refusing would strand a customer the webhook covered.
export const syncFromStore = action({
    args: {},
    handler: async (ctx): Promise<boolean> => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return false;
        }
        const userId: string | null = await ctx.runQuery(internal.revenuecat.sessionUserId, {});
        if (userId === null) {
            return false;
        }
        const mirrored = async (): Promise<boolean> =>
            ctx.runQuery(internal.revenuecat.mirroredEntitlement, { appUserId: userId });
        if (!env.REVENUECAT_SECRET_KEY) {
            return await mirrored();
        }
        const allowed = await syncLimiter.limit(ctx, "revenuecatSync", { key: identity.tokenIdentifier });
        if (!allowed.ok) {
            return await mirrored();
        }
        // A thrown fetch or decode means the store did not answer, like a non-2xx; only those two are caught here.
        let subscriber: z.infer<typeof subscriberResponse>["subscriber"];
        try {
            const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
                headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
                signal: AbortSignal.timeout(REVENUECAT_TIMEOUT_MS),
            });
            if (!response.ok) {
                return await mirrored();
            }
            const parsed = subscriberResponse.safeParse(await response.json());
            if (!parsed.success) {
                return await mirrored();
            }
            ({ subscriber } = parsed.data);
        } catch (error) {
            console.warn("[revenuecat] subscriber read failed", error);
            return await mirrored();
        }
        return await ctx.runMutation(internal.revenuecat.mirrorSubscriber, {
            appUserId: userId,
            subscriber: JSON.stringify(subscriber),
        });
    },
});
