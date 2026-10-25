import type { RateLimitConfig, RateLimitError } from "@convex-dev/rate-limiter";
import { DAY, RateLimiter } from "@convex-dev/rate-limiter";
import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

import { components } from "../../convex/_generated/api";
import type { MutationCtx } from "../../convex/_generated/server";
import { isPro } from "../revenuecat";

const CAPTURE_WINDOW_MS = 30 * DAY;

export const FREE_CAPTURE_CONFIG: RateLimitConfig = { kind: "fixed window", period: CAPTURE_WINDOW_MS, rate: 20 };
export const PRO_CAPTURE_CONFIG: RateLimitConfig = { kind: "fixed window", period: CAPTURE_WINDOW_MS, rate: 500 };

export const captureLimiter = new RateLimiter(components.rateLimiter, {
    capturesFree: FREE_CAPTURE_CONFIG,
    capturesPro: PRO_CAPTURE_CONFIG,
});

export async function admitCapture(
    ctx: MutationCtx,
    identity: Pick<UserIdentity, "subject" | "tokenIdentifier">,
    admitGlobal: () => Promise<{ ok: boolean; retryAfter?: number }>
) {
    const pro = await isPro(ctx, identity.subject);
    const taken = await captureLimiter.limit(ctx, pro ? "capturesPro" : "capturesFree", {
        key: identity.tokenIdentifier,
    });
    if (!taken.ok) {
        return pro ? ("quotaExceeded" as const) : ("notEntitled" as const);
    }
    const global = await admitGlobal();
    if (!global.ok) {
        const data: RateLimitError = { kind: "RateLimited", name: "global", retryAfter: global.retryAfter ?? 0 };
        throw new ConvexError(data);
    }
    return "ok" as const;
}
