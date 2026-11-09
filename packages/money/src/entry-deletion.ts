import { isPerson } from "./account-kind";

interface Live {
    deletedAt: unknown;
    id: string;
}

type Entry = Live & {
    feeForId?: string | null;
    installmentId?: string | null;
    transferId?: string | null;
};

export interface DeletionBooks {
    installmentPlans: readonly (Live & { transactionId: string })[];
    installments: readonly (Live & { planId: string })[];
    outsidePayments: readonly (Live & { planId: string })[];
    transactions: readonly Entry[];
    transfers: readonly Live[];
}

export interface AccountDeletionBooks extends DeletionBooks {
    accounts: readonly (Live & { kind?: string | null })[];
    installmentPlans: readonly (Live & { accountId: string; transactionId: string })[];
    outsideMoves: readonly (Live & { accountId: string })[];
    savingsGoals: readonly (Live & { accountId?: string | null })[];
    transactions: readonly (Entry & { accountId?: string | null })[];
    transfers: readonly (Live & { fromAccountId: string; installmentPlanId?: string | null; toAccountId: string })[];
}

export interface CategoryDeletionBooks extends DeletionBooks {
    budgetPlans: readonly (Live & { categoryId: string })[];
    budgets: readonly (Live & { categoryId?: string | null })[];
    categories: readonly (Live & { parentId?: string | null })[];
    transactions: readonly (Entry & { categoryId?: string | null })[];
}

const isLive = (row: Live) => row.deletedAt == null;

const liveIds = <Row extends Live>(rows: readonly Row[], goes: (row: Row) => boolean) =>
    new Set(rows.filter((row) => isLive(row) && goes(row)).map((row) => row.id));

/**
 * Every row that goes when these ids are deleted, by table, for a client holding the books in memory. An id may name a
 * transfer or an entry. Native runs the same cascade as SQL so it need not load the ledger, and a test holds the two
 * equal. A tombstone stays out, keeping the instant it was deleted at.
 */
export function deletionPlan(books: DeletionBooks, ids: Iterable<string>) {
    const wanted = new Set(ids);
    const liveTransfers = new Set(books.transfers.filter(isLive).map((transfer) => transfer.id));
    const gone = {
        installmentPlans: new Set<string>(),
        installments: new Set<string>(),
        outsidePayments: new Set<string>(),
        transactions: new Set<string>(),
        transfers: new Set<string>(),
    };
    // A fee outliving its transfer keeps charging for a movement the ledger no longer holds, even one already gone.
    const moved = new Set(wanted);
    for (const entry of books.transactions) {
        if (!wanted.has(entry.id) || !isLive(entry)) {
            continue;
        }
        gone.transactions.add(entry.id);
        if (entry.transferId != null) {
            moved.add(entry.transferId);
        }
    }
    for (const id of moved) {
        if (liveTransfers.has(id)) {
            gone.transfers.add(id);
        }
    }
    const plans = books.installmentPlans.filter((plan) => isLive(plan) && wanted.has(plan.transactionId));
    for (const plan of plans) {
        gone.installmentPlans.add(plan.id);
    }
    for (const installment of books.installments) {
        if (isLive(installment) && gone.installmentPlans.has(installment.planId)) {
            gone.installments.add(installment.id);
        }
    }
    for (const payment of books.outsidePayments) {
        if (isLive(payment) && gone.installmentPlans.has(payment.planId)) {
            gone.outsidePayments.add(payment.id);
        }
    }
    for (const row of books.transactions) {
        if (
            isLive(row) &&
            ((row.feeForId != null && wanted.has(row.feeForId)) ||
                (row.transferId != null && moved.has(row.transferId)) ||
                (row.installmentId != null && gone.installments.has(row.installmentId)))
        ) {
            gone.transactions.add(row.id);
        }
    }
    return gone;
}

/**
 * A deleted account takes its transfers, plans, adjustments and goals. A person's entries are the debt itself, so each
 * goes as its own delete would. Anyone else's stay and are `detached`, tombstoned ones too, or a restore would link
 * them to an account that is gone. Payments on a plan stay as well: the money did move.
 */
export function accountDeletionPlan(books: AccountDeletionBooks, accountId: string) {
    // Read past the tombstone: a peer's delete may have landed first.
    const person = isPerson(books.accounts.find((account) => account.id === accountId) ?? {});
    const held = books.transactions.filter((entry) => entry.accountId === accountId);
    const gone = deletionPlan(books, [
        ...liveIds(books.transfers, (move) => move.fromAccountId === accountId || move.toAccountId === accountId),
        ...(person ? held.filter(isLive).map((entry) => entry.id) : []),
    ]);
    const plans = liveIds(books.installmentPlans, (plan) => plan.accountId === accountId);
    return {
        ...gone,
        accounts: liveIds(books.accounts, (account) => account.id === accountId),
        detached: {
            transactions: new Set(person ? [] : held.map((entry) => entry.id)),
            transfers: new Set(
                books.transfers
                    .filter((move) => move.installmentPlanId != null && plans.has(move.installmentPlanId))
                    .map((move) => move.id)
            ),
        },
        installmentPlans: new Set([...gone.installmentPlans, ...plans]),
        installments: new Set([...gone.installments, ...liveIds(books.installments, (row) => plans.has(row.planId))]),
        outsideMoves: liveIds(books.outsideMoves, (move) => move.accountId === accountId),
        outsidePayments: new Set([
            ...gone.outsidePayments,
            ...liveIds(books.outsidePayments, (row) => plans.has(row.planId)),
        ]),
        savingsGoals: liveIds(books.savingsGoals, (goal) => goal.accountId === accountId),
    };
}

/**
 * What goes with a deleted category: its budget, its budget plans, and each of its entries as that entry's own delete
 * would. Subcategories stay and are `detached`, becoming top-level.
 */
export function categoryDeletionPlan(books: CategoryDeletionBooks, categoryId: string) {
    return {
        ...deletionPlan(
            books,
            liveIds(books.transactions, (entry) => entry.categoryId === categoryId)
        ),
        budgetPlans: liveIds(books.budgetPlans, (plan) => plan.categoryId === categoryId),
        budgets: liveIds(books.budgets, (budget) => budget.categoryId === categoryId),
        categories: liveIds(books.categories, (category) => category.id === categoryId),
        detached: { categories: liveIds(books.categories, (category) => category.parentId === categoryId) },
    };
}
