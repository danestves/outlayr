import { DEFAULT_ACCOUNT_KIND, isPerson } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, eq, isNull, max } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, outsideMoves, savingsGoals, transactions } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";

import { getMetaSync, META_KEYS, setMeta } from "./app-meta-core";
import { frozenUsdAmount } from "./frozen-usd";
import { tombstonePlansOnAccount } from "./installment-cascade";
import { refreshLogoCandidates } from "./logo-backfill-state";
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

export async function rememberLastUsedAccount(db: Database, id: string): Promise<void> {
    await setMeta(db, META_KEYS.lastTransactionAccount, id);
}

async function nextSortOrder(db: Database): Promise<number> {
    const [row] = await db
        .select({ highest: max(accounts.sortOrder) })
        .from(accounts)
        .where(isNull(accounts.deletedAt));
    return (row?.highest ?? -1) + 1;
}

export const accountsRepo = {
    async create(db: Database, input: AccountInput): Promise<string> {
        const now = new Date();
        const id = newId();
        const initialBalance = input.initialBalance ?? 0;
        const initialBalanceDate = input.initialBalanceDate ?? now;
        await db.insert(accounts).values({
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
            initialBalanceUsd: await frozenUsdAmount(db, initialBalance, input.currency, initialBalanceDate),
            kind: input.kind ?? DEFAULT_ACCOUNT_KIND,
            name: input.name,
            sortOrder: await nextSortOrder(db),
            updatedAt: now,
        });
        return id;
    },

    async listActive(db: Database): Promise<Account[]> {
        return await db.select().from(accounts).where(isNull(accounts.deletedAt)).orderBy(accounts.sortOrder);
    },

    async listBanks(db: Database): Promise<Account[]> {
        const live = await accountsRepo.listActive(db);
        return live.filter((account) => !isPerson(account));
    },

    /** Takes every live account it lists, already ordered; people keep their own relative order. */
    async reorder(db: Database, orderedIds: string[]): Promise<void> {
        const now = new Date();
        await withTransaction(db, async () => {
            for (let index = 0; index < orderedIds.length; index += 1) {
                // oxlint-disable-next-line no-await-in-loop -- one expo-sqlite connection backs the surrounding withTransaction, so concurrent statements would interleave inside the same transaction
                await db
                    .update(accounts)
                    .set({ sortOrder: index, updatedAt: now })
                    .where(eq(accounts.id, orderedIds[index]));
            }
        });
    },

    /**
     * `onDelete: "set null"` never fires for a tombstone, so entries are detached here. A person's entries are the debt
     * itself, so they go with them (no schedule left for the orphan repair to revive), and so do the account's goals.
     */
    async softDelete(db: Database, id: string, now: Date = new Date()): Promise<void> {
        // Read past the tombstone: a peer's delete may have landed first.
        const [account] = db.select({ kind: accounts.kind }).from(accounts).where(eq(accounts.id, id)).limit(1).all();
        const person = isPerson(account ?? {});
        await withTransaction(db, async () => {
            await tombstoneTransfersTouchingAccount(db, id, now);
            await tombstonePlansOnAccount(db, id, now);
            await db
                .update(outsideMoves)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(outsideMoves.accountId, id), isNull(outsideMoves.deletedAt)));
            await db
                .update(savingsGoals)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(savingsGoals.accountId, id), isNull(savingsGoals.deletedAt)));
            await db
                .update(accounts)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)));
            // Detaching moves `updatedAt` on live rows, so a logo candidate must follow or the backfill reads it as a
            // peer's edit. Before the write: only a stamp matching the row as it is now is moved.
            const attached = await db
                .select({ id: transactions.id })
                .from(transactions)
                .where(eq(transactions.accountId, id));
            await refreshLogoCandidates(
                db,
                attached.map((row) => row.id),
                now.getTime()
            );
            if (!person) {
                await db
                    .update(transactions)
                    .set({ accountId: null, updatedAt: now })
                    .where(eq(transactions.accountId, id));
                return;
            }
            await db
                .update(transactions)
                .set({ deletedAt: now, recurringType: RECURRING_TYPE.none, reminderLeadDays: null, updatedAt: now })
                .where(and(eq(transactions.accountId, id), isNull(transactions.deletedAt)));
        });
    },

    async update(db: Database, id: string, patch: Partial<AccountInput>): Promise<void> {
        const existing = getAccountById(db, id);
        if (existing == null) {
            throw new Error("Account not found.");
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

        await db
            .update(accounts)
            .set({
                ...patch,
                currency,
                imageKey: removesLogo ? null : patch.imageKey,
                initialBalance,
                initialBalanceDate,
                initialBalanceUsd: moneyMoved
                    ? await frozenUsdAmount(db, initialBalance, currency, initialBalanceDate)
                    : existing.initialBalanceUsd,
                updatedAt: new Date(),
            })
            .where(eq(accounts.id, id));
    },
};
