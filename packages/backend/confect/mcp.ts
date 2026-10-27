import { McpServer, tool } from "@convex-dev/mcp";
import { env } from "@outlayr/env/backend";
import type { Auth } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "../convex/_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../convex/_generated/server";
import { optionalUserId } from "./lib/auth";
import { logEntryInput, logEntryResult } from "./mcpEntries";
import {
    accountBalancesResult,
    budgetStatusResult,
    recentTransactionsResult,
    spendingSummaryResult,
    upcomingChargesResult,
} from "./mcpLedger";

const READ = "ledger:read";
const WRITE = "ledger:write";

function hasRunQuery(ctx: { auth: Auth }): ctx is ActionCtx | MutationCtx | QueryCtx {
    return "runQuery" in ctx;
}

export const mcp: McpServer = new McpServer(components.mcp, {
    consentUrl: env.MCP_CONSENT_URL ?? "https://tryoutlayr.com/connect",
    instructions:
        "Read the signed-in user's Outlayr ledger, and add expenses or income to it. Amounts are in each entry's own currency unless a tool says main currency. Everything reflects what the user's devices last synced.",
    name: "com.tryoutlayr/ledger",
    scopes: {
        [READ]: "Read your accounts, balances, budgets and entries",
        [WRITE]: "Add expenses and income for you",
    },
    title: "Outlayr ledger",
    tools: {
        account_balances: tool({
            annotations: { readOnlyHint: true },
            description:
                "Every account's balance today, as on Outlayr's Accounts screen: in the account's own currency and in the user's main currency, with its kind and what the user owns, owes and is worth in total. A kind is `asset`, `liability`, or `person`: someone the user lent to or borrowed from, positive when they owe the user and negative when the user owes them, so it counts as owned or owed by its sign. People are listed here though the Accounts screen leaves them out. Entries and transfers dated later than now are not counted. `exact` is false when a rate was missing and part of a figure stayed at face value.",
            handler: (ctx, _args, user) => ctx.runQuery(internal.mcpLedger.accountBalances, { user }),
            returns: accountBalancesResult,
            scope: READ,
        }),
        budget_status: tool({
            annotations: { readOnlyHint: true },
            description:
                "Where the user's budgets stand in the current window, as on Outlayr's Budgets screen, in their main currency: the overall budget and each category budget with its period, window dates (`from` and `to`, inclusive), limit, carry-over from earlier windows when rollover is on, the effective limit, spent, remaining and whether it is over. A category budget counts its subcategories, which are listed.",
            handler: (ctx, _args, user) => ctx.runQuery(internal.mcpLedger.budgetStatus, { user }),
            returns: budgetStatusResult,
            scope: READ,
        }),
        log_entry: tool({
            annotations: { destructiveHint: false },
            args: logEntryInput,
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
            handler: (ctx, args, user) => ctx.runMutation(internal.mcpEntries.logEntry, { user, ...args }),
            returns: logEntryResult,
            scope: WRITE,
        }),
        recent_transactions: tool({
            annotations: { readOnlyHint: true },
            args: { limit: v.optional(v.number()) },
            description:
                "The signed-in user's most recent Outlayr entries, newest first: date, amount, currency, category, note, and whether each is an expense or income. Reads what the user's devices last synced. `limit` defaults to 20, at most 50.",
            handler: (ctx, args, user) => ctx.runQuery(internal.mcpLedger.recentTransactions, { user, ...args }),
            returns: recentTransactionsResult,
            scope: READ,
        }),
        spending_summary: tool({
            annotations: { readOnlyHint: true },
            args: { monthsAgo: v.optional(v.number()) },
            description:
                "What the signed-in user spent and earned in one budgeting month, in their main currency, with spending by category: the same figures as Outlayr's Insights screen. A month starts on the user's payday setting. `monthsAgo` is 0 for the current month (default), 1 for the previous one, and so on. Reads what the user's devices last synced.",
            handler: (ctx, args, user) => ctx.runQuery(internal.mcpLedger.spendingSummary, { user, ...args }),
            returns: spendingSummaryResult,
            scope: READ,
        }),
        upcoming_charges: tool({
            annotations: { readOnlyHint: true },
            description:
                "The user's recurring and future-dated entries, soonest first, as on Outlayr's Upcoming list: the date each next lands, its amount and currency, category, note, cadence and end date. `monthlyCost` is what the recurring expenses cost per month, per currency, converted into the main currency where a rate allows.",
            handler: (ctx, _args, user) => ctx.runQuery(internal.mcpLedger.upcomingCharges, { user }),
            returns: upcomingChargesResult,
            scope: READ,
        }),
    },
    version: "0.1.0",
});

export const { authorize, createApiKey, findAuthRequest, getAuthRequest, listConnections, revokeConnection } = mcp.api({
    getUserId: async (ctx) => (hasRunQuery(ctx) ? await optionalUserId(ctx) : null),
});

export const { createApiKeyForUser } = mcp.internalApi();
