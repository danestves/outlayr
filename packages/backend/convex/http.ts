import { PRO_PLANS } from "@outlayr/money/pro-prices";
import { RevenueCat } from "convex-revenuecat";
import { httpRouter } from "convex/server";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { authComponent, createAuth } from "../confect/lib/betterAuth";
import { revenueCatWebhookAuth, siteUrl } from "../confect/lib/config";
import { runEdge, runEdgeSync } from "../confect/lib/runEdge";
import { mcp } from "../confect/mcp";
import { revenuecat } from "../confect/revenuecat";
import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

new RevenueCat(components.revenuecat, {
    ...revenuecat.options,
    REVENUECAT_WEBHOOK_AUTH: Option.getOrUndefined(Option.map(runEdgeSync(revenueCatWebhookAuth), Redacted.value)),
}).registerRoutes(http);

mcp.registerRoutes(http);

const decodeCheckoutBody = Schema.decodeUnknownOption(Schema.Struct({ plan: Schema.Literals(PRO_PLANS) }));

const billingCors = async () => ({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": await runEdge(siteUrl),
    Vary: "Origin",
});

http.route({
    handler: httpAction(async () => new Response(null, { headers: await billingCors(), status: 204 })),
    method: "OPTIONS",
    path: "/billing/checkout",
});
http.route({
    handler: httpAction(async (ctx, request) => {
        const headers = await billingCors();
        const body = decodeCheckoutBody(await request.json().catch(() => null));
        if (Option.isNone(body)) {
            return Response.json({ kind: "unavailable" }, { headers, status: 400 });
        }
        const country = request.headers.get("cf-ipcountry");
        const { plan } = body.value;
        return Response.json(await ctx.runAction(internal.billing.createCheckout, { country, plan }), { headers });
    }),
    method: "POST",
    path: "/billing/checkout",
});

http.route({
    handler: httpAction(() => Promise.resolve(Response.redirect("https://github.com/danestves/outlayr", 302))),
    method: "GET",
    path: "/source",
});

export default http;
