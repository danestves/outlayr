/// <reference types="vite/client" />

import { createHmac } from "node:crypto";

import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import * as Option from "effect/Option";
import { afterEach, beforeEach, describe, expect, it, vi, test } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { WEBHOOKS_EFFECTIVE_AT_MS } from "./legal";
import { purgeUserBatch } from "./lib/account";
import { runEdge } from "./lib/runEdge";
import { sha256Hex } from "./lib/sha256Hex";
import { endpointUrl, signatureHeader } from "./lib/webhooks";
import { authenticatedAs, seedAuthUser, seedProUser } from "./test.helpers";
import type { SeededIdentity } from "./test.helpers";
import { parseInbound, receiveInbound } from "./webhooks";
import { MAX_FAILURES } from "./webhooks.spec";

const modules = import.meta.glob("../convex/**/*.ts");

const TOKEN = "t".repeat(40);
const SECRET = "s".repeat(40);
const OPEN_AT = WEBHOOKS_EFFECTIVE_AT_MS + 86_400_000;

type TestClient = ReturnType<typeof setup>;
type TransactionRow = Extract<FunctionArgs<typeof api.sync.push>["rows"][number], { table: "transactions" }>;

function setup() {
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    return t;
}

async function post(t: TestClient, body: unknown, token = TOKEN) {
    return await t.action(async (ctx) => {
        const response = await runEdge(
            receiveInbound(
                ctx,
                new Request("https://example.convex.site/hooks/in", {
                    body: JSON.stringify(body),
                    headers: { Authorization: `Bearer ${token}` },
                    method: "POST",
                })
            )
        );
        return response.status;
    });
}

function entry(localId: string, updatedAt: number): TransactionRow {
    return {
        deletedAt: null,
        fields: {
            accountId: null,
            amount: 12.5,
            amountUsd: 12.5,
            categoryId: null,
            currency: "USD",
            customColor: null,
            date: updatedAt,
            day: updatedAt,
            details: null,
            emoji: null,
            exchangeRate: 1,
            exchangeRateType: "official",
            icon: null,
            imageColor: null,
            imageKey: null,
            income: false,
            month: updatedAt,
            note: "coffee",
            onceRecurring: false,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: 0,
        },
        localId,
        table: "transactions",
        updatedAt,
    };
}

async function endpointFor(t: TestClient, user: SeededIdentity) {
    const added = await authenticatedAs(t, user).mutation(api.webhooks.addEndpoint, {
        secret: SECRET,
        url: "https://hooks.example.com/outlayr",
    });
    if (added.kind !== "added") {
        throw new Error(`endpoint not added: ${added.kind}`);
    }
    return added.endpointId;
}

async function plantToken(t: TestClient, user: SeededIdentity, token: string) {
    const tokenHash = await runEdge(sha256Hex(token));
    await t.run((ctx) =>
        ctx.db.insert("webhookTokens", { createdAt: Date.now(), hint: token.slice(-4), tokenHash, userId: user.userId })
    );
}

const deliveries = (t: TestClient) => t.run((ctx) => ctx.db.query("webhookDeliveries").collect());
const events = (t: TestClient) => t.run((ctx) => ctx.db.query("webhookEvents").collect());

function only<T>(rows: readonly T[]): T {
    const [row] = rows;
    if (rows.length !== 1 || row === undefined) {
        throw new Error(`expected one row, got ${rows.length}`);
    }
    return row;
}

