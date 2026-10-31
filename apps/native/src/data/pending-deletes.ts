import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
    accounts,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    transactions,
    transfers,
} from "@/db/schema";

import type { SpendDb } from "./budget-spent";
import { touchesAccount } from "./transfers-core";

export interface PendingDeletes {
    account: string | null;
    category: string | null;
    row: string | null;
}

export const NO_PENDING_DELETES: PendingDeletes = { account: null, category: null, row: null };

function kept(gone: (SQL | undefined)[]): SQL | undefined {
    const any = or(...gone);
    return any === undefined ? undefined : sql`not coalesce(${any}, 0)`;
}

function rowTransferIds(db: SpendDb, row: string) {
    return db.select({ id: transactions.transferId }).from(transactions).where(eq(transactions.id, row));
}

function planIds(db: SpendDb, owner: SQL) {
    return db.select({ id: installmentPlans.id }).from(installmentPlans).where(owner);
}

function pendingPlanOwner({ account, row }: PendingDeletes): SQL | undefined {
    return or(
        row === null ? undefined : eq(installmentPlans.transactionId, row),
        account === null ? undefined : eq(installmentPlans.accountId, account)
    );
}

export function keptTransactions(db: SpendDb, { account, category, row }: PendingDeletes): SQL | undefined {
    return kept([
        row === null
            ? undefined
            : or(
                  eq(transactions.id, row),
                  eq(transactions.feeForId, row),
                  eq(transactions.transferId, row),
                  inArray(transactions.transferId, rowTransferIds(db, row)),
                  inArray(
                      transactions.installmentId,
                      db
                          .select({ id: installments.id })
                          .from(installments)
                          .where(inArray(installments.planId, planIds(db, eq(installmentPlans.transactionId, row))))
                  )
              ),
        account === null
            ? undefined
            : or(
                  inArray(
                      transactions.accountId,
                      db
                          .select({ id: accounts.id })
                          .from(accounts)
                          .where(and(eq(accounts.id, account), eq(accounts.kind, "person")))
                  ),
                  inArray(
                      transactions.transferId,
                      db.select({ id: transfers.id }).from(transfers).where(touchesAccount(account))
                  )
              ),
        category === null ? undefined : eq(transactions.categoryId, category),
    ]);
}

export function keptTransfers(db: SpendDb, { account, row }: PendingDeletes): SQL | undefined {
    return kept([
        row === null ? undefined : or(eq(transfers.id, row), inArray(transfers.id, rowTransferIds(db, row))),
        account === null ? undefined : touchesAccount(account),
    ]);
}

export function keptOutsideMoves({ account, row }: PendingDeletes): SQL | undefined {
    return kept([
        row === null ? undefined : eq(outsideMoves.id, row),
        account === null ? undefined : eq(outsideMoves.accountId, account),
    ]);
}

export function keptOutsidePayments(db: SpendDb, pending: PendingDeletes): SQL | undefined {
    const owner = pendingPlanOwner(pending);
    return kept([owner === undefined ? undefined : inArray(outsidePayments.planId, planIds(db, owner))]);
}

export function planGoesWithPendingDelete(
    plan: { accountId: string; transactionId: string | null },
    { account, row }: PendingDeletes
): boolean {
    return (row !== null && plan.transactionId === row) || (account !== null && plan.accountId === account);
}
