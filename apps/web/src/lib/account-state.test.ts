import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import { PHOTO_REMINT_MS, photoUrlsQuery } from "@/components/dashboard/shell/photos";

import {
    accountStateOf,
    connectionsQuery,
    planQuery,
    pushEndpointQuery,
    reminderQuery,
    restoreAccountState,
    sessionRows,
} from "./account-state";
import { ledgerDependencies } from "./db";
import { LEDGER_CACHE_VERSION, snapshotOf, usableSnapshot } from "./ledger-cache";
import { silentConvex } from "./test-convex";

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

const cache = () => new QueryClient({ defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } } });

const plan = {
    expiresAtMs: NOW,
    payments: [],
    plan: "annual",
    price: null,
    state: "renews",
    store: "stripe",
    trialAvailable: false,
} as const;

const photos = (key: string) => photoUrlsQuery(undefined, [key]).queryKey;
const minted = (key: string) => [{ key, url: `https://photos.test/${key}` }];
const copiedKeys = (client: QueryClient) => accountStateOf(client, NOW).queries.map(({ queryKey }) => queryKey);

describe("account state copy", () => {
    it("copies listed answers and leaves everything else in memory", () => {
        const client = cache();
        client.setQueryData(planQuery.queryKey, plan);
        client.setQueryData(connectionsQuery.queryKey, []);
        client.setQueryData(pushEndpointQuery.queryKey, { endpoint: "https://push.test/a" });
        client.setQueryData(reminderQuery("https://push.test/a").queryKey, { dailyMinute: 480 });
        client.setQueryData(["billing", "unlocked"], true);
        client.setQueryData(["auth", "session"], { token: "secret" });

        expect(copiedKeys(client)).toStrictEqual([
            planQuery.queryKey,
            connectionsQuery.queryKey,
            pushEndpointQuery.queryKey,
            reminderQuery("https://push.test/a").queryKey,
        ]);
    });

    it("copies a reminder that is off, never a plan the server could not answer", () => {
        const client = cache();
        client.setQueryData(planQuery.queryKey, null);
        client.setQueryData(reminderQuery("https://push.test/a").queryKey, null);

        expect(copiedKeys(client)).toStrictEqual([reminderQuery("https://push.test/a").queryKey]);
    });

    it("copies only the photo links that are still inside the mint age", () => {
        const client = cache();
        client.setQueryData(photos("young"), minted("young"), { updatedAt: NOW - 49 * MINUTE });
        client.setQueryData(photos("old"), minted("old"), { updatedAt: NOW - PHOTO_REMINT_MS });

        expect(copiedKeys(client)).toStrictEqual([photos("young")]);
    });

    it("keeps a session token out of the copy", () => {
        const listed = [{ id: "s1", token: "secret", updatedAt: "2026-11-10T12:00:00.000Z", userAgent: "Firefox" }];

        expect(sessionRows(listed)).toStrictEqual([
            { id: "s1", updatedAt: Date.UTC(2026, 10, 10, 12), userAgent: "Firefox" },
        ]);
    });
});

describe("account state restore", () => {
    const saved = () => {
        const client = cache();
        client.setQueryData(planQuery.queryKey, plan, { updatedAt: NOW - 10 * MINUTE });
        client.setQueryData(photos("row"), minted("row"), { updatedAt: NOW - 40 * MINUTE });
        return accountStateOf(client, NOW);
    };

    it("restores answers with the time they were given", () => {
        const client = cache();
        restoreAccountState(client, saved(), NOW);

        expect(client.getQueryData(planQuery.queryKey)).toStrictEqual(plan);
        expect(client.getQueryState(planQuery.queryKey)?.dataUpdatedAt).toBe(NOW - 10 * MINUTE);
        expect(client.getQueryData(photos("row"))).toStrictEqual(minted("row"));
    });

    it("drops photo links that aged out while the copy sat on disk", () => {
        const client = cache();
        restoreAccountState(client, saved(), NOW + 15 * MINUTE);

        expect(client.getQueryData(photos("row"))).toBeUndefined();
        expect(client.getQueryData(planQuery.queryKey)).toStrictEqual(plan);
    });

    it("restores nothing from another user's copy or an older version", () => {
        const snapshot = snapshotOf(new DbClient(ledgerDependencies(silentConvex)), undefined, "owner", saved());
        const client = cache();

        restoreAccountState(client, usableSnapshot(snapshot, "someone-else")?.queries, NOW);
        restoreAccountState(
            client,
            usableSnapshot({ ...snapshot, version: LEDGER_CACHE_VERSION - 1 }, "owner")?.queries,
            NOW
        );
        expect(client.getQueryCache().getAll()).toStrictEqual([]);

        restoreAccountState(client, usableSnapshot(snapshot, "owner")?.queries, NOW);
        expect(client.getQueryData(planQuery.queryKey)).toStrictEqual(plan);
    });
});
