import { RevenueCat } from "convex-revenuecat";
import { httpRouter } from "convex/server";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { authComponent, createAuth } from "../confect/lib/betterAuth";
import { revenueCatWebhookAuth } from "../confect/lib/config";
import { runEdgeSync } from "../confect/lib/runEdge";
import { mcp } from "../confect/mcp";
import { revenuecat } from "../confect/revenuecat";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

new RevenueCat(components.revenuecat, {
    ...revenuecat.options,
    REVENUECAT_WEBHOOK_AUTH: Option.getOrUndefined(Option.map(runEdgeSync(revenueCatWebhookAuth), Redacted.value)),
}).registerRoutes(http);

mcp.registerRoutes(http);

http.route({
    handler: httpAction(() => Promise.resolve(Response.redirect("https://github.com/danestves/outlayr", 302))),
    method: "GET",
    path: "/source",
});

export default http;
