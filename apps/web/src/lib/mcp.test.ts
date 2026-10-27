import { describe, expect, it } from "vite-plus/test";

import { server } from "./mcp";

const ACCEPT = "application/json, text/event-stream";
const ENVELOPE = {
    "io.modelcontextprotocol/clientCapabilities": {},
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
};

interface Rpc {
    method: string;
    params?: Record<string, unknown>;
}

async function rpc(body: Rpc, headers: Record<string, string> = {}) {
    const response = await server.fetch(
        new Request("https://tryoutlayr.com/mcp", {
            body: JSON.stringify({ id: 1, jsonrpc: "2.0", ...body }),
            headers: { accept: ACCEPT, "content-type": "application/json", ...headers },
            method: "POST",
        })
    );
    const text = await response.text();
    const data = text.split("\n").find((line) => line.startsWith("data: "));
    return JSON.parse(data ? data.slice("data: ".length) : text);
}

const callTool = (name: string, args: unknown) => rpc({ method: "tools/call", params: { arguments: args, name } });

describe("public MCP server", () => {
    it("serves a 2025 client: initialize, tools/list, tools/call", async () => {
        const init = await rpc({
            method: "initialize",
            params: { capabilities: {}, clientInfo: { name: "test", version: "1" }, protocolVersion: "2025-11-25" },
        });
        expect(init.result.protocolVersion).toBe("2025-11-25");
        expect(init.result.serverInfo.name).toBe("com.tryoutlayr/outlayr");
        expect(init.result.instructions).toContain("about_outlayr");

        const list = await rpc({ method: "tools/list" }, { "mcp-protocol-version": "2025-11-25" });
        expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
            "about_outlayr",
            "budget_split",
            "subscription_cost",
            "installment_cost",
            "split_expenses",
        ]);

        const about = await callTool("about_outlayr", {});
        const resource = await rpc({ method: "resources/read", params: { uri: "https://tryoutlayr.com/llms.txt" } });
        expect(about.result.content[0].text).toMatch(/^# Outlayr/u);
        expect(resource.result.contents[0].text).toBe(about.result.content[0].text);

        const plans = await callTool("about_outlayr", { section: "Plans" });
        expect(plans.result.content[0].text).toMatch(/^## Plans\n[^#]*\$7\.99/u);
    });

    it("serves a 2026-07-28 request that carries its own version and no initialize", async () => {
        const reply = await rpc(
            {
                method: "tools/call",
                params: {
                    _meta: ENVELOPE,
                    arguments: {
                        people: [
                            { name: "Ana", paid: 90 },
                            { name: "Luis", paid: 0 },
                        ],
                    },
                    name: "split_expenses",
                },
            },
            { "mcp-method": "tools/call", "mcp-name": "split_expenses", "mcp-protocol-version": "2026-07-28" }
        );
        expect(reply.result.structuredContent.transfers).toEqual([{ amount: 45, from: "Luis", to: "Ana" }]);
    });

    it("runs a calculator in currency units and returns bad arguments as a tool error", async () => {
        const people = [
            { name: "Ana", paid: 90 },
            { name: "Luis", paid: 0 },
            { name: "Marta", paid: 30.5 },
        ];
        expect((await callTool("split_expenses", { people })).result.structuredContent.transfers).toEqual([
            { amount: 40.17, from: "Luis", to: "Ana" },
            { amount: 9.66, from: "Marta", to: "Ana" },
        ]);
        expect((await callTool("split_expenses", { people: [] })).result.isError).toBe(true);
        expect(
            (await callTool("split_expenses", { people: [...people, { name: " ana", paid: 5 }] })).result.isError
        ).toBe(true);
        expect((await callTool("split_expenses", { people: [...people, { name: " ", paid: 5 }] })).result.isError).toBe(
            true
        );
    });

    it("applies schema defaults", async () => {
        const reply = await callTool("budget_split", { income: 3000 });
        expect(reply.result.structuredContent.monthly).toEqual({ needs: 1500, savings: 600, wants: 900 });
    });
});
