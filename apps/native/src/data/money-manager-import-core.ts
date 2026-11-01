import { accountBalance } from "@outlayr/money/account-balance";
import { toAccountKind } from "@outlayr/money/account-kind";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { getAccountById, accountsRepo } from "@/data/accounts-core";
import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import { TOMBSTONED_BUDGET, budgetsRepo } from "@/data/budgets-core";
import { pickFreeCategoryIcon, categoriesRepo } from "@/data/categories-core";
import { settledAccountCellQuery, toCurrencyCell } from "@/data/cell-query";
import { ERASED_TRANSACTION, ERASED_TRANSFER } from "@/data/erase-core";
import { transactionsRepo } from "@/data/transactions-core";
import {
    settledOutsideMoveQuery,
    settledOutsidePaymentQuery,
    settledTransferInboundQuery,
    settledTransferOutboundQuery,
    toTransferCell,
} from "@/data/transfer-cells";
import { stageTransfer } from "@/data/transfers-core";
import { loadValuationIn } from "@/data/valuation-source";
import type { Database } from "@/db/client";
import { accounts, appMeta, budgets, categories, transactions, transfers } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { DEFAULT_CURRENCY } from "@/domain/money";
import type {
    MmBalanceCheck,
    MmImportPlan,
    MmImportRecord,
    MmUndoCounts,
    OutlayrLedgerState,
    PlannedCategory,
} from "@/domain/money-manager/types";
import { chunkRows } from "@/lib/chunk";

const ImportOperation = Schema.Literals(["apply", "last", "read", "undo", "verify"]);

export class MoneyManagerImportError extends Schema.TaggedError<MoneyManagerImportError>()("MoneyManagerImportError", {
    cause: Schema.Defect(),
    operation: ImportOperation,
}) {
    override get message(): string {
        return `Money Manager import ${this.operation} failed`;
    }
}

const fail =
    (operation: typeof ImportOperation.Type) =>
    (cause: unknown): MoneyManagerImportError =>
        cause instanceof MoneyManagerImportError ? cause : new MoneyManagerImportError({ cause, operation });

const ImportRecord = Schema.Struct({
    accountIds: Schema.mutable(Schema.Array(Schema.String)),
    accountKeys: Schema.Record(Schema.String, Schema.String),
    adjustedAccountIds: Schema.mutable(Schema.Array(Schema.String)),
    budgetIds: Schema.mutable(Schema.Array(Schema.String)),
    categoryIds: Schema.mutable(Schema.Array(Schema.String)),
    expectedBalances: Schema.Record(Schema.String, Schema.Number),
    importedAt: Schema.Number,
    renamedCategories: Schema.optionalKey(
        Schema.mutable(
            Schema.Array(Schema.Struct({ id: Schema.String, imported: Schema.String, previous: Schema.String }))
        )
    ),
    transactionIds: Schema.mutable(Schema.Array(Schema.String)),
    transferIds: Schema.mutable(Schema.Array(Schema.String)),
});

const decodeRecord = Schema.decodeUnknownOption(Schema.fromJsonString(ImportRecord));

const CHUNK = 400;

function parentId(category: PlannedCategory, ids: ReadonlyMap<string, string>): string | null {
    if (category.parent == null) {
        return null;
    }
    if ("categoryId" in category.parent) {
        return category.parent.categoryId;
    }
    return ids.get(category.parent.key) ?? null;
}

