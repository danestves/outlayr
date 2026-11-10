import { accountBalances, rateTableOf, settingsOf, zoneOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { FIELDS_BY_TABLE } from "@outlayr/backend/confect/lib/syncTables";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { decimalsFor } from "@outlayr/money/currency";
import { accountDeletionPlan } from "@outlayr/money/entry-deletion";
import type { RateLookup } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import * as Effect from "effect/Effect";

import type { CommitRow } from "./ledger-committer";

type Account = LedgerBooks["accounts"][number];

export interface AccountDraft {
    creditLimit: number | null;
    currency: string;
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
    imageKey: string | null;
    kind: "asset" | "liability";
    name: string;
    paymentDay: number | null;
    statementDay: number | null;
}

interface SyncedDoc {
    deletedAt: number | null;
    localId: string;
    restoredAt?: number | null;
    updatedAt: number;
}

type Change = Readonly<Record<string, boolean | number | string | null | undefined>> & { deletedAt?: number | null };

/** A row at its next version. `restoredAt` travels with it: without it the server reads an older era and drops it. */
export function nextRow(table: CommitRow["table"], doc: SyncedDoc, change: Change, at: number): CommitRow {
    const merged = new Map(Object.entries({ ...doc, ...change }));
    const fields = Object.fromEntries(
        Object.keys(FIELDS_BY_TABLE[table]).flatMap((key) =>
            merged.get(key) === undefined ? [] : [[key, merged.get(key)]]
        )
    );
    // SAFETY: `doc` is a row of `table`, so its fields are that arm's, and the arm's own schema re-checks them at push.
    return {
        deletedAt: change.deletedAt === undefined ? doc.deletedAt : change.deletedAt,
        fields,
        localId: doc.localId,
        restoredAt: doc.restoredAt ?? null,
        table,
        updatedAt: Math.max(at, doc.updatedAt + 1),
    } as CommitRow;
}

const isLive = <Row extends { deletedAt: number | null }>(row: Row) => row.deletedAt === null;

export const withId = <Row extends { localId: string }>(rows: readonly Row[]) =>
    rows.map((row) => ({ ...row, id: row.localId }));

type PlanTable = "installmentPlans" | "installments" | "outsidePayments" | "transactions" | "transfers";

/** The tables every deletion plan reads, each row under `id` as the plan names it. */
export const planBooks = (books: Pick<LedgerBooks, PlanTable>) => ({
    installmentPlans: withId(books.installmentPlans),
    installments: withId(books.installments),
    outsidePayments: withId(books.outsidePayments),
    transactions: withId(books.transactions),
    transfers: withId(books.transfers),
});

export const ratesLookup =
    (books: Pick<LedgerBooks, "exchangeRates">): RateLookup =>
    (quote, rateType, date) => {
        let newest: { date: string; rate: number } | null = null;
        for (const row of books.exchangeRates) {
            if (
                row.quote === quote &&
                row.rateType === rateType &&
                row.date <= date &&
                (newest?.date ?? "") < row.date
            ) {
                newest = { date: row.date, rate: row.rate };
            }
        }
        return Effect.succeed(newest);
    };

/** Frozen at the rate of its own day, like native. Signed: an account can open overdrawn. */
export function frozenUsd(
    books: Pick<LedgerBooks, "exchangeRates">,
    amount: number,
    currency: string,
    at: number
): number | null {
    if (amount === 0) {
        return 0;
    }
    const { amountUsd } = Effect.runSync(
        canonicalUsd(ratesLookup(books), {
            amount: Math.abs(amount),
            currency,
            date: new Date(at),
            displayCurrency: currency,
        })
    );
    return amountUsd === null ? null : Math.sign(amount) * amountUsd;
}

export function createdAccount(
    books: Pick<LedgerBooks, "accounts" | "exchangeRates">,
    draft: AccountDraft,
    balance: number,
    id: string,
    at: number
): CommitRow {
    return {
        deletedAt: null,
        fields: {
            ...draft,
            archivedAt: null,
            checkedAt: null,
            dateCreated: at,
            initialBalance: balance,
            initialBalanceDate: at,
            initialBalanceUsd: frozenUsd(books, balance, draft.currency, at),
            sortOrder: Math.max(-1, ...books.accounts.filter(isLive).map((row) => row.sortOrder)) + 1,
        },
        localId: id,
        restoredAt: null,
        table: "accounts",
        updatedAt: at,
    };
}

/** The opening balance that lands on `balance` today, given everything already booked on the account. */
export function openingFor(books: LedgerBooks, account: Account, balance: number, currency: string, at: number) {
    const settings = settingsOf(books.appMeta);
    const [held] = accountBalances(
        { ...books, accounts: [{ ...account, archivedAt: null, currency, deletedAt: null, initialBalance: 0 }] },
        settings.currency,
        rateTableOf(books.exchangeRates),
        { now: at, offsetAt: zoneOf(settings.timeZone, books.transactions, at) }
    ).accounts;
    return roundMoney(balance - (held?.balance ?? 0), decimalsFor(currency));
}

/** `balance` is null when the form left the money alone, so a rate that moved does not rewrite the opening. */
export function editedAccount(
    books: LedgerBooks,
    account: Account,
    draft: AccountDraft,
    balance: number | null,
    at: number
): CommitRow {
    const initialBalance =
        balance === null ? account.initialBalance : openingFor(books, account, balance, draft.currency, at);
    const moved = initialBalance !== account.initialBalance || draft.currency !== account.currency;
    return nextRow(
        "accounts",
        account,
        {
            ...draft,
            initialBalance,
            initialBalanceUsd: moved
                ? frozenUsd(books, initialBalance, draft.currency, account.initialBalanceDate)
                : account.initialBalanceUsd,
        },
        at
    );
}

/** An adjustment is an outside move, so it shifts the balance without counting as spending or income. */
export function checkedAccount(
    books: Pick<LedgerBooks, "exchangeRates">,
    account: Account,
    adjustment: { amount: number; id: string; note: string } | null,
    at: number
): CommitRow[] {
    const stamp = nextRow("accounts", account, { checkedAt: at }, at);
    if (adjustment === null || adjustment.amount === 0) {
        return [stamp];
    }
    return [
        {
            deletedAt: null,
            fields: {
                accountId: account.localId,
                adjustment: true,
                amount: adjustment.amount,
                amountUsd: frozenUsd(books, adjustment.amount, account.currency, at),
                date: at,
                note: adjustment.note,
            },
            localId: adjustment.id,
            restoredAt: null,
            table: "outsideMoves",
            updatedAt: at,
        },
        stamp,
    ];
}

/** Takes back a check: the stamp returns to what it was and its adjustment, if any, goes. */
export function uncheckedAccount(
    books: Pick<LedgerBooks, "outsideMoves">,
    account: Account,
    checkedAt: number | null,
    adjustmentId: string | null,
    at: number
): CommitRow[] {
    const move = books.outsideMoves.find((row) => row.localId === adjustmentId);
    return [
        ...(move ? [nextRow("outsideMoves", move, { deletedAt: at }, at)] : []),
        nextRow("accounts", account, { checkedAt }, at),
    ];
}

export const archivedAccount = (account: Account, archivedAt: number | null, at: number) =>
    nextRow("accounts", account, { archivedAt }, at);

/** Only rows that actually moved, so saving an untouched order pushes nothing. */
export const reorderedAccounts = (order: readonly Account[], at: number) =>
    order.flatMap((account, sortOrder) =>
        account.sortOrder === sortOrder ? [] : [nextRow("accounts", account, { sortOrder }, at)]
    );

/** The rows of an account's deletion plan, which a test holds equal to native's `softDelete`. */
export function deletedAccount(books: LedgerBooks, account: Account, at: number): CommitRow[] {
    const plan = accountDeletionPlan(
        {
            ...planBooks(books),
            accounts: withId(books.accounts),
            outsideMoves: withId(books.outsideMoves),
            savingsGoals: withId(books.savingsGoals),
        },
        account.localId
    );
    const gone = { deletedAt: at };
    const tombstones = (
        table: "installmentPlans" | "installments" | "outsideMoves" | "outsidePayments" | "savingsGoals"
    ) => books[table].filter((row) => plan[table].has(row.localId)).map((row) => nextRow(table, row, gone, at));
    const entries = books.transactions.flatMap((row) => {
        const taken = plan.transactions.has(row.localId);
        const detached = plan.detached.transactions.has(row.localId);
        if (!(taken || detached)) {
            return [];
        }
        // A person's own entry: a schedule left on its tombstone would be revived.
        const own = taken && !detached && row.accountId === account.localId;
        const change = {
            ...(taken && gone),
            ...(own && { recurringType: RECURRING_TYPE.none }),
            ...(detached && { accountId: null }),
        };
        return [{ own, row: nextRow("transactions", row, change, at) }];
    });
    // Push batches commit separately, so each row must stay findable until the rows it leads to are gone: a push that
    // dies midway leaves the account there, and deleting again rebuilds the rest. Fees before transfers, a person's
    // own entries after what goes with them, account last.
    return [
        ...entries.filter((entry) => !entry.own).map((entry) => entry.row),
        ...books.transfers.flatMap((row) => {
            const taken = plan.transfers.has(row.localId);
            const detached = plan.detached.transfers.has(row.localId);
            return taken || detached
                ? [nextRow("transfers", row, { ...(taken && gone), ...(detached && { installmentPlanId: null }) }, at)]
                : [];
        }),
        ...tombstones("installments"),
        ...tombstones("outsidePayments"),
        ...tombstones("installmentPlans"),
        ...tombstones("outsideMoves"),
        ...tombstones("savingsGoals"),
        ...entries.filter((entry) => entry.own).map((entry) => entry.row),
        nextRow("accounts", account, gone, at),
    ];
}

const SEPARATORS = /[.,]/g;
const NOT_AMOUNT = /[^\d.,]/g;
const GROUP_DIGITS = 3;

/**
 * What a person typed, in any locale's grouping. "1,000" groups unless the currency really has three decimals, or
 * `thousands` is off for a figure where three decimals are ordinary, such as a rate.
 */
export function parseAmount(text: string, decimals: number, thousands = decimals !== GROUP_DIGITS): number {
    const clean = text.replaceAll(NOT_AMOUNT, "");
    const marks = clean.match(SEPARATORS) ?? [];
    const last = Math.max(clean.lastIndexOf("."), clean.lastIndexOf(","));
    const tail = clean.slice(last + 1);
    const onlyGroups = new Set(marks).size === 1 && (marks.length > 1 || (tail.length === GROUP_DIGITS && thousands));
    const whole = last < 0 || onlyGroups ? clean : clean.slice(0, last);
    const fraction = last < 0 || onlyGroups ? "" : tail;
    const value = Number(`${whole.replaceAll(SEPARATORS, "") || "0"}.${fraction || "0"}`);
    return roundMoney(value, decimals);
}
