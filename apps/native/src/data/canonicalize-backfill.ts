import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { utcDateString } from "@outlayr/money/dates";
import { and, count, eq, isNotNull, isNull, min, ne, not, or } from "drizzle-orm";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import type { Database } from "@/db/client";
import { accounts, budgets, exchangeRates, mainBudget, transactions } from "@/db/schema";
import { DEFAULT_CURRENCY } from "@/domain/money";
import type { ValuationCoverage } from "@/domain/valuation-coverage";

import { frozenUsdAmount } from "./frozen-usd";
import { localRateLookup } from "./rates";

// Sliced so a large ledger doesn't value itself in one burst: each row's lookup and UPDATE are synchronous here.
export const CANONICALIZE_BATCH = 250;

// `await` on this driver only reaches the microtask queue, which drains before the UI gets a frame; a timer yields.
function yieldToUi(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

// `bootstrap` seeds the default unconditionally, so a stored default proves nothing without the chosen marker; any
// other code can only have come from the picker.
async function statedCurrency(db: SpendDb): Promise<string | null> {
    const stored = await getMeta(db, META_KEYS.currency);
    if (stored === null) {
        return null;
    }
    if (stored !== DEFAULT_CURRENCY) {
        return stored;
    }
    const chosen = await getMeta(db, META_KEYS.currencyChosen);
    return chosen === "true" ? stored : null;
}

// Stamps only a currency the user stated: the stamp is irreversible, and a stamped USD row freezes at rate 1 unchecked.
export async function stampLedgerCurrency(db: SpendDb): Promise<number> {
    const display = await statedCurrency(db);
    if (display === null) {
        return 0;
    }
    let stamped = 0;

    /* oxlint-disable no-await-in-loop -- each table counts the rows it is about to stamp and then stamps them under the same predicate, and `await` on this driver only reaches the microtask queue (see yieldToUi below), so issuing the tables together would overlap no I/O while letting the two halves of that pair interleave */
    for (const table of [transactions, budgets, mainBudget] as const) {
        const pending = await db.select({ id: table.id }).from(table).where(isNull(table.currency));
        if (pending.length === 0) {
            continue;
        }
        await db.update(table).set({ currency: display }).where(isNull(table.currency));
        stamped += pending.length;
    }
    /* oxlint-enable no-await-in-loop */

    return stamped;
}

// Shared with the coverage readout: a row naming no currency isn't backlog, and counting it reports one never draining.
function uncanonicalized() {
    return and(
        isNull(transactions.amountUsd),
        isNotNull(transactions.currency),
        isNull(transactions.deletedAt),
        or(
            isNull(transactions.exchangeRateType),
            not(eq(transactions.exchangeRateType, "custom")),
            isNotNull(transactions.exchangeRate)
        )
    );
}

export async function backfillCanonicalUsd(db: SpendDb): Promise<number> {
    const lookup = localRateLookup(db);
    let valued = 0;
    // A row this pass can't value stays in the predicate, so the cursor steps over it or the next slice re-reads it.
    let cursor = 0;

    /* oxlint-disable no-await-in-loop -- the next slice's offset is `cursor`, which only the previous slice's landed count can produce, so the slices cannot be issued together */
    for (;;) {
        const pending = await db
            .select({
                amount: transactions.amount,
                currency: transactions.currency,
                date: transactions.date,
                exchangeRate: transactions.exchangeRate,
                exchangeRateType: transactions.exchangeRateType,
                id: transactions.id,
            })
            .from(transactions)
            .where(uncanonicalized())
            .orderBy(transactions.id)
            .limit(CANONICALIZE_BATCH)
            .offset(cursor);

        if (pending.length === 0) {
            return valued;
        }

        let valuedInBatch = 0;
        let removedFromBacklog = 0;
        for (const row of pending) {
            const canonical = await canonicalUsd(lookup, {
                amount: row.amount,
                currency: row.currency,
                date: row.date,
                displayCurrency: row.currency ?? DEFAULT_CURRENCY,
                exchangeRate: row.exchangeRate,
                exchangeRateType:
                    row.exchangeRateType === "custom" ||
                    row.exchangeRateType === "eur_reference" ||
                    row.exchangeRateType === "official"
                        ? row.exchangeRateType
                        : null,
            });
            if (canonical.amountUsd === null) {
                if (row.exchangeRate !== null && canonical.exchangeRate === null) {
                    await db
                        .update(transactions)
                        .set({ exchangeRate: null, exchangeRateType: canonical.exchangeRateType })
                        .where(eq(transactions.id, row.id));
                    if (canonical.exchangeRateType === "custom") {
                        removedFromBacklog += 1;
                    }
                }
                continue;
            }
            await db.update(transactions).set(canonical).where(eq(transactions.id, row.id));
            valuedInBatch += 1;
            removedFromBacklog += 1;
        }

        valued += valuedInBatch;
        cursor += pending.length - removedFromBacklog;

        if (pending.length < CANONICALIZE_BATCH) {
            return valued;
        }
        await yieldToUi();
    }
    /* oxlint-enable no-await-in-loop */
}

export async function backfillBudgetUsd(db: SpendDb): Promise<number> {
    const lookup = localRateLookup(db);
    let valued = 0;

    /* oxlint-disable no-await-in-loop -- reads and writes are synchronous on this driver (see CANONICALIZE_BATCH above), so running the two tables together would overlap no I/O while interleaving each table's read with the other's writes */
    for (const table of [budgets, mainBudget] as const) {
        const pending = await db
            .select({
                amount: table.amount,
                currency: table.currency,
                dateCreated: table.dateCreated,
                id: table.id,
                startDate: table.startDate,
            })
            .from(table)
            .where(and(isNull(table.amountUsd), isNull(table.deletedAt)));

        /* oxlint-disable no-await-in-loop -- the rate lookup and the UPDATE are both synchronous on this driver (see CANONICALIZE_BATCH above), so issuing the rows together overlaps no I/O and only lets every target's write pile into one microtask drain */
        for (const row of pending) {
            if (row.currency === null) {
                continue;
            }
            const { amountUsd } = await canonicalUsd(lookup, {
                amount: row.amount,
                currency: row.currency,
                date: row.dateCreated ?? row.startDate ?? new Date(),
                displayCurrency: row.currency,
            });
            if (amountUsd === null) {
                continue;
            }
            await db.update(table).set({ amountUsd }).where(eq(table.id, row.id));
            valued += 1;
        }
        /* oxlint-enable no-await-in-loop */
    }
    /* oxlint-enable no-await-in-loop */

    return valued;
}

export async function backfillOpeningUsd(db: Database): Promise<number> {
    const pending = await db
        .select({
            currency: accounts.currency,
            id: accounts.id,
            initialBalance: accounts.initialBalance,
            initialBalanceDate: accounts.initialBalanceDate,
        })
        .from(accounts)
        .where(and(isNull(accounts.initialBalanceUsd), isNull(accounts.deletedAt), ne(accounts.initialBalance, 0)));
    let valued = 0;

    /* oxlint-disable no-await-in-loop -- the rate lookup and the UPDATE are both synchronous on this driver (see CANONICALIZE_BATCH above), so issuing the rows together overlaps no I/O */
    for (const row of pending) {
        const initialBalanceUsd = await frozenUsdAmount(db, row.initialBalance, row.currency, row.initialBalanceDate);
        if (initialBalanceUsd === null) {
            continue;
        }
        await db.update(accounts).set({ initialBalanceUsd, updatedAt: new Date() }).where(eq(accounts.id, row.id));
        valued += 1;
    }
    /* oxlint-enable no-await-in-loop */

    return valued;
}

export async function hasUncanonicalized(db: SpendDb): Promise<boolean> {
    const rows = await db.select({ id: transactions.id }).from(transactions).where(uncanonicalized()).limit(1);
    return rows.length > 0;
}

async function canonicalizedCount(db: SpendDb): Promise<number> {
    const rows = await db
        .select({ total: count() })
        .from(transactions)
        .where(and(isNotNull(transactions.amountUsd), isNull(transactions.deletedAt)));
    return rows[0]?.total ?? 0;
}

// `pullRatesIfDue` wipe-replaces rates with a bounded window, so a row dated before its currency's earliest rate never
// values. A currency with no rates at all stays pending: they may still arrive.
export async function valuationCoverage(db: SpendDb): Promise<ValuationCoverage> {
    if (!(await hasUncanonicalized(db))) {
        return { beyondRateHistory: 0, converted: 0, pending: 0 };
    }
    const converted = await canonicalizedCount(db);

    const floors = new Map<string, string>();
    const earliest = await db
        .select({ date: min(exchangeRates.date), quote: exchangeRates.quote })
        .from(exchangeRates)
        .groupBy(exchangeRates.quote);
    for (const row of earliest) {
        if (row.date !== null) {
            floors.set(row.quote, row.date);
        }
    }

    const pending = await db
        .select({ currency: transactions.currency, date: transactions.date })
        .from(transactions)
        .where(uncanonicalized());

    let beyondRateHistory = 0;
    for (const row of pending) {
        // A USD row freezes at rate 1 without any rate being consulted.
        const floor = row.currency === null || row.currency === "USD" ? undefined : floors.get(row.currency);
        if (floor !== undefined && utcDateString(row.date.getTime()) < floor) {
            beyondRateHistory += 1;
        }
    }

    return {
        beyondRateHistory,
        converted,
        pending: pending.length - beyondRateHistory,
    };
}
