import type { ToolDefinition } from "@convex-dev/mcp";
import { PostHogMCP } from "@posthog/mcp";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { postHogProjectToken } from "./config";
import { runEdgeSync } from "./runEdge";

const ANALYTICS_TIMEOUT_MS = 2000;

const posthog = Option.match(runEdgeSync(postHogProjectToken), {
    onNone: () => null,
    onSome: (token) =>
        new PostHogMCP(Redacted.value(token), {
            captureModel: false,
            enableConversationId: false,
            fetchRetryCount: 0,
            flushAt: 1,
            flushInterval: 0,
            host: "https://us.i.posthog.com",
            requestTimeout: ANALYTICS_TIMEOUT_MS,
        }),
});

// Sends tool names, timing and failure only: arguments and results are ledger data and stay out.
export function withAnalytics(
    server: { name: string; version: string },
    tools: Record<string, ToolDefinition>
): Record<string, ToolDefinition> {
    const client = posthog;
    if (client === null) {
        return tools;
    }
    return Object.fromEntries(
        Object.entries(tools).map(([toolName, definition]) => [
            toolName,
            {
                ...definition,
                handler: async (ctx, args, user) => {
                    const startedAt = Date.now();
                    let isError = true;
                    try {
                        const result = await definition.handler(ctx, args, user);
                        isError = false;
                        return result;
                    } finally {
                        client.captureToolCall({
                            durationMs: Date.now() - startedAt,
                            isError,
                            properties: { $mcp_server_name: server.name, $mcp_server_version: server.version },
                            sessionId: user.connectionId,
                            toolName,
                        });
                        // Convex drops unawaited work once the HTTP action returns.
                        // A PostHog outage must not fail the tool.
                        await client.flush().catch(() => undefined);
                    }
                },
            },
        ])
    );
}