export const readLedgerState = Effect.fn("MoneyManagerImport.readLedgerState")(function* readLedgerState(db: Database) {
    const currency = (yield* getMeta(db, META_KEYS.currency).pipe(Effect.mapError(fail("read")))) ?? DEFAULT_CURRENCY;
    const currencyChosen =
        (yield* getMeta(db, META_KEYS.currencyChosen).pipe(Effect.mapError(fail("read")))) === "true";
    const accountRows = yield* Effect.tryPromise({
        catch: fail("read"),
        try: () =>
            db
                .select({
                    currency: accounts.currency,
                    id: accounts.id,
                    kind: accounts.kind,
                    name: accounts.name,
                })
                .from(accounts)
                .where(isNull(accounts.deletedAt)),
    });
    const categoryRows = yield* Effect.tryPromise({
        catch: fail("read"),
        try: () =>
            db
                .select({
                    color: categories.color,
                    customName: categories.customName,
                    icon: categories.icon,
                    id: categories.id,
                    income: categories.income,
                    name: categories.name,
                    parentId: categories.parentId,
                    preset: categories.preset,
                })
                .from(categories)
                .where(isNull(categories.deletedAt)),
    });
    const budgetRows = yield* Effect.tryPromise({
        catch: fail("read"),
        try: () => db.select({ categoryId: budgets.categoryId }).from(budgets).where(isNull(budgets.deletedAt)),
    });
    const entryRows = yield* Effect.tryPromise({
        catch: fail("read"),
        try: () =>
            db
                .select({
                    amount: transactions.amount,
                    currency: transactions.currency,
                    date: transactions.date,
                    income: transactions.income,
                })
                .from(transactions)
                .where(
                    and(isNull(transactions.deletedAt), isNull(transactions.transferId), isNull(transactions.feeForId))
                ),
    });
    return {
        accounts: accountRows.map((row) => ({
            currency: row.currency,
            id: row.id,
            kind: toAccountKind(row.kind),
            name: row.name,
        })),
        budgetCategoryIds: budgetRows.flatMap((row) => (row.categoryId == null ? [] : [row.categoryId])),
        categories: categoryRows.map((row) => ({
            color: row.color,
            customName: row.customName,
            icon: row.icon,
            id: row.id,
            income: row.income,
            name: row.name ?? "",
            parentId: row.parentId,
            preset: row.preset,
        })),
        currency,
        currencyChosen,
        entries: entryRows.map((row) => ({
            amount: row.amount,
            currency: row.currency ?? currency,
            date: row.date.getTime(),
            income: row.income,
        })),
    } satisfies OutlayrLedgerState;
});

export const lastMoneyManagerImport = Effect.fn("MoneyManagerImport.last")(function* lastMoneyManagerImport(
    db: Database
) {
    const raw = yield* getMeta(db, META_KEYS.moneyManagerImport).pipe(Effect.mapError(fail("last")));
    return parseImportRecord(raw);
});

export function parseImportRecord(raw: string | null | undefined): MmImportRecord | null {
    if (raw == null || raw === "") {
        return null;
    }
    const decoded = Option.getOrNull(decodeRecord(raw));
    if (decoded == null) {
        return null;
    }
    return {
        ...decoded,
        accountKeys: { ...decoded.accountKeys },
        expectedBalances: { ...decoded.expectedBalances },
    } satisfies MmImportRecord;
}

const renameMatchedCategories = Effect.fn("MoneyManagerImport.renameMatchedCategories")(
    function* renameMatchedCategories(db: Database, planned: readonly PlannedCategory[]) {
        const renamed: NonNullable<MmImportRecord["renamedCategories"]> = [];
        for (const category of planned) {
            const id = category.existingId;
            if (id == null || category.renamesExisting !== true) {
                continue;
            }
            const [row] = yield* Effect.tryPromise({
                catch: fail("apply"),
                try: () => db.select({ name: categories.name }).from(categories).where(eq(categories.id, id)).limit(1),
            });
            yield* Effect.tryPromise({
                catch: fail("apply"),
                try: () =>
                    db
                        .update(categories)
                        .set({ customName: true, name: category.name, updatedAt: new Date() })
                        .where(eq(categories.id, id)),
            });
            renamed.push({ id, imported: category.name, previous: row?.name ?? "" });
        }
        return renamed;
    }
);

