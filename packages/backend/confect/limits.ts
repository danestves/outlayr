import { RateLimiter } from "@convex-dev/rate-limiter";

import { components } from "../convex/_generated/api";

export const reader = new RateLimiter(components.rateLimiter);
