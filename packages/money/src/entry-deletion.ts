interface Live {
    deletedAt: unknown;
    id: string;
}

export interface DeletionBooks {
    installmentPlans: readonly (Live & { transactionId: string | null })[];
    installments: readonly (Live & { planId: string })[];
    outsidePayments: readonly (Live & { planId: string })[];
    transactions: readonly (Live & {
        feeForId: string | null;
        installmentId: string | null;
        transferId: string | null;
    })[];
    transfers: readonly Live[];
}

const isLive = (row: Live) => row.deletedAt == null;

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
    const plans = books.installmentPlans.filter(
        (plan) => isLive(plan) && plan.transactionId != null && wanted.has(plan.transactionId)
    );
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