export const applyMoneyManagerImport = Effect.fn("MoneyManagerImport.apply")(function* applyMoneyManagerImport(
    db: Database,
    plan: MmImportPlan,
    onProgress?: (done: number, total: number) => void
) {
    const total = plan.entries.length + plan.transfers.length;
    return yield* transaction(
        db,
        Effect.gen(function* write() {
            if (plan.ledgerCurrency != null) {
                yield* setMeta(db, META_KEYS.currency, plan.ledgerCurrency).pipe(Effect.mapError(fail("apply")));
                yield* setMeta(db, META_KEYS.currencyChosen, "true").pipe(Effect.mapError(fail("apply")));
            }

            const accountIds: string[] = [];
            const accountKeys: Record<string, string> = {};
            const expectedBalances: Record<string, number> = {};
            const adjustedAccountIds: string[] = [];
            for (const account of plan.accounts) {
                const id =
                    account.existingId ??
                    (yield* accountsRepo
                        .create(db, {
                            currency: account.currency,
                            customColor: account.color,
                            icon: account.icon,
                            initialBalance: account.initialBalance,
                            initialBalanceDate: account.initialBalanceDate,
                            kind: account.kind,
                            name: account.name,
                        })
                        .pipe(Effect.mapError(fail("apply"))));
                if (account.existingId == null) {
                    accountIds.push(id);
                    if (account.initialBalance !== 0) {
                        adjustedAccountIds.push(id);
                    }
                }
                accountKeys[account.key] = id;
                if (account.expectedBalance != null) {
                    expectedBalances[id] = account.expectedBalance;
                }
            }

            const categoryIds: string[] = [];
            const categoryKeys = new Map<string, string>();
            for (const category of plan.categories) {
                if (category.existingId != null) {
                    categoryKeys.set(category.key, category.existingId);
                }
            }
            const renamedCategories = yield* renameMatchedCategories(db, plan.categories);
            for (const category of plan.categories) {
                if (category.existingId != null) {
                    continue;
                }
                const parent = parentId(category, categoryKeys);
                if (category.parent != null && "key" in category.parent && parent == null) {
                    return yield* new MoneyManagerImportError({
                        cause: new Error(`Missing parent ${category.parent.key}`),
                        operation: "apply",
                    });
                }
                const siblings = yield* Effect.tryPromise({
                    catch: fail("apply"),
                    try: () =>
                        db
                            .select()
                            .from(categories)
                            .where(and(eq(categories.income, category.income), isNull(categories.deletedAt))),
                });
                const id = yield* categoriesRepo
                    .create(db, {
                        color: category.color,
                        icon: pickFreeCategoryIcon(siblings, category.icon),
                        income: category.income,
                        name: category.name,
                        parentId: parent,
                        preset: category.preset,
                    })
                    .pipe(Effect.mapError(fail("apply")));
                categoryKeys.set(category.key, id);
                categoryIds.push(id);
            }

            const budgetIds: string[] = [];
            for (const budget of plan.budgets) {
                const categoryId = categoryKeys.get(budget.categoryKey);
                if (categoryId == null) {
                    return yield* new MoneyManagerImportError({
                        cause: new Error(`Missing budget category ${budget.categoryKey}`),
                        operation: "apply",
                    });
                }
                const id = yield* budgetsRepo
                    .createBudget(db, { amount: budget.amount, categoryId, type: BUDGET_TYPE.month })
                    .pipe(Effect.mapError(fail("apply")));
                budgetIds.push(id);
            }

            let done = 0;
            const tick = () => {
                done += 1;
                if (onProgress != null && (done % 100 === 0 || done === total)) {
                    onProgress(done, total);
                }
            };
            if (total === 0) {
                onProgress?.(0, 0);
            }

            const transferIds: string[] = [];
            for (const transfer of plan.transfers) {
                const fromAccountId = accountKeys[transfer.fromAccountKey];
                const toAccountId = accountKeys[transfer.toAccountKey];
                if (fromAccountId == null || toAccountId == null) {
                    return yield* new MoneyManagerImportError({
                        cause: new Error("Missing transfer account"),
                        operation: "apply",
                    });
                }
                const sameCurrency = transfer.fromCurrency === transfer.toCurrency;
                const staged = yield* stageTransfer(db, {
                    date: transfer.date,
                    exchangeRate: sameCurrency ? null : transfer.toAmount / transfer.fromAmount,
                    exchangeRateType: sameCurrency ? null : "custom",
                    fromAccountId,
                    fromAmount: transfer.fromAmount,
                    fromCurrency: transfer.fromCurrency,
                    note: transfer.note,
                    toAccountId,
                    toAmount: transfer.toAmount,
                    toCurrency: transfer.toCurrency,
                }).pipe(Effect.mapError(fail("apply")));
                yield* staged.write.pipe(Effect.mapError(fail("apply")));
                transferIds.push(staged.id);
                tick();
            }

            const transactionIds: string[] = [];
            for (const entry of plan.entries) {
                const accountId = entry.accountKey == null ? null : (accountKeys[entry.accountKey] ?? null);
                if (entry.accountKey != null && accountId == null) {
                    return yield* new MoneyManagerImportError({
                        cause: new Error(`Missing account ${entry.accountKey}`),
                        operation: "apply",
                    });
                }
                const categoryId = entry.categoryKey == null ? null : (categoryKeys.get(entry.categoryKey) ?? null);
                if (entry.categoryKey != null && categoryId == null) {
                    return yield* new MoneyManagerImportError({
                        cause: new Error(`Missing category ${entry.categoryKey}`),
                        operation: "apply",
                    });
                }
                const id = yield* transactionsRepo
                    .create(
                        db,
                        {
                            accountId,
                            amount: entry.amount,
                            categoryId,
                            currency: entry.currency,
                            date: entry.date,
                            details: null,
                            exchangeRate: entry.exchangeRate,
                            exchangeRateType: entry.exchangeRate == null ? null : "custom",
                            income: entry.income,
                            note: entry.note,
                            unreviewed: entry.unreviewed,
                        },
                        { logoCandidate: false }
                    )
                    .pipe(Effect.mapError(fail("apply")));
                transactionIds.push(id);
                tick();
            }

            const record = {
                accountIds,
                accountKeys,
                adjustedAccountIds,
                budgetIds,
                categoryIds,
                expectedBalances,
                importedAt: Date.now(),
                renamedCategories,
                transactionIds,
                transferIds,
            } satisfies MmImportRecord;
            yield* setMeta(db, META_KEYS.moneyManagerImport, JSON.stringify(record)).pipe(
                Effect.mapError(fail("apply"))
            );
            return record;
        }).pipe(Effect.mapError(fail("apply"))),
        fail("apply")
    );
});

