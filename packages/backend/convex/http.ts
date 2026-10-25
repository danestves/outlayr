import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "../confect/lib/betterAuth";
import { mcp } from "../confect/mcp";
import { revenuecat } from "../confect/revenuecat";
import { httpAction } from "./_generated/server";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

revenuecat.registerRoutes(http);

mcp.registerRoutes(http);

http.route({
    handler: httpAction(async () => Response.redirect("https://github.com/danestves/outlayr", 302)),
    method: "GET",
    path: "/source",
});

export default http;
