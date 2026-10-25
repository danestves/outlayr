/// <reference types="vite/client" />

import mcpTest from "@convex-dev/mcp/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { mcp } from "./mcp";
import { authenticatedAs, seedAuthUser, seedProUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

beforeEach(() => {
    vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
});

afterEach(() => {
    vi.unstubAllEnvs();
});

function setup() {
    const t = convexTest(schema, modules);
    mcpTest.register(t);
    revenuecatTest.register(t);
    return t;
}

type Client = ReturnType<typeof setup>;

async function connect(t: Client, userId: string, scopes?: string[]) {
    const { apiKey } = await t.action(internal.mcp.createApiKeyForUser, { scopes, userId });
    return async (method: string, params: Record<string, unknown> = {}) => {
        const response = await t.fetch("/mcp", {
            body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
            headers: {
                accept: "application/json, text/event-stream",
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
                "mcp-protocol-version": "2025-06-18",
            },
            method: "POST",
        });
        return {
            body: (await response.json()) as { result?: { content: { text: string }[]; isError?: boolean } },
            status: response.status,
        };
    };
}

describe("the MCP server", () => {
    it("declares scopes and annotations for every tool", () => {
        expect(mcp.lint()).toStrictEqual([]);
    });

    it("logs and reads one user's entries over /mcp without leaking them to another user", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const stranger = await seedAuthUser(t);
        await authenticatedAs(t, owner).mutation(api.sync.push, {
            deviceId: "phone",
            rows: [
                {
                    deletedAt: null,
                    fields: {
                        color: null,
                        dateCreated: null,
                        emoji: null,
                        icon: null,
                        income: false,
                        name: "Coffee",
                        parentId: null,
                        sortOrder: 0,
                    },
                    localId: "coffee",
                    table: "categories",
                    updatedAt: 1,
                },
            ],
        });
        const ownerCall = await connect(t, owner.userId);
        const strangerCall = await connect(t, stranger.userId);

        const logged = await ownerCall("tools/call", {
            arguments: { amount: 4.5, category: "Coffee", kind: "expense", note: "Blue Bottle" },
            name: "log_entry",
        });
        const mine = await ownerCall("tools/call", { arguments: {}, name: "recent_transactions" });
        const theirs = await strangerCall("tools/call", { arguments: {}, name: "recent_transactions" });

        expect(logged.body.result?.isError).toBeUndefined();
        expect(mine.body.result?.content[0]?.text).toContain("Blue Bottle");
        expect(theirs.body.result?.content[0]?.text).toBe("[]");
    });

    it("keeps a read-only connection from writing", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const readOnly = await connect(t, owner.userId, ["ledger:read"]);

        const listed = await readOnly("tools/list");
        const write = await readOnly("tools/call", {
            arguments: { amount: 1, category: "Coffee", kind: "expense" },
            name: "log_entry",
        });

        expect(JSON.stringify(listed.body)).not.toContain("log_entry");
        expect(write.status).toBeGreaterThanOrEqual(400);
    });
});