const undoQuery = <A>(run: () => PromiseLike<A>) => Effect.tryPromise({ catch: fail("undo"), try: run });

export const undoMoneyManagerImport = Effect.fn("MoneyManagerImport.undo")(function* undoMoneyManagerImport(
    db: Database
) {
    const record = yield* lastMoneyManagerImport(db).pipe(Effect.mapError(fail("undo")));
    if (record == null) {
        return { accounts: 0, budgets: 0, categories: 0, transactions: 0, transfers: 0 } satisfies MmUndoCounts;
    }

    // Repo deletes open their own transaction, which this one cannot nest.
    return yield* transaction(
        db,
        Effect.gen(function* write() {
            const now = new Date();
            const transactionIds = new Set(record.transactionIds);
            for (const chunk of chunkRows(record.transactionIds, CHUNK)) {
                const fees = yield* undoQuery(() =>
                    db
                        .select({ id: transactions.id })
                        .from(transactions)
                        .where(and(isNull(transactions.deletedAt), inArray(transactions.feeForId, chunk)))
                );
                for (const fee of fees) {
                    transactionIds.add(fee.id);
                }
            }
            for (const chunk of chunkRows(record.transferIds, CHUNK)) {
                const fees = yield* undoQuery(() =>
                    db
                        .select({ id: transactions.id })
                        .from(transactions)
                        .where(and(isNull(transactions.deletedAt), inArray(transactions.transferId, chunk)))
                );
                for (const fee of fees) {
                    transactionIds.add(fee.id);
                }
            }

            const removedTransactions = yield* softDelete(db, [...transactionIds], now, "transactions");
            const removedTransfers = yield* softDelete(db, record.transferIds, now, "transfers");
            const removedBudgets = yield* tombstoneBudgets(db, record.budgetIds, now);
            const removedCategories = yield* tombstoneUnusedCategories(db, record.categoryIds, now);
            const removedAccounts = yield* tombstoneUnusedAccounts(db, record.accountIds, now);
            for (const renamed of record.renamedCategories ?? []) {
                yield* undoQuery(() =>
                    db
                        .update(categories)
                        .set({ customName: false, name: renamed.previous, updatedAt: now })
                        .where(
                            and(
                                eq(categories.id, renamed.id),
                                eq(categories.name, renamed.imported),
                                isNull(categories.deletedAt)
                            )
                        )
                );
            }
            yield* undoQuery(() => db.delete(appMeta).where(eq(appMeta.key, META_KEYS.moneyManagerImport)));
            return {
                accounts: removedAccounts,
                budgets: removedBudgets,
                categories: removedCategories,
                transactions: removedTransactions,
                transfers: removedTransfers,
            } satisfies MmUndoCounts;
        }).pipe(Effect.mapError(fail("undo"))),
        fail("undo")
    );
});

