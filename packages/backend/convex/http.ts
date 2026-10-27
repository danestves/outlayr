import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { mcp } from "./mcp";
import { revenuecat } from "./revenuecat";

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
