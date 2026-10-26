import { advanceBudgetWindow } from "@outlayr/money/budget-window";
import { limitIn } from "@outlayr/money/valuation";
import { and, asc, desc, isNull, lte } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import Spotlight from "expo-core-spotlight";
import { Platform } from "react-native";

import { getMeta } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import { parseBoolSetting } from "@/data/settings-core";
import { loadValuation } from "@/data/valuation-source";
import type { Valuation } from "@/data/valuation-source";
import { budgets as budgetsTable, categories as categoriesTable, transactions as transactionsTable } from "@/db/schema";
import { formatDayHeader } from "@/domain/dates";
import { formatAmount, minorUnitsFor } from "@/domain/money";
import { translateNow } from "@/i18n/runtime";

import { budgetLink, transactionLink } from "./deep-links";
import { warnAndContinue } from "./warn-and-continue";

const SpotlightOperation = Schema.Literals(["availability", "clear", "index", "query"]);

export class SpotlightError extends Schema.TaggedError<SpotlightError>()("SpotlightError", {
    cause: Schema.Defect(),
    operation: SpotlightOperation,
}) {
    override get message(): string {
        return `Spotlight ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof SpotlightOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new SpotlightError({ cause, operation }), try: run });

/** A publish clears the domain and re-indexes it, so deletions need no reconciliation. */
const TRANSACTION_DOMAIN = "transactions";
const BUDGET_DOMAIN = "budgets";

/** Bounds the cost of rewriting the whole domain on every publish, not Spotlight's own capacity. */
const TRANSACTION_LIMIT = 500;

/**
 * Each `uniqueIdentifier` IS its `outlayr://` link: expo-core-spotlight opens it as a URL on tap. Failures are
 * swallowed so a failed index never takes down the write that triggered it.
 */
export const indexSpotlight = Effect.fn("Spotlight.index")(function* indexSpotlight(db: SpendDb, now = new Date()) {
    if (Platform.OS !== "ios") {
        return;
    }
    yield* Effect.gen(function* index() {
        if (!(yield* attempt("availability", () => Spotlight.isAvailable()))) {
            return;
        }

        const valuation = yield* loadValuation(db);
        const showCents = parseBoolSetting(yield* getMeta(db, "showCents"), true);
        const money = (value: number, code: string) => formatAmount(value, code, showCents);

        const categoryRows = yield* attempt("query", () =>
            db
                .select({
                    id: categoriesTable.id,
                    name: categoriesTable.name,
                })
                .from(categoriesTable)
                .where(isNull(categoriesTable.deletedAt))
        );
        const categoryName = new Map(categoryRows.map((row) => [row.id, row.name]));

        const halves = yield* Effect.all(
            [
                Effect.exit(indexTransactions(db, now, money, valuation, categoryName)),
                Effect.exit(indexBudgets(db, now, money, valuation, categoryName)),
            ],
            { concurrency: "unbounded" }
        );
        const failed = halves.find(Exit.isFailure);
        if (failed) {
            return yield* Effect.failCause(failed.cause);
        }
    }).pipe(warnAndContinue("[outlayr] spotlight index failed"));
});

type Money = (value: number, code: string) => string;

const indexTransactions = Effect.fn("Spotlight.indexTransactions")(function* indexTransactions(
    db: SpendDb,
    now: Date,
    money: Money,
    valuation: Valuation,
    categoryName: ReadonlyMap<string, string | null>
) {
    const rows = yield* attempt("query", () =>
        db
            .select({
                amount: transactionsTable.amount,
                categoryId: transactionsTable.categoryId,
                currency: transactionsTable.currency,
                date: transactionsTable.date,
                details: transactionsTable.details,
                id: transactionsTable.id,
                income: transactionsTable.income,
                note: transactionsTable.note,
            })
            .from(transactionsTable)
            .where(and(isNull(transactionsTable.deletedAt), lte(transactionsTable.date, now)))
            .orderBy(desc(transactionsTable.date))
            .limit(TRANSACTION_LIMIT)
    );

    yield* attempt("index", () => Spotlight.removeAllItemsFromDomain(TRANSACTION_DOMAIN));
    if (rows.length === 0) {
        return;
    }

    const untitled = translateNow("spotlight.entry");
    // Active language only: changing it terminates the app, and the index is rebuilt on every launch.
    const incomeKeyword = translateNow("common.income");
    const expenseKeyword = translateNow("common.expense");

    yield* attempt("index", () =>
        Spotlight.indexItems(
            rows.map((row) => {
                const category = row.categoryId ? (categoryName.get(row.categoryId) ?? null) : null;
                // Under its own code: the Log row this opens prints the stored amount unconverted.
                const code = row.currency ?? valuation.displayCurrency;
                const amount = money(row.amount, code);
                return {
                    contentDescription: [row.income ? `+${amount}` : amount, category, formatDayHeader(row.date, now)]
                        .filter(Boolean)
                        .join(" · "),
                    domainIdentifier: TRANSACTION_DOMAIN,
                    keywords: [
                        // At the currency's minor units: the column is major units, so 12.4 would miss the "12.40" the
                        // Log prints. Spotlight matches keywords by token prefix, so "12" still hits.
                        ...[row.note, category, row.details, row.amount.toFixed(minorUnitsFor(code))].filter(
                            (value): value is string => Boolean(value)
                        ),
                        row.income ? incomeKeyword : expenseKeyword,
                    ],
                    lastUsedDate: row.date.getTime(),
                    // `note` can be empty, and a blank Spotlight title renders as an untappable-looking row.
                    title: row.note.trim() || category || untitled,
                    uniqueIdentifier: transactionLink(row.id),
                };
            })
        )
    );
});

const indexBudgets = Effect.fn("Spotlight.indexBudgets")(function* indexBudgets(
    db: SpendDb,
    now: Date,
    money: Money,
    valuation: Valuation,
    categoryName: ReadonlyMap<string, string | null>
) {
    const rows = yield* attempt("query", () =>
        db
            .select({
                amount: budgetsTable.amount,
                amountUsd: budgetsTable.amountUsd,
                categoryId: budgetsTable.categoryId,
                currency: budgetsTable.currency,
                id: budgetsTable.id,
                name: budgetsTable.name,
                startDate: budgetsTable.startDate,
                type: budgetsTable.type,
            })
            .from(budgetsTable)
            .where(isNull(budgetsTable.deletedAt))
            .orderBy(asc(budgetsTable.dateCreated))
    );

    yield* attempt("index", () => Spotlight.removeAllItemsFromDomain(BUDGET_DOMAIN));
    if (rows.length === 0) {
        return;
    }

    const unnamed = translateNow("spotlight.budget.fallback");
    const budgetKeyword = translateNow("spotlight.budget.keyword");

    yield* attempt("index", () =>
        Spotlight.indexItems(
            rows.map((row) => {
                const name =
                    (row.name?.trim() ? row.name.trim() : null) ??
                    (row.categoryId ? categoryName.get(row.categoryId) : null) ??
                    null;
                const window = advanceBudgetWindow(row.startDate ?? now, row.type, now);
                return {
                    // The limit, not what is left: results are not re-indexed as you spend, so "left" would go stale.
                    contentDescription: translateNow("spotlight.budget.limit", {
                        amount: money(
                            limitIn(row, window.start, valuation.displayCurrency, valuation.rates),
                            valuation.displayCurrency
                        ),
                    }),
                    domainIdentifier: BUDGET_DOMAIN,
                    keywords: [name, budgetKeyword].filter((value): value is string => Boolean(value)),
                    title: name ? translateNow("spotlight.budget.title", { name }) : unnamed,
                    uniqueIdentifier: budgetLink(row.id),
                };
            })
        )
    );
});

export const clearSpotlight = Effect.fn("Spotlight.clear")(function* clearSpotlight() {
    if (Platform.OS !== "ios") {
        return;
    }
    yield* attempt("clear", () => Spotlight.removeAllItems()).pipe(warnAndContinue("[outlayr] spotlight clear failed"));
});
