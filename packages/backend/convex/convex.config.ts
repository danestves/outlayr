import betterAuth from "@convex-dev/better-auth/convex.config";
import mcp from "@convex-dev/mcp/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import storage from "@outlayr/storage/convex.config.js";
import revenuecat from "convex-revenuecat/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(storage);
app.use(rateLimiter);
app.use(mcp);
app.use(revenuecat);
app.use(workpool, { name: "enrichmentPool" });
app.use(workpool, { name: "emailPool" });
app.use(workpool, { name: "noticePool" });

export default app;
