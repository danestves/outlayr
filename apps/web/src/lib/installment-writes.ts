import { decimalsFor } from "@outlayr/money/currency";
import { entryRow } from "@outlayr/money/entry-row";
import { filedOn } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";
import * as Effect from "effect/Effect";

import type { InstallmentView, PlanView } from "@/components/dashboard/installments/model";

import { frozenUsd, nextRow, ratesLookup } from "./account-writes";
import type { Ledger } from "./dashboard-series-ledger";
import { entryPush } from "./delete-writes";
import type { CommitRow } from "./ledger-committer";

type Books = Ledger["books"];
type Plan = Pick<PlanView, "categoryId" | "currency" | "id"> & { account: Pick<PlanView["account"], "id"> };

export function outsidePayment(
    books: Pick<Books, "exchangeRates">,
    plan: Pick<PlanView, "currency" | "id">,
    payment: { amount: number; date: number },
    id: string,
    at: number
): CommitRow {
    return {
        deletedAt: null,
        fields: {
            amount: payment.amount,
            amountUsd: frozenUsd(books, payment.amount, plan.currency, payment.date),
            date: payment.date,
            planId: plan.id,
        },
        localId: id,
        restoredAt: null,
        table: "outsidePayments",
        updatedAt: at,
    };
}

const liveFees = (books: Books, installmentId: string) =>
    books.transactions
        .filter((row) => row.deletedAt === null && row.installmentId === installmentId)
        .toSorted((a, b) => b.date - a.date);

export function feeRows(
    ledger: Pick<Ledger, "books" | "offsetAt">,
    plan: Plan,
    installmentId: string,
    fee: { amount: number; note: string },
    at: number
): CommitRow[] {
    const { books } = ledger;
    const [current, ...extra] = liveFees(books, installmentId);
    const gone = (rows: readonly Books["transactions"][number][]) =>
        rows.map((row) => nextRow("transactions", row, { accountId: row.accountId ?? null, deletedAt: at }, at));
    if (!(fee.amount > 0)) {
        return gone(current ? [current, ...extra] : []);
    }
    const date = new Date(current?.date ?? at);
    const entry = Effect.runSync(
        entryRow(
            ratesLookup(books),
            current?.localId ?? crypto.randomUUID(),
            {
                accountId: plan.account.id,
                amount: fee.amount,
                categoryId: current ? (current.categoryId ?? null) : plan.categoryId,
                currency: plan.currency,
                date,
                details: null,
                income: false,
                note: current?.note ?? fee.note,
            },
            {
                categoryName: books.categories.find((row) => row.localId === plan.categoryId)?.name ?? null,
                currency: plan.currency,
                now: new Date(at),
            }
        )
    );
    const filed = filedOn(date.getTime(), ledger.offsetAt);
    const charged = current
        ? nextRow(
              "transactions",
              current,
              { accountId: plan.account.id, amount: entry.amount, amountUsd: entry.amountUsd, updatedAt: at },
              at
          )
        : entryPush({ ...entry, ...filed, id: entry.id, installmentId, transferId: null }, at);
    return [charged, ...gone(extra)];
}

export function editedInstallment(
    books: Pick<Books, "installments">,
    installmentId: string,
    change: { amount: number; dueDate: number },
    at: number
): CommitRow[] {
    const doc = books.installments.find((row) => row.localId === installmentId && row.deletedAt === null);
    return doc ? [nextRow("installments", doc, change, at)] : [];
}

export function deletedInstallment(books: Pick<Books, "installments">, installmentId: string, at: number): CommitRow[] {
    const doc = books.installments.find((row) => row.localId === installmentId && row.deletedAt === null);
    return doc ? [nextRow("installments", doc, { deletedAt: at }, at)] : [];
}

const live = <Row extends { deletedAt: number | null }>(row: Row) => row.deletedAt === null;

export function pendingDeletion(books: Books, view: PlanView, at: number): CommitRow[] {
    const installment = (row: InstallmentView) => books.installments.find((doc) => doc.localId === row.id);
    if (view.paid === 0) {
        return [
            ...books.transfers
                .filter((row) => live(row) && row.installmentPlanId === view.id)
                .map((row) => nextRow("transfers", row, { installmentPlanId: null }, at)),
            ...books.installments
                .filter((row) => live(row) && row.planId === view.id)
                .map((row) => nextRow("installments", row, { deletedAt: at }, at)),
            ...books.outsidePayments
                .filter((row) => live(row) && row.planId === view.id)
                .map((row) => nextRow("outsidePayments", row, { deletedAt: at }, at)),
            ...books.installmentPlans
                .filter((row) => live(row) && row.localId === view.id)
                .map((row) => nextRow("installmentPlans", row, { deletedAt: at }, at)),
        ];
    }
    return view.rows.flatMap((row): CommitRow[] => {
        const doc = installment(row);
        if (!doc || row.status === "paid") {
            return [];
        }
        if (row.status === "unpaid") {
            return [nextRow("installments", doc, { deletedAt: at }, at)];
        }
        if (row.covered > row.fee) {
            const amount = roundMoney(row.covered - row.fee, decimalsFor(view.currency));
            return [nextRow("installments", doc, { amount }, at)];
        }
        return [
            ...liveFees(books, row.id).map((fee) =>
                nextRow("transactions", fee, { accountId: fee.accountId ?? null, installmentId: null }, at)
            ),
            nextRow("installments", doc, { amount: row.covered }, at),
        ];
    });
}
