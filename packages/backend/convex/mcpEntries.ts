import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { decimalsFor, isPickableCurrency } from "@outlayr/money/currency";
import type { RateLookup } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import { defineMcpMutation, mcpCallerValidator } from "convex-mcp-gateway";
import type { McpToolRegistration } from "convex-mcp-gateway";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { sha256Hex } from "./lib/sha256Hex";
import { setting, utcOffsetOf } from "./mcpLedger";
import { isPro } from "./revenuecat";
import { refuseWhileDeleting, seqCounter } from "./sync";

export const MCP_DEVICE_ID = "mcp";

const MEMORY_WINDOW = 500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const logEntryArgs = {
    account: v.optional(v.string()),
    amount: v.number(),
    caller: mcpCallerValidator,
    category: v.optional(v.string()),
    currency: v.optional(v.string()),
    date: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    kind: v.union(v.literal("expense"), v.literal("income")),
    note: v.optional(v.string()),
};

const fold = (name: string) => name.trim().toLowerCase();

const choices = (rows: { name: string | null }[]) =>
    `Use one of: ${[...new Set(rows.flatMap((row) => (row.name ? [row.name] : [])))].join(", ") || "none"}.`;

const localDate = (instant: number, offsetMs: number) => new Date(instant + offsetMs).toISOString().slice(0, 10);

function named<T extends { name: string | null }>(rows: T[], wanted: string, label: string): T {
    const matches = rows.filter((row) => row.name !== null && fold(row.name) === fold(wanted));
    const [match] = matches;
    if (matches.length === 1 && match) {
        return match;
    }
    if (matches.length > 1) {
        throw new ConvexError(`More than one ${label} is named "${wanted}". Ask the user to rename one in Outlayr.`);
    }
    throw new ConvexError(`No ${label} is named "${wanted}". ${choices(rows)}`);
}

async function filedBefore(
    ctx: MutationCtx,
    userId: string,
    note: string,
    income: boolean,
    live: ReadonlySet<string>
): Promise<string | null> {
    if (note === "") {
        return null;
    }
    // ponytail: merchant memory reads the newest 500 rows; add a by_user_and_note index if that misses old merchants.
    const recent = await ctx.db
        .query("transactions")
        .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
        .order("desc")
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
        .reduce<Doc<"transactions"> | null>((best, row) => (best === null || row.date > best.date ? row : best), null);
    return newest?.categoryId ?? null;
}

function entryInstant(date: string | undefined, now: number, offsetMs: number): number {
    const wanted = date?.trim();
    if (!wanted || wanted === localDate(now, offsetMs)) {
        return now;
    }
    const noon = Date.parse(`${wanted}T12:00:00Z`);
    if (!ISO_DATE.test(wanted) || Number.isNaN(noon) || localDate(noon, 0) !== wanted) {
        throw new ConvexError(`date must be a calendar day as YYYY-MM-DD; got "${wanted}".`);
    }
    return noon - offsetMs;
}

function localMidnights(instant: number, offsetMs: number) {
    const local = new Date(instant + offsetMs);
    return {
        day: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs,
        month: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs,
    };
}

