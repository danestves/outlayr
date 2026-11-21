import { componentsGeneric } from "convex/server";

export type Components = {
  "betterAuth": import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  "emailPool": import("@convex-dev/workpool/_generated/component.js").ComponentApi<"emailPool">;
  "enrichmentPool": import("@convex-dev/workpool/_generated/component.js").ComponentApi<"enrichmentPool">;
  "mcp": import("@convex-dev/mcp/_generated/component.js").ComponentApi<"mcp">;
  "noticePool": import("@convex-dev/workpool/_generated/component.js").ComponentApi<"noticePool">;
  "rateLimiter": import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  "revenuecat": import("convex-revenuecat/_generated/component.js").ComponentApi<"revenuecat">;
  "statementStorage": import("@outlayr/storage/_generated/component.js").ComponentApi<"statementStorage">;
  "storage": import("@outlayr/storage/_generated/component.js").ComponentApi<"storage">;
};

export const components: Components = componentsGeneric() as any;
