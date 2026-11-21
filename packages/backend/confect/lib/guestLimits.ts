import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";

import { components } from "../../convex/_generated/api";

export const GUEST_BUCKET_REFILL_MS = HOUR;

export const guestLimiter = new RateLimiter(components.rateLimiter, {
    guestSignIn: { capacity: 500, kind: "token bucket", period: HOUR, rate: 500 },
    guestSignInPerCaller: { capacity: 10, kind: "token bucket", period: GUEST_BUCKET_REFILL_MS, rate: 10 },
});