beforeEach(() => {
    vi.useFakeTimers({ now: OPEN_AT });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("inbound webhooks", () => {
    it("queues a POST for the token's owner, and only that owner can take it", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const stranger = await seedProUser(t);
        await authenticatedAs(t, owner).mutation(api.webhooks.setInboundToken, { token: TOKEN });

        await expect(post(t, { amount: 4.2, currency: "eur", note: "Lunch" })).resolves.toBe(202);

        const row = only(await authenticatedAs(t, owner).query(api.webhooks.inbox, {}));
        expect(row.write).toMatchObject({ amount: 4.2, currency: "EUR", income: false, note: "Lunch" });
        await expect(authenticatedAs(t, stranger).query(api.webhooks.inbox, {})).resolves.toStrictEqual([]);

        await authenticatedAs(t, stranger).mutation(api.webhooks.ackInbox, { ids: [row.id] });
        await expect(authenticatedAs(t, owner).query(api.webhooks.inbox, {})).resolves.toHaveLength(1);
        await authenticatedAs(t, owner).mutation(api.webhooks.ackInbox, { ids: [row.id] });
        await expect(authenticatedAs(t, owner).query(api.webhooks.inbox, {})).resolves.toStrictEqual([]);
    });

    it("refuses a rotated token and a token whose owner lost Pro", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        await authenticatedAs(t, owner).mutation(api.webhooks.setInboundToken, { token: TOKEN });
        await authenticatedAs(t, owner).mutation(api.webhooks.setInboundToken, { token: "n".repeat(40) });
        await expect(post(t, { amount: 1 })).resolves.toBe(401);

        const lapsed = await seedAuthUser(t);
        await plantToken(t, lapsed, "l".repeat(40));
        await expect(post(t, { amount: 1 }, "l".repeat(40))).resolves.toBe(403);
    });

    it("will not hand one account's token to another", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const copycat = await seedProUser(t);
        await authenticatedAs(t, owner).mutation(api.webhooks.setInboundToken, { token: TOKEN });

        await expect(
            authenticatedAs(t, copycat).mutation(api.webhooks.setInboundToken, { token: TOKEN })
        ).resolves.toBeFalsy();
        await expect(post(t, { amount: 1 })).resolves.toBe(202);
        await expect(authenticatedAs(t, owner).query(api.webhooks.inbox, {})).resolves.toHaveLength(1);
    });

    it("takes no token and no POST before the privacy notice takes effect", async () => {
        vi.useRealTimers();
        vi.useFakeTimers({ now: WEBHOOKS_EFFECTIVE_AT_MS - 86_400_000 });
        const t = setup();
        const owner = await seedProUser(t);
        await expect(
            authenticatedAs(t, owner).mutation(api.webhooks.setInboundToken, { token: TOKEN })
        ).resolves.toBeFalsy();
        await plantToken(t, owner, TOKEN);
        await expect(post(t, { amount: 1 })).resolves.toBe(403);
    });

    it("reads an ISO date and refuses a body it cannot file", () => {
        const at = Date.UTC(2026, 10, 20, 15, 30);
        expect(
            Option.map(
                parseInbound(JSON.stringify({ amount: 3, date: "2026-11-20T15:30:00Z" }), 0),
                (write) => write.date
            )
        ).toStrictEqual(Option.some(at));
        expect(parseInbound(JSON.stringify({ amount: 0 }), at)).toStrictEqual(Option.none());
        expect(parseInbound(JSON.stringify({ amount: 3, date: "yesterday-ish" }), at)).toStrictEqual(Option.none());
        expect(parseInbound("not json", at)).toStrictEqual(Option.none());
    });
});

