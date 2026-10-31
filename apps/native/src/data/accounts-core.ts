import { DEFAULT_ACCOUNT_KIND, isPerson } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, eq, isNull, max } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { accounts, outsideMoves, savingsGoals, transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";

import { getMetaSync, META_KEYS, setMeta } from "./app-meta-core";
import { frozenUsdAmount } from "./frozen-usd";
import { tombstonePlansOnAccount } from "./installment-cascade";
import { refreshLogoCandidates } from "./logo-backfill-state";
import { setBoolSetting } from "./settings-core";
import { tombstoneTransfersTouchingAccount } from "./transfers-core";

export type Account = typeof accounts.$inferSelect;

export interface AccountInput {
    currency: string;
    customColor?: string | null;
    emoji?: string | null;
    icon?: string | null;
    imageColor?: string | null;
    imageKey?: string | null;
    imageUri?: string | null;
    initialBalance?: number;
    /** Defaults to now: the account starts holding this balance today. */
    initialBalanceDate?: Date;
    kind?: AccountKind;
    name: string;
}

export function getAccountById(db: Database, id: string): Account | null {
    const rows = db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)))
        .limit(1)
        .all();
    return rows[0] ?? null;
}

// A tombstoned account resolves to null, so the default never revives it; a person is never the default either.
export function getLastUsedAccount(db: Database): Account | null {
    const id = getMetaSync(db, META_KEYS.lastTransactionAccount);
    const account = id == null ? null : getAccountById(db, id);
    return account && !isPerson(account) ? account : null;
}

const AccountsOperation = Schema.Literals(["remember-last-used", "create", "list", "reorder", "delete", "update"]);

export class AccountsError extends Schema.TaggedError<AccountsError>()("AccountsError", {
    cause: Schema.optional(Schema.Defect()),
    operation: AccountsOperation,
    reason: Schema.optional(Schema.Literals(["missing"])),
}) {
    override get message(): string {
        return this.reason === "missing" ? "Account not found." : `Account ${this.operation} failed`;
    }
}

const query = <A>(operation: typeof AccountsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new AccountsError({ cause, operation }), try: run });

const read = <A>(operation: typeof AccountsOperation.Type, run: () => A) =>
    Effect.try({ catch: (cause) => new AccountsError({ cause, operation }), try: run });

export const rememberLastUsedAccount = Effect.fn("Accounts.rememberLastUsedAccount")(function* rememberLastUsedAccount(
    db: Database,
    id: string
) {
    yield* setMeta(db, META_KEYS.lastTransactionAccount, id);
});

const nextSortOrder = Effect.fn("Accounts.nextSortOrder")(function* nextSortOrder(db: Database) {
    const [row] = yield* query("create", () =>
        db
            .select({ highest: max(accounts.sortOrder) })
            .from(accounts)
            .where(isNull(accounts.deletedAt))
    );
    return (row?.highest ?? -1) + 1;
});

const listActive = Effect.fn("Accounts.listActive")(function* listActive(db: Database) {
    return yield* query("list", () =>
        db.select().from(accounts).where(isNull(accounts.deletedAt)).orderBy(accounts.sortOrder)
    );
});