async function keyedLocalId(userId: string, key: string): Promise<string> {
    const hex = await sha256Hex(`${userId}:${key}`);
    const variant = ((Number.parseInt(hex.charAt(16), 16) % 4) + 8).toString(16);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const logEntry = internalMutation({
    args: logEntryArgs,
    handler: async (ctx, args) => {
        const userId = args.caller.subject;
        if (!(await isPro(ctx, userId))) {
            throw new ConvexError(
                "Adding entries needs Outlayr Pro: only Pro syncs, so the user's devices would never receive it."
            );
        }
        await refuseWhileDeleting(ctx, userId);

        const income = args.kind === "income";
        const currency = args.currency?.trim().toUpperCase() || (await setting(ctx, userId, "currency")) || "USD";
        if (!isPickableCurrency(currency)) {
            throw new ConvexError(`"${currency}" is not a currency Outlayr knows. Use an ISO 4217 code such as USD.`);
        }
        if (!Number.isFinite(args.amount)) {
            throw new ConvexError("amount must be a number.");
        }
        const amount = roundMoney(Math.abs(args.amount), decimalsFor(currency));
        if (amount === 0) {
            throw new ConvexError("amount must not be zero.");
        }

        const [categoryRows, accountRows] = await Promise.all([
            ctx.db
                .query("categories")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
            ctx.db
                .query("accounts")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .collect(),
        ]);
        const categories = categoryRows.filter((row) => row.deletedAt === null && row.income === income);
        const accounts = accountRows.filter((row) => row.deletedAt === null);
        const note = args.note?.trim() ?? "";
        const remembered = args.category
            ? null
            : await filedBefore(ctx, userId, note, income, new Set(categories.map((row) => row.localId)));
        const category = args.category
            ? named(categories, args.category, `${args.kind} category`)
            : categories.find((row) => row.localId === remembered);
        if (!category) {
            throw new ConvexError(`Pass a category for this ${args.kind}. ${choices(categories)}`);
        }
        const account = args.account ? named(accounts, args.account, "account") : null;

        const latest = await ctx.db
            .query("transactions")
            .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
            .order("desc")
            .first();
        // ponytail: one offset from the newest row; an entry across a DST change lands an hour
        // off its midnight. Sync the IANA zone in appMeta to fix.
        const offsetMs = latest ? utcOffsetOf(latest.day) : 0;
        const now = Date.now();
        const date = entryInstant(args.date, now, offsetMs);
        const localId = args.idempotencyKey ? await keyedLocalId(userId, args.idempotencyKey) : crypto.randomUUID();
        const entry = {
            account: account?.name ?? null,
            amount,
            category: category.name,
            currency,
            date: localDate(date, offsetMs),
            kind: args.kind,
            note: note || (category.name ?? ""),
        };

        const logged = await ctx.db
            .query("transactions")
            .withIndex("by_user_and_localId", (q) => q.eq("userId", userId).eq("localId", localId))
            .unique();
        if (logged) {
            if (logged.amount !== amount || logged.currency !== currency || logged.income !== income) {
                throw new ConvexError("This idempotencyKey was already used for a different entry.");
            }
            return { ...entry, date: localDate(logged.date, offsetMs), note: logged.note };
        }

        const lookup: RateLookup = async (quote, rateType, day) => {
            const row = await ctx.db
                .query("exchangeRates")
                .withIndex("by_quote_and_rateType_and_date", (q) =>
                    q.eq("quote", quote).eq("rateType", rateType).lte("date", day)
                )
                .order("desc")
                .first();
            return row ? { date: row.date, rate: row.rate } : null;
        };
        const counter = await seqCounter(ctx, userId);
        await ctx.db.insert("transactions", {
            ...(await canonicalUsd(lookup, { amount, currency, date: new Date(date), displayCurrency: currency })),
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
            recurringAnchorDay: null,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: 0,
            seq: counter.nextSeq,
            transferId: null,
            updatedAt: now,
            userId,
        });
        await counter.advanceTo(counter.nextSeq + 1);
        return entry;
    },
});

export const entryTools: McpToolRegistration[] = [
    defineMcpMutation({
        annotations: { destructiveHint: false },
        args: logEntryArgs,
        description: [
            "Adds one expense or income to the signed-in user's Outlayr ledger. Their devices receive it on the next sync, as if they had logged it in the app. Needs Outlayr Pro. Returns the entry as saved.",
            "`amount` is positive; `kind` says which way the money moved.",
            "`currency` is an ISO 4217 code, default the user's main currency.",
            "`category` is one of the user's category names for that kind, any case. Omitted, Outlayr files it where the same note went last time. A wrong or missing category fails and lists the names.",
            "`note` is the merchant or a short description.",
            "`date` is YYYY-MM-DD in the user's time zone, default now.",
            "`account` is an account name, optional.",
            "`idempotencyKey` is any unique string for this entry: send the same one on a retry so it is not logged twice.",
        ].join(" "),
        fn: internal.mcpEntries.logEntry,
        identityArg: "caller",
        metadata: { auditArgs: false, auditErrorMessage: false },
        name: "log_entry",
    }),
];
