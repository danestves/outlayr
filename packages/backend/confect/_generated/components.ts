import { componentsGeneric } from "convex/server";

export type Components = {
  "agent": import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  "betterAuth": import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  "enrichmentPool": import("@convex-dev/workpool/_generated/component.js").ComponentApi<"enrichmentPool">;
  "mcp": import("@convex-dev/mcp/_generated/component.js").ComponentApi<"mcp">;
  "r2": import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  "rateLimiter": import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  "revenuecat": import("convex-revenuecat/_generated/component.js").ComponentApi<"revenuecat">;
};

export const components: Components = componentsGeneric() as any;
