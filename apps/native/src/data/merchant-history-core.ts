import { and, desc, eq, isNotNull, isNull, ne, or } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import { rememberedCategory } from "@/domain/merchant-history";
import type { HistoricalEntry } from "@/domain/merchant-history";
import { merchantKey } from "@/domain/merchant-resolver";

// A recency window, not a `LIKE`: `merchantKey` folds diacritics and punctuation and SQLite can't, so a text match
// would miss "Panadería" for "panaderia". The match runs in JS.
export const HISTORY_WINDOW = 500;

// An income on a person is a sale on credit, not a merchant; an expense on one keeps the shop in its note.
const notASale = or(eq(transactions.income, false), isNull(accounts.kind), ne(accounts.kind, "person"));

// Scoped to `income`: a refund from a shop filed under an expense category must not answer with it.
export async function rememberedCategoryFor(db: Database, key: string, income: boolean): Promise<string | null> {
    if (key === "") {
        return null;
    }

    const rows = await db
        .select({ categoryId: transactions.categoryId, date: transactions.date, note: transactions.note })
        .from(transactions)
        .leftJoin(accounts, eq(accounts.id, transactions.accountId))
        .where(
            and(
                eq(transactions.income, income),
                isNotNull(transactions.categoryId),
                isNull(transactions.deletedAt),
                isNull(transactions.feeForId),
                isNull(transactions.installmentId),
                isNull(transactions.transferId),
                ne(transactions.note, ""),
                notASale
            )
        )
        .orderBy(desc(transactions.date))
        .limit(HISTORY_WINDOW);

    const entries: HistoricalEntry[] = [];
    for (const row of rows) {
        if (row.categoryId == null) {
            continue;
        }
        entries.push({ categoryId: row.categoryId, date: row.date.getTime(), note: row.note });
    }
    return rememberedCategory(entries, key);
}

export const RECENT_MERCHANT_WINDOW = 200;

export interface MerchantNoteRow {
    note: string;
}

export function recentMerchantNotesQuery(db: Database, income: boolean) {
    return db
        .select({ note: transactions.note })
        .from(transactions)
        .leftJoin(accounts, eq(accounts.id, transactions.accountId))
        .where(
            and(
                eq(transactions.income, income),
                isNull(transactions.deletedAt),
                isNull(transactions.feeForId),
                isNull(transactions.installmentId),
                isNull(transactions.transferId),
                ne(transactions.note, ""),
                notASale
            )
        )
        .orderBy(desc(transactions.date))
        .limit(RECENT_MERCHANT_WINDOW);
}

// Folded on `merchantKey` for the same reason as the category lookup; the spelling kept is the most recent.
export function recentMerchants(rows: readonly MerchantNoteRow[], limit: number): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of rows) {
        const key = merchantKey(row.note);
        if (key === "" || seen.has(key)) {
            continue;
        }
        seen.add(key);
        names.push(row.note.trim());
        if (names.length === limit) {
            break;
        }
    }
    return names;
}
