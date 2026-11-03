import * as Effect from "effect/Effect";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { setMeta, META_KEYS } from "@/data/app-meta-core";
import { setBoolSetting } from "@/data/settings-core";
import { migratedDatabase } from "@/db/test-database";

import { setCloudAuthenticated } from "./convex";
import { readNotifications } from "./notification-read";
import type { PendingWrite } from "./pending-writes-core";

const sent = vi.fn<(args: { text: string }) => Promise<unknown>>();

vi.mock("./cloud-runtime", () => ({
    cloudRuntime: { convex: { action: (_ref: unknown, args: { text: string }) => sent(args) } },
}));

const push = (id: string, text: string): PendingWrite => ({
    amount: 0,
    category: null,
    date: Date.UTC(2026, 10, 2),
    dedupeKey: `notification:expense:${id}`,
    id,
    income: false,
    note: "",
    text,
});

beforeEach(() => {
    sent.mockResolvedValue({ read: null, status: "ok" });
    setCloudAuthenticated(true);
});

afterEach(() => {
    setCloudAuthenticated(false);
    sent.mockReset();
});

test("sends only pushes that show an amount and are not logged yet", async () => {
    const db = migratedDatabase();
    await Effect.runPromise(setBoolSetting(db, "aiConsentV2", true));
    await Effect.runPromise(setBoolSetting(db, "aiEnrichment", true));
    await Effect.runPromise(
        setMeta(
            db,
            META_KEYS.pendingWriteLedger,
            JSON.stringify([{ at: Date.now(), id: "logged", key: null, txId: "tx" }])
        )
    );

    await Effect.runPromise(
        readNotifications(db, [
            push("code", "Banco\nYour sign-in code is 482913. Don't share it."),
            push("promo", "Banco\nGet 5% cashback this weekend!"),
            push("logged", "Banco\nYou paid $9.99 at Netflix"),
            push("buy", "Banco\nYou paid $12.40 at STARBUCKS"),
        ])
    );

    expect(sent.mock.calls.map(([args]) => args.text)).toStrictEqual(["Banco\nYou paid $12.40 at STARBUCKS"]);
});

test("sends nothing while Smart fill is off", async () => {
    const db = migratedDatabase();
    await Effect.runPromise(setBoolSetting(db, "aiConsentV2", true));
    await Effect.runPromise(setBoolSetting(db, "aiEnrichment", false));

    await Effect.runPromise(readNotifications(db, [push("buy", "Banco\nYou paid $12.40 at STARBUCKS")]));

    expect(sent).not.toHaveBeenCalled();
});
