import { categoryKey } from "./import-file";
import type { ImportPlan, PlannedAccount, PlannedCategory, PlannedEntry } from "./import-writes";

export type CategoryChoice = { id: string; kind: "existing" } | { kind: "new"; name: string } | { kind: "none" };

export type AccountChoice =
    | { id: string; kind: "existing" }
    | { kind: "new"; type: "account" | "card" }
    | { kind: "skip" };

export interface PlanRow {
    amount: number;
    at: number;
    category: CategoryChoice;
    currency: string;
    /** The account column's text; null sends the row to the account picked for the whole file. */
    fileAccount: string | null;
    income: boolean;
    index: number;
    label: string;
    name: string;
}

export interface PlanInput {
    accounts: ReadonlyMap<string, AccountChoice>;
    intoAccountId: string | null;
    newId: () => string;
    rows: readonly PlanRow[];
}

export interface Planned {
    /** The file row each entry came from, so the done screen can say which rows made it. */
    entryOf: ReadonlyMap<number, string>;
    plan: ImportPlan;
}

/**
 * One new account per account-column value and one new category per name and side, however many rows share it, so
 * "Groceries" twice in a file is still one category.
 */
export function planOf({ accounts, intoAccountId, newId, rows }: PlanInput): Planned {
    const madeAccounts = new Map<string, PlannedAccount>();
    const madeCategories = new Map<string, PlannedCategory>();
    const entries: PlannedEntry[] = [];
    const entryOf = new Map<number, string>();
    for (const row of rows) {
        const choice = row.fileAccount === null ? null : (accounts.get(row.fileAccount) ?? null);
        if (choice?.kind === "skip") {
            continue;
        }
        let accountId = intoAccountId;
        if (choice?.kind === "existing") {
            accountId = choice.id;
        } else if (choice?.kind === "new" && row.fileAccount !== null) {
            const made = madeAccounts.get(row.fileAccount) ?? {
                currency: row.currency,
                id: newId(),
                kind: choice.type,
                name: row.fileAccount,
            };
            madeAccounts.set(row.fileAccount, made);
            accountId = made.id;
        }
        let categoryId: string | null = null;
        if (row.category.kind === "existing") {
            categoryId = row.category.id;
        } else if (row.category.kind === "new") {
            const key = `${row.income ? "in" : "out"}:${categoryKey(row.category.name)}`;
            const made = madeCategories.get(key) ?? { id: newId(), income: row.income, name: row.category.name };
            madeCategories.set(key, made);
            categoryId = made.id;
        }
        const id = newId();
        entryOf.set(row.index, id);
        entries.push({
            accountId,
            amount: row.amount,
            at: row.at,
            categoryId,
            currency: row.currency,
            details: row.label,
            id,
            income: row.income,
            note: row.name,
        });
    }
    return {
        entryOf,
        plan: { accounts: [...madeAccounts.values()], categories: [...madeCategories.values()], entries },
    };
}
