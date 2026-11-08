import { accountBalances, rateTableOf, settingsOf, zoneOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { FIELDS_BY_TABLE } from "@outlayr/backend/confect/lib/syncTables";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { decimalsFor } from "@outlayr/money/currency";
import type { RateLookup } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import * as Effect from "effect/Effect";

import type { CommitRow } from "./ledger-commit";

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
function nextRow(table: CommitRow["table"], doc: SyncedDoc, change: Change, at: number): CommitRow {
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

const ratesLookup =
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

/** What `softDelete` touches on native. Entries stay detached, tombstoned ones too, or a restore re-links them. */
export function deletedAccount(books: LedgerBooks, account: Account, at: number): CommitRow[] {
    const id = account.localId;
    const gone = { deletedAt: at };
    const plans = books.installmentPlans.filter((row) => isLive(row) && row.accountId === id);
    const planIds = new Set(plans.map((row) => row.localId));
    const doomedTransfers = new Set(
        books.transfers
            .filter((row) => isLive(row) && (row.fromAccountId === id || row.toAccountId === id))
            .map((row) => row.localId)
    );
    // Push batches commit separately, so each row must stay findable until the rows it leads to are gone: a push that
    // dies midway leaves the account there, and deleting again rebuilds the rest. Fees before transfers, account last.
    return [
        ...books.transactions.flatMap((row) => {
            const fee = isLive(row) && doomedTransfers.has(row.transferId ?? "");
            const attached = row.accountId === id;
            return fee || attached
                ? [nextRow("transactions", row, { ...(fee && gone), ...(attached && { accountId: null }) }, at)]
                : [];
        }),
        ...books.transfers.flatMap((row) => {
            const doomed = doomedTransfers.has(row.localId);
            const planned = planIds.has(row.installmentPlanId ?? "");
            return doomed || planned
                ? [nextRow("transfers", row, { ...(doomed && gone), ...(planned && { installmentPlanId: null }) }, at)]
                : [];
        }),
        ...books.installments
            .filter((row) => isLive(row) && planIds.has(row.planId))
            .map((row) => nextRow("installments", row, gone, at)),
        ...books.outsidePayments
            .filter((row) => isLive(row) && planIds.has(row.planId))
            .map((row) => nextRow("outsidePayments", row, gone, at)),
        ...plans.map((row) => nextRow("installmentPlans", row, gone, at)),
        ...books.outsideMoves
            .filter((row) => isLive(row) && row.accountId === id)
            .map((row) => nextRow("outsideMoves", row, gone, at)),
        ...books.savingsGoals
            .filter((row) => isLive(row) && row.accountId === id)
            .map((row) => nextRow("savingsGoals", row, gone, at)),
        nextRow("accounts", account, gone, at),
    ];
}

const SEPARATORS = /[.,]/g;
const NOT_AMOUNT = /[^\d.,]/g;
const GROUP_DIGITS = 3;

/** What a person typed, in any locale's grouping. "1,000" groups unless the currency really has three decimals. */
export function parseAmount(text: string, decimals: number): number {
    const clean = text.replaceAll(NOT_AMOUNT, "");
    const marks = clean.match(SEPARATORS) ?? [];
    const last = Math.max(clean.lastIndexOf("."), clean.lastIndexOf(","));
    const tail = clean.slice(last + 1);
    const onlyGroups =
        new Set(marks).size === 1 && (marks.length > 1 || (tail.length === GROUP_DIGITS && decimals !== GROUP_DIGITS));
    const whole = last < 0 || onlyGroups ? clean : clean.slice(0, last);
    const fraction = last < 0 || onlyGroups ? "" : tail;
    const value = Number(`${whole.replaceAll(SEPARATORS, "") || "0"}.${fraction || "0"}`);
    return roundMoney(value, decimals);
}
