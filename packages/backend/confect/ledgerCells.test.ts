/// <reference types="vite/client" />

import { compareLedgerCells, LEDGER_CELLS_VERSION, ledgerCellsOf } from "@outlayr/money/ledger-cells";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { authenticatedAs, seedProUser } from "./test.helpers";
import type { SeededIdentity } from "./test.helpers";

function harness() {
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    return t;
}

const modules = import.meta.glob("../convex/**/*.ts");

type TestClient = TestConvex<typeof schema>;
type PushRow = FunctionArgs<typeof api.sync.push>["rows"][number];

const DAY_MS = 86_400_000;
const FIRST_DAY = Date.UTC(2026, 0, 25);
const DAYS = 60;
const LOCAL_IDS = [
    "entry-1",
    "entry-2",
    "entry-3",
    "entry-4",
    "entry-5",
    "transfer-1",
    "transfer-2",
    "payment-1",
    "move-1",
];

function seededRandom(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
        return state / 2 ** 32;
    };
}

function ledgerWriter(seed: number) {
    const random = seededRandom(seed);
    const pick = <T>(values: readonly T[]) => values[Math.floor(random() * values.length)] as T;
    const deleted = new Set<string>();
    let clock = 0;

    const fields = (localId: string): Pick<PushRow, "fields" | "table"> => {
        const date = FIRST_DAY + Math.floor(random() * DAYS) * DAY_MS + Math.floor(random() * DAY_MS);
        const amount = random() * 100;
        const amountUsd = random() < 0.25 ? null : random() * 100;
        if (localId.startsWith("transfer")) {
            return {
                fields: {
                    date,
                    dateCreated: date,
                    day: date,
                    exchangeRate: null,
                    exchangeRateType: null,
                    fromAccountId: pick(["cash", "bank"]),
                    fromAmount: amount,
                    fromAmountUsd: amountUsd,
                    fromCurrency: pick(["USD", "VES"]),
                    month: date,
                    note: "",
                    toAccountId: pick(["cash", "bank"]),
                    toAmount: random() * 100,
                    toAmountUsd: amountUsd,
                    toCurrency: pick(["USD", "VES"]),
                },
                table: "transfers",
            };
        }
        if (localId.startsWith("payment")) {
            return {
                fields: { amount, amountUsd, date, planId: pick(["plan-1", "plan-2"]) },
                table: "outsidePayments",
            };
        }
        if (localId.startsWith("move")) {
            return {
                fields: { accountId: pick(["cash", "bank"]), amount, amountUsd, date, note: "" },
                table: "outsideMoves",
            };
        }
        return {
            fields: {
                accountId: pick(["cash", "bank", null]),
                amount,
                amountUsd,
                categoryId: null,
                currency: pick(["USD", "VES"]),
                customColor: null,
                date,
                day: date,
                details: null,
                emoji: null,
                exchangeRate: null,
                exchangeRateType: null,
                icon: null,
                imageColor: null,
                imageKey: null,
                income: random() < 0.3,
                month: date,
                note: "",
                onceRecurring: false,
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: 0,
            },
            table: "transactions",
        };
    };

    return (count: number): PushRow[] =>
        Array.from({ length: count }, () => {
            const localId = pick(LOCAL_IDS);
            clock += 1;
            const remove = random() < 0.2;
            const restoredAt = !remove && deleted.delete(localId) ? clock : undefined;
            if (remove) {
                deleted.add(localId);
            }
            // SAFETY: `fields` pairs each table with its own field set; the union cannot see that through a spread.
            return {
                ...fields(localId),
                deletedAt: remove ? clock : null,
                localId,
                restoredAt,
                updatedAt: clock,
            } as PushRow;
        });
}

const push = (t: TestClient, owner: SeededIdentity, rows: PushRow[], deviceId = "device-aaaa") =>
    authenticatedAs(t, owner).mutation(api.sync.push, { deviceId, rows });

const settle = (t: TestClient) => t.finishAllScheduledFunctions(vi.runAllTimers);

async function cellsOfRows(t: TestClient, userId: string) {
    const live = <Row extends { deletedAt: number | null; userId: string }>(rows: Row[]) =>
        rows.filter((row) => row.userId === userId && row.deletedAt === null);
    return await t.run(async (ctx) =>
        ledgerCellsOf({
            outsideMoves: live(await ctx.db.query("outsideMoves").collect()),
            outsidePayments: live(await ctx.db.query("outsidePayments").collect()),
            transactions: live(await ctx.db.query("transactions").collect()),
            transfers: live(await ctx.db.query("transfers").collect()),
        })
    );
}

async function storedMonths(t: TestClient, userId: string) {
    return await t.run((ctx) =>
        ctx.db
            .query("ledgerCells")
            .withIndex("by_user_and_month", (q) => q.eq("userId", userId))
            .collect()
    );
}

async function expectCellsToMatchRows(t: TestClient, userId: string) {
    const months = await storedMonths(t, userId);
    const expected = await cellsOfRows(t, userId);
    expect(months.flatMap((month) => month.cells).sort(compareLedgerCells)).toStrictEqual(expected);
    const misfiled = months.filter(
        ({ cells, month }) => cells.length === 0 || cells.some((cell) => !cell.dateKey.startsWith(month))
    );
    expect(misfiled).toStrictEqual([]);
    return expected;
}

describe("ledger cells", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("stay equal to a fold of the live rows through edits, moves, deletes and restores from two devices", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        await t.mutation(internal.ledgerCells.rebuild, { step: null, userId: owner.userId });
        const write = ledgerWriter(7);

        let seen = 0;
        for (let round = 0; round < 25; round += 1) {
            await push(t, owner, write(1 + (round % 5)), round % 2 === 0 ? "device-aaaa" : "device-bbbb");
            await settle(t);
            seen = Math.max(seen, (await expectCellsToMatchRows(t, owner.userId)).length);
        }
        expect(seen).toBeGreaterThan(5);
    });

    it("are not kept for a ledger that was never built", async () => {
        const t = harness();
        const owner = await seedProUser(t);

        await push(t, owner, ledgerWriter(3)(20));
        await settle(t);

        await expect(storedMonths(t, owner.userId)).resolves.toStrictEqual([]);
    });

    it("match the rows after a rebuild that pushes landed in the middle of", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const write = ledgerWriter(11);
        await push(t, owner, write(40));

        await t.mutation(internal.ledgerCells.rebuild, { step: null, userId: owner.userId });
        await push(t, owner, write(15), "device-bbbb");
        await settle(t);

        const cells = await expectCellsToMatchRows(t, owner.userId);
        expect(cells.length).toBeGreaterThan(5);
        const state = await t.run((ctx) =>
            ctx.db
                .query("syncState")
                .withIndex("by_user", (q) => q.eq("userId", owner.userId))
                .unique()
        );
        expect(state?.cells).toStrictEqual({ building: false, run: 1, version: LEDGER_CELLS_VERSION });
    });
});
