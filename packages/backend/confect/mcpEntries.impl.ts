import { FunctionImpl, GroupImpl } from "@confect/server";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { decimalsFor, isPickableCurrency } from "@outlayr/money/currency";
import type { RateLookup } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import type { TransactionsDoc } from "./_generated/docs";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "./_generated/services";
import { dieAsConvexError } from "./lib/convexError";
import { refuseWhileDeleting, seqCounter } from "./lib/syncGuards";
import {
    CategoryRequired,
    choicesOf,
    EntryNeedsPro,
    entryInstant,
    fold,
    IdempotencyKeyReused,
    InvalidAmount,
    keyedLocalId,
    localDate,
    localMidnights,
    MCP_DEVICE_ID,
    MEMORY_WINDOW,
    named,
    UnknownCurrency,
} from "./mcpEntries";
import spec from "./mcpEntries.spec";
import { utcOffsetOf } from "./mcpLedger";
import { setting } from "./mcpLedger.impl";
import { isPro } from "./revenuecat";

const filedBefore = Effect.fn("McpEntries.filedBefore")(function* filedBefore(
    userId: string,
    note: string,
    income: boolean,
    live: ReadonlySet<string>
) {
    if (note === "") {
        return null;
    }
    const reader = yield* DatabaseReader;
    // ponytail: merchant memory reads the newest 500 rows; add a by_user_and_note index if that misses old merchants.
    const recent = yield* reader
        .table("transactions")
        .index("by_user_and_seq", (q) => q.eq("userId", userId), "desc")
        .take(MEMORY_WINDOW);
    const newest = recent
        .filter(
            (row) =>
                row.deletedAt === null &&
                row.income === income &&
                row.categoryId !== null &&
                live.has(row.categoryId) &&
                fold(row.note) === fold(note)
        )
        .reduce<TransactionsDoc | null>((best, row) => (best === null || row.date > best.date ? row : best), null);
    return newest?.categoryId ?? null;
});

const logEntry = FunctionImpl.make(
    databaseSchema,
    spec,
    "logEntry",
    Effect.fn("McpEntries.logEntry")(
        function* logEntry(args) {
            const ctx = yield* MutationCtx;
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const { userId } = args.user;
            if (!(yield* isPro(ctx, userId))) {
                return yield* new EntryNeedsPro();
            }
            yield* refuseWhileDeleting(userId);

            const income = args.kind === "income";
            const currency = args.currency?.trim().toUpperCase() || (yield* setting(userId, "currency")) || "USD";
            if (!isPickableCurrency(currency)) {
                return yield* new UnknownCurrency({ currency });
            }
            if (!Number.isFinite(args.amount)) {
                return yield* new InvalidAmount({ reason: "notANumber" });
            }
            const amount = roundMoney(Math.abs(args.amount), decimalsFor(currency));
            if (amount === 0) {
                return yield* new InvalidAmount({ reason: "zero" });
            }

            const [categoryRows, accountRows] = yield* Effect.all(
                [
                    reader
                        .table("categories")
                        .index("by_user_and_seq", (q) => q.eq("userId", userId))
                        .collect(),
                    reader
                        .table("accounts")
                        .index("by_user_and_seq", (q) => q.eq("userId", userId))
                        .collect(),
                ],
                { concurrency: "unbounded" }
            );
            const categories = categoryRows.filter((row) => row.deletedAt === null && row.income === income);
            const accounts = accountRows.filter((row) => row.deletedAt === null);
            const note = args.note?.trim() ?? "";
            const remembered = args.category
                ? null
                : yield* filedBefore(userId, note, income, new Set(categories.map((row) => row.localId)));
            const category = args.category
                ? yield* named(categories, args.category, `${args.kind} category`)
                : categories.find((row) => row.localId === remembered);
            if (!category) {
                return yield* new CategoryRequired({ choices: choicesOf(categories), kind: args.kind });
            }
            const account = args.account ? yield* named(accounts, args.account, "account") : null;

            const latest = yield* reader
                .table("transactions")
                .index("by_user_and_seq", (q) => q.eq("userId", userId), "desc")
                .first();
            // ponytail: one offset from the newest row; an entry across a DST change lands an hour
            // off its midnight. Sync the IANA zone in appMeta to fix.
            const offsetMs = Option.match(latest, { onNone: () => 0, onSome: (row) => utcOffsetOf(row.day) });
            const now = yield* Clock.currentTimeMillis;
            const date = yield* entryInstant(args.date, now, offsetMs);
            const { idempotencyKey } = args;
            const localId = idempotencyKey ? yield* keyedLocalId(userId, idempotencyKey) : crypto.randomUUID();
            const entry = {
                account: account?.name ?? null,
                amount,
                category: category.name,
                currency,
                date: localDate(date, offsetMs),
                kind: args.kind,
                note: note || (category.name ?? ""),
            };

            const logged = yield* reader
                .table("transactions")
                .get("by_user_and_localId", userId, localId)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
            if (logged) {
                if (logged.amount !== amount || logged.currency !== currency || logged.income !== income) {
                    return yield* new IdempotencyKeyReused();
                }
                return { ...entry, date: localDate(logged.date, offsetMs), note: logged.note };
            }

            const lookup: RateLookup = (quote, rateType, day) =>
                Effect.promise(() =>
                    ctx.db
                        .query("exchangeRates")
                        .withIndex("by_quote_and_rateType_and_date", (q) =>
                            q.eq("quote", quote).eq("rateType", rateType).lte("date", day)
                        )
                        .order("desc")
                        .first()
                );
            const counter = yield* seqCounter(userId);
            const valuation = yield* canonicalUsd(lookup, {
                amount,
                currency,
                date: new Date(date),
                displayCurrency: currency,
            });
            yield* writer.table("transactions").insert({
                ...valuation,
                ...localMidnights(date, offsetMs),
                accountId: account?.localId ?? null,
                amount,
                categoryId: category.localId,
                currency,
                customColor: null,
                date,
                deletedAt: null,
                details: null,
                deviceId: MCP_DEVICE_ID,
                emoji: null,
                feeForId: null,
                feeRate: null,
                icon: null,
                imageColor: null,
                imageKey: null,
                income,
                installmentId: null,
                localId,
                note: entry.note,
                onceRecurring: false,
                paidVia: null,
                receipt: null,
                recurringAnchorDay: null,
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: 0,
                seq: counter.nextSeq,
                transferId: null,
                updatedAt: now,
                userId,
            });
            yield* counter.advanceTo(counter.nextSeq + 1);
            return entry;
        },
        Effect.catchTags({
            AccountDeleting: dieAsConvexError,
            AmbiguousName: dieAsConvexError,
            CategoryRequired: dieAsConvexError,
            EntryNeedsPro: dieAsConvexError,
            IdempotencyKeyReused: dieAsConvexError,
            InvalidAmount: dieAsConvexError,
            InvalidDate: dieAsConvexError,
            UnknownCurrency: dieAsConvexError,
            UnknownName: dieAsConvexError,
        }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(logEntry), GroupImpl.finalize);
