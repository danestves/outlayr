import { describe, expect, it } from "vite-plus/test";

import { handleMcp } from "./mcp";

const post = (body: unknown) =>
    handleMcp(new Request("https://tryoutlayr.com/mcp", { body: JSON.stringify(body), method: "POST" }));

const rpc = async (method: string, params: Partial<Record<"name" | "protocolVersion" | "uri", string>> = {}) => {
    const response = await post({ id: 1, jsonrpc: "2.0", method, params });
    return response.json();
};

describe("handleMcp", () => {
    it("echoes a supported protocol version and falls back to the latest otherwise", async () => {
        expect((await rpc("initialize", { protocolVersion: "2025-03-26" })).result.protocolVersion).toBe("2025-03-26");
        expect((await rpc("initialize", { protocolVersion: "1999-01-01" })).result.protocolVersion).toBe("2025-11-25");
    });

    it("returns llms.txt from the tool and the resource", async () => {
        const tool = await rpc("tools/call", { name: "about_outlayr" });
        const resource = await rpc("resources/read", { uri: "https://tryoutlayr.com/llms.txt" });
        expect(tool.result.content[0].text).toMatch(/^# Outlayr/u);
        expect(resource.result.contents[0].text).toBe(tool.result.content[0].text);
    });

    it("runs a calculator in currency units and returns bad arguments as a tool error", async () => {
        const call = async (args: unknown) => {
            const body = {
                id: 1,
                jsonrpc: "2.0",
                method: "tools/call",
                params: { arguments: args, name: "split_expenses" },
            };
            return (await post(body)).json();
        };
        const people = [
            { name: "Ana", paid: 90 },
            { name: "Luis", paid: 0 },
            { name: "Marta", paid: 30.5 },
        ];
        expect((await call({ people })).result.structuredContent.transfers).toEqual([
            { amount: 40.17, from: "Luis", to: "Ana" },
            { amount: 9.66, from: "Marta", to: "Ana" },
        ]);
        expect((await call({ people: [] })).result.isError).toBe(true);
        expect((await call({ people: [...people, { name: " ana", paid: 5 }] })).result.isError).toBe(true);
        expect((await call({ people: [...people, { name: " ", paid: 5 }] })).result.isError).toBe(true);
    });

    it("rejects unknown tools, resources and methods", async () => {
        expect((await rpc("tools/call", { name: "nope" })).error.code).toBe(-32_602);
        expect((await rpc("resources/read", { uri: "nope" })).error.code).toBe(-32_002);
        expect((await rpc("nope")).error.code).toBe(-32_601);
    });

    it("accepts notifications with 202 and rejects batches with 400", async () => {
        expect((await post({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
        expect((await post([{ id: 1, jsonrpc: "2.0", method: "ping" }])).status).toBe(400);
    });
});