// Scrubbed like an erase: an undone import is not a row the user deleted, so it stays out of Recently deleted.
const softDelete = Effect.fn("MoneyManagerImport.softDelete")(function* softDelete(
    db: Database,
    ids: readonly string[],
    now: Date,
    table: "transactions" | "transfers"
) {
    let total = 0;
    for (const chunk of chunkRows(ids, CHUNK)) {
        const rows = yield* undoQuery(() =>
            table === "transactions"
                ? db
                      .select({ id: transactions.id })
                      .from(transactions)
                      .where(and(inArray(transactions.id, chunk), isNull(transactions.deletedAt)))
                : db
                      .select({ id: transfers.id })
                      .from(transfers)
                      .where(and(inArray(transfers.id, chunk), isNull(transfers.deletedAt)))
        );
        total += rows.length;
        if (rows.length === 0) {
            continue;
        }
        yield* undoQuery(() =>
            table === "transactions"
                ? db
                      .update(transactions)
                      .set({ ...ERASED_TRANSACTION, deletedAt: now, updatedAt: now })
                      .where(and(inArray(transactions.id, chunk), isNull(transactions.deletedAt)))
                : db
                      .update(transfers)
                      .set({ ...ERASED_TRANSFER, deletedAt: now, updatedAt: now })
                      .where(and(inArray(transfers.id, chunk), isNull(transfers.deletedAt)))
        );
    }
    return total;
});

const tombstoneBudgets = Effect.fn("MoneyManagerImport.tombstoneBudgets")(function* tombstoneBudgets(
    db: Database,
    ids: readonly string[],
    now: Date
) {
    let total = 0;
    for (const chunk of chunkRows(ids, CHUNK)) {
        const rows = yield* undoQuery(() =>
            db
                .select({ id: budgets.id })
                .from(budgets)
                .where(and(inArray(budgets.id, chunk), isNull(budgets.deletedAt)))
        );
        total += rows.length;
        if (rows.length === 0) {
            continue;
        }
        yield* undoQuery(() =>
            db
                .update(budgets)
                .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
                .where(and(inArray(budgets.id, chunk), isNull(budgets.deletedAt)))
        );
    }
    return total;
});

const tombstoneUnusedCategories = Effect.fn("MoneyManagerImport.tombstoneUnusedCategories")(
    function* tombstoneUnusedCategories(db: Database, ids: readonly string[], now: Date) {
        const recorded = new Set(ids);
        const keep = new Set<string>();
        for (const chunk of chunkRows(ids, CHUNK)) {
            const rows = yield* undoQuery(() =>
                db
                    .select({ categoryId: transactions.categoryId })
                    .from(transactions)
                    .where(and(isNull(transactions.deletedAt), inArray(transactions.categoryId, chunk)))
            );
            for (const row of rows) {
                if (row.categoryId != null) {
                    keep.add(row.categoryId);
                }
            }
        }
        const live = yield* undoQuery(() =>
            db
                .select({ id: categories.id, parentId: categories.parentId })
                .from(categories)
                .where(isNull(categories.deletedAt))
        );
        for (const row of live) {
            if (row.parentId != null && recorded.has(row.parentId) && !recorded.has(row.id)) {
                keep.add(row.parentId);
            }
        }
        let grew = true;
        while (grew) {
            grew = false;
            for (const row of live) {
                if (row.parentId != null && keep.has(row.id) && recorded.has(row.parentId) && !keep.has(row.parentId)) {
                    keep.add(row.parentId);
                    grew = true;
                }
            }
        }
        return yield* dropRows(
            db,
            ids.filter((id) => !keep.has(id)),
            now,
            categories
        );
    }
);

