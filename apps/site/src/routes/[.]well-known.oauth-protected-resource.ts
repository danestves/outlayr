import { LEDGER_MCP_ORIGIN, SITE_URL } from "@outlayr/shared/urls";
import { createFileRoute } from "@tanstack/react-router";

const metadata = {
    authorization_servers: [LEDGER_MCP_ORIGIN],
    bearer_methods_supported: ["header"],
    resource: SITE_URL,
    resource_documentation: `${SITE_URL}/auth.md`,
    resource_name: "Outlayr",
    scopes_supported: ["ledger:read", "ledger:write"],
};

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
    server: {
        handlers: {
            GET: () =>
                Response.json(metadata, {
                    headers: {
                        "access-control-allow-origin": "*",
                        "cache-control": "public, max-age=3600",
                    },
                }),
        },
    },
});
