import agent from "@convex-dev/agent/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
import mcp from "@convex-dev/mcp/convex.config.js";
import r2 from "@convex-dev/r2/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import revenuecat from "convex-revenuecat/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(r2);
app.use(rateLimiter);
app.use(agent);
app.use(mcp);
app.use(revenuecat);
app.use(workpool, { name: "enrichmentPool" });

export default app;