const tombstoneUnusedAccounts = Effect.fn("MoneyManagerImport.tombstoneUnusedAccounts")(
    function* tombstoneUnusedAccounts(db: Database, ids: readonly string[], now: Date) {
        const keep = new Set<string>();
        for (const chunk of chunkRows(ids, CHUNK)) {
            const used = yield* undoQuery(() =>
                db
                    .select({ accountId: transactions.accountId })
                    .from(transactions)
                    .where(and(isNull(transactions.deletedAt), inArray(transactions.accountId, chunk)))
            );
            for (const row of used) {
                if (row.accountId != null) {
                    keep.add(row.accountId);
                }
            }
            const moves = yield* undoQuery(() =>
                db
                    .select({ fromAccountId: transfers.fromAccountId, toAccountId: transfers.toAccountId })
                    .from(transfers)
                    .where(
                        and(
                            isNull(transfers.deletedAt),
                            or(inArray(transfers.fromAccountId, chunk), inArray(transfers.toAccountId, chunk))
                        )
                    )
            );
            for (const row of moves) {
                keep.add(row.fromAccountId);
                keep.add(row.toAccountId);
            }
        }
        return yield* dropRows(
            db,
            ids.filter((id) => !keep.has(id)),
            now,
            accounts
        );
    }
);

const dropRows = Effect.fn("MoneyManagerImport.dropRows")(function* dropRows(
    db: Database,
    ids: readonly string[],
    now: Date,
    table: typeof categories | typeof accounts
) {
    let total = 0;
    for (const chunk of chunkRows(ids, CHUNK)) {
        const rows = yield* undoQuery(() =>
            db
                .select({ id: table.id })
                .from(table)
                .where(and(inArray(table.id, chunk), isNull(table.deletedAt)))
        );
        total += rows.length;
        if (rows.length === 0) {
            continue;
        }
        yield* undoQuery(() =>
            db
                .update(table)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(inArray(table.id, chunk), isNull(table.deletedAt)))
        );
    }
    return total;
});

const verifyQuery = <A>(run: () => PromiseLike<A>) => Effect.tryPromise({ catch: fail("verify"), try: run });

export const verifyImportedBalances = Effect.fn("MoneyManagerImport.verify")(function* verifyImportedBalances(
    db: Database,
    record: MmImportRecord
) {
    const now = new Date();
    const checks: MmBalanceCheck[] = [];
    for (const [accountId, expected] of Object.entries(record.expectedBalances)) {
        const account = yield* Effect.try({
            catch: fail("verify"),
            try: () => getAccountById(db, accountId),
        });
        if (account == null) {
            continue;
        }
        // One connection: the five reads cannot run together.
        const rows = yield* verifyQuery(() => settledAccountCellQuery(db, account.id, now));
        const outbound = yield* verifyQuery(() => settledTransferOutboundQuery(db, account.id, now));
        const inbound = yield* verifyQuery(() => settledTransferInboundQuery(db, account.id, now));
        const outside = yield* verifyQuery(() => settledOutsidePaymentQuery(db, account.id, now));
        const moves = yield* verifyQuery(() => settledOutsideMoveQuery(db, account.id, now));
        const cells = [
            ...rows.map((row) => toCurrencyCell(row)),
            ...outbound.map((row) => toTransferCell(row, false)),
            ...inbound.map((row) => toTransferCell(row, true)),
            ...outside.map((row) => toTransferCell(row, true)),
            ...moves.map((row) => toTransferCell(row, true)),
        ];
        const valuation = yield* loadValuationIn(db, account.currency).pipe(Effect.mapError(fail("verify")));
        const balance = accountBalance(
            { currency: account.currency, initialBalance: account.initialBalance },
            cells,
            valuation.rates
        );
        checks.push({
            accountId,
            adjusted: record.adjustedAccountIds.includes(accountId),
            balance: balance.total,
            color: account.customColor,
            currency: account.currency,
            expected,
            icon: account.icon,
            matches: Math.abs(balance.total - expected) <= 0.01,
            name: account.name,
        });
    }
    return checks;
});