export const accountsRepo = {
    create: Effect.fn("Accounts.create")(function* create(db: Database, input: AccountInput) {
        const now = new Date();
        const id = newId();
        const initialBalance = input.initialBalance ?? 0;
        const initialBalanceDate = input.initialBalanceDate ?? now;
        const initialBalanceUsd = yield* frozenUsdAmount(db, initialBalance, input.currency, initialBalanceDate);
        const sortOrder = yield* nextSortOrder(db);
        yield* query("create", () =>
            db.insert(accounts).values({
                currency: input.currency,
                customColor: input.customColor ?? null,
                dateCreated: now,
                deletedAt: null,
                emoji: input.emoji ?? null,
                icon: input.icon ?? null,
                id,
                imageColor: input.imageColor ?? null,
                imageKey: input.imageKey ?? null,
                imageUri: input.imageUri ?? null,
                initialBalance,
                initialBalanceDate,
                initialBalanceUsd,
                kind: input.kind ?? DEFAULT_ACCOUNT_KIND,
                name: input.name,
                sortOrder,
                updatedAt: now,
            })
        );
        return id;
    }),

    listActive,

    listBanks: Effect.fn("Accounts.listBanks")(function* listBanks(db: Database) {
        const live = yield* listActive(db);
        return live.filter((account) => !isPerson(account));
    }),

    /** Takes every live account it lists, already ordered; people keep their own relative order. */
    reorder: Effect.fn("Accounts.reorder")(function* reorder(db: Database, orderedIds: string[]) {
        const now = new Date();
        yield* transaction(
            db,
            Effect.gen(function* write() {
                // One expo-sqlite connection backs the surrounding transaction, so concurrent statements interleave.
                for (const [index, id] of orderedIds.entries()) {
                    yield* query("reorder", () =>
                        db.update(accounts).set({ sortOrder: index, updatedAt: now }).where(eq(accounts.id, id))
                    );
                }
                yield* setBoolSetting(db, "accountsByHand", true);
            }),
            (cause) => new AccountsError({ cause, operation: "reorder" })
        );
    }),

    /**
     * `onDelete: "set null"` never fires for a tombstone, so entries are detached here. A person's entries are the debt
     * itself, so they go with them (no schedule left for the orphan repair to revive), and so do the account's goals.
     */
    softDelete: Effect.fn("Accounts.softDelete")(function* softDelete(
        db: Database,
        id: string,
        now: Date = new Date()
    ) {
        // Read past the tombstone: a peer's delete may have landed first.
        const [account] = yield* read("delete", () =>
            db.select({ kind: accounts.kind }).from(accounts).where(eq(accounts.id, id)).limit(1).all()
        );
        const person = isPerson(account ?? {});
        yield* transaction(
            db,
            Effect.gen(function* write() {
                yield* tombstoneTransfersTouchingAccount(db, id, now);
                yield* tombstonePlansOnAccount(db, id, now);
                yield* query("delete", () =>
                    db
                        .update(outsideMoves)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(outsideMoves.accountId, id), isNull(outsideMoves.deletedAt)))
                );
                yield* query("delete", () =>
                    db
                        .update(savingsGoals)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(savingsGoals.accountId, id), isNull(savingsGoals.deletedAt)))
                );
                yield* query("delete", () =>
                    db
                        .update(accounts)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)))
                );
                // Detaching moves `updatedAt` on live rows, so a logo candidate must follow or the backfill reads
                // it as a peer's edit. Before the write: only a stamp matching the row as it is now is moved.
                const attached = yield* query("delete", () =>
                    db.select({ id: transactions.id }).from(transactions).where(eq(transactions.accountId, id))
                );
                yield* refreshLogoCandidates(
                    db,
                    attached.map((row) => row.id),
                    now.getTime()
                );
                if (!person) {
                    yield* query("delete", () =>
                        db
                            .update(transactions)
                            .set({ accountId: null, updatedAt: now })
                            .where(eq(transactions.accountId, id))
                    );
                    return;
                }
                yield* query("delete", () =>
                    db
                        .update(transactions)
                        .set({
                            deletedAt: now,
                            recurringType: RECURRING_TYPE.none,
                            reminderLeadDays: null,
                            updatedAt: now,
                        })
                        .where(and(eq(transactions.accountId, id), isNull(transactions.deletedAt)))
                );
            }),
            (cause) => new AccountsError({ cause, operation: "delete" })
        );
    }),

    update: Effect.fn("Accounts.update")(function* update(db: Database, id: string, patch: Partial<AccountInput>) {
        const existing = yield* read("update", () => getAccountById(db, id));
        if (existing == null) {
            return yield* new AccountsError({ operation: "update", reason: "missing" });
        }

        const initialBalance = patch.initialBalance ?? existing.initialBalance;
        const currency = patch.currency ?? existing.currency;
        const initialBalanceDate = patch.initialBalanceDate ?? existing.initialBalanceDate;
        const moneyMoved =
            initialBalance !== existing.initialBalance ||
            currency !== existing.currency ||
            initialBalanceDate.getTime() !== existing.initialBalanceDate.getTime();

        // Like `removesPhoto` in transactions-core.ts: an unfetched logo also has a null path, so only a removal read
        // against the previous path may clear the key.
        const removesLogo = existing.imageUri != null && "imageUri" in patch && patch.imageUri == null;

        const initialBalanceUsd = moneyMoved
            ? yield* frozenUsdAmount(db, initialBalance, currency, initialBalanceDate)
            : existing.initialBalanceUsd;
        yield* query("update", () =>
            db
                .update(accounts)
                .set({
                    ...patch,
                    currency,
                    imageKey: removesLogo ? null : patch.imageKey,
                    initialBalance,
                    initialBalanceDate,
                    initialBalanceUsd,
                    updatedAt: new Date(),
                })
                .where(eq(accounts.id, id))
        );
    }),
};