describe("outbound webhooks", () => {
    it("sends entry.filed once per new entry, never for history uploaded or imported", async () => {
        const t = setup();
        const user = await seedProUser(t);
        await endpointFor(t, user);
        const push = (rows: TransactionRow[]) =>
            authenticatedAs(t, user).mutation(api.sync.push, { deviceId: "phone", rows });
        const fresh = entry("imported", OPEN_AT + 1);
        const imported = { ...fresh, fields: { ...fresh.fields, date: OPEN_AT - 30 * 86_400_000 } };

        await push([entry("old", OPEN_AT - 86_400_000), entry("new", OPEN_AT + 1), imported]);
        await push([entry("new", OPEN_AT + 2)]);

        const sent = only(await events(t));
        expect(sent.eventId).toBe("evt_new");
        expect(JSON.parse(sent.body)).toMatchObject({
            data: { entry: { amount: 12.5, currency: "USD", id: "new", note: "coffee" } },
            type: "entry.filed",
        });
        expect(only(await deliveries(t)).eventRef).toBe(sent._id);
    });

    it("retries a failing endpoint, ignores a stale claim, disables at the limit, and a test brings it back", async () => {
        const t = setup();
        const user = await seedProUser(t);
        const endpointId = await endpointFor(t, user);
        const settle = (deliveryId: Id<"webhookDeliveries">, attempt: number, status: number) =>
            t.mutation(internal.webhooks.settleDelivery, { attempt, deliveryId, status });
        const pump = () => t.mutation(internal.webhooks.pump, {});

        await expect(
            authenticatedAs(t, user).mutation(api.webhooks.testEndpoint, { endpointId })
        ).resolves.toBeTruthy();
        await pump();
        const first = only(await deliveries(t));
        expect(first.attempt).toBe(1);

        await settle(first._id, 1, 500);
        await pump();
        expect(only(await deliveries(t)).attempt).toBe(1);

        vi.advanceTimersByTime(61_000);
        await pump();
        expect(only(await deliveries(t)).attempt).toBe(2);

        await t.run((ctx) => ctx.db.patch(endpointId, { failures: MAX_FAILURES - 1 }));
        await settle(first._id, 1, 0);
        expect((await t.run((ctx) => ctx.db.get(endpointId)))?.disabledAt).toBeUndefined();
        await settle(first._id, 2, 0);
        expect((await t.run((ctx) => ctx.db.get(endpointId)))?.disabledAt).toBeDefined();
        await expect(deliveries(t)).resolves.toStrictEqual([]);
        await expect(events(t)).resolves.toStrictEqual([]);

        await expect(
            authenticatedAs(t, user).mutation(api.webhooks.testEndpoint, { endpointId })
        ).resolves.toBeTruthy();
        await expect(authenticatedAs(t, user).mutation(api.webhooks.testEndpoint, { endpointId })).resolves.toBeFalsy();
        await pump();
        const ping = only(await deliveries(t));
        await settle(ping._id, 1, 204);
        const healthy = await t.run((ctx) => ctx.db.get(endpointId));
        expect(healthy?.disabledAt).toBeUndefined();
        expect(healthy).toMatchObject({ failures: 0, lastDelivery: { status: 204 } });
        await expect(deliveries(t)).resolves.toStrictEqual([]);
        await expect(events(t)).resolves.toStrictEqual([]);
    });

    it("drops a removed endpoint's queued events instead of sending them", async () => {
        const t = setup();
        const user = await seedProUser(t);
        const endpointId = await endpointFor(t, user);
        await authenticatedAs(t, user).mutation(api.webhooks.testEndpoint, { endpointId });
        await authenticatedAs(t, user).mutation(api.webhooks.removeEndpoint, { endpointId });

        await t.mutation(internal.webhooks.pump, {});

        await expect(deliveries(t)).resolves.toStrictEqual([]);
        await expect(events(t)).resolves.toStrictEqual([]);
    });

    it("signs the way a stock HMAC-SHA256 verifier expects", async () => {
        const body = JSON.stringify({ id: "evt_1", type: "entry.filed" });
        const header = await runEdge(signatureHeader(SECRET, 1_800_000_000, body));
        const expected = createHmac("sha256", SECRET).update(`1800000000.${body}`).digest("hex");
        expect(header).toBe(`t=1800000000,v1=${expected}`);
    });

    it("refuses URLs that point the server at its own network", () => {
        const refused = [
            "http://hooks.example.com/x",
            "https://localhost/x",
            "https://127.0.0.1/x",
            "https://0x7f000001/x",
            "https://10.0.0.8/x",
            "https://169.254.169.254/latest",
            "https://192.168.1.10/x",
            "https://[::1]/x",
            "https://router.lan/x",
            "https://user:pass@hooks.example.com/x",
        ];
        expect(refused.filter((url) => Option.isSome(endpointUrl(url)))).toStrictEqual([]);
        expect(endpointUrl("https://hooks.zapier.com/hooks/catch/1/abc")).toStrictEqual(
            Option.some("https://hooks.zapier.com/hooks/catch/1/abc")
        );
    });
});

test("removes every webhook row when the account is deleted", async () => {
    const t = setup();
    const user = await seedProUser(t);
    await authenticatedAs(t, user).mutation(api.webhooks.setInboundToken, { token: TOKEN });
    await post(t, { amount: 2 });
    const endpointId = await endpointFor(t, user);
    await authenticatedAs(t, user).mutation(api.webhooks.testEndpoint, { endpointId });

    let done = false;
    while (!done) {
        ({ done } = await t.run((ctx) => runEdge(purgeUserBatch(ctx, user.userId))));
    }

    const left = await t.run(async (ctx) => [
        ...(await ctx.db.query("webhookTokens").collect()),
        ...(await ctx.db.query("webhookEndpoints").collect()),
        ...(await ctx.db.query("webhookDeliveries").collect()),
        ...(await ctx.db.query("webhookEvents").collect()),
        ...(await ctx.db.query("inboundWrites").collect()),
    ]);
    expect(left).toStrictEqual([]);
});
