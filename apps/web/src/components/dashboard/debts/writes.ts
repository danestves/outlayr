import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { freezeTransfer, transferRejection } from "@outlayr/money/transfer-row";
import type { TransferInput } from "@outlayr/money/transfer-row";
import * as Effect from "effect/Effect";

import { createdAccount, frozenUsd, nextRow, ratesLookup } from "../../../lib/account-writes";
import type { Ledger } from "../../../lib/dashboard-series-ledger";
import { blankValues, createdEntry, draftOf, entryProblem } from "../../../lib/entry-writes";
import type { EntryProblem } from "../../../lib/entry-writes";
import type { CommitRow } from "../../../lib/ledger-committer";
import { createdGoal, deletedGoal } from "../goals/model";
import type { Goal } from "../goals/model";

type Account = LedgerBooks["accounts"][number];

export type DebtVerb = "borrowed" | "gotPaidBack" | "lent" | "paidBack";

export const comesFromPerson = (verb: DebtVerb) => verb === "borrowed" || verb === "gotPaidBack";

const RATE_DIGITS = 10;

export interface NewPerson {
    currency: string;
    name: string;
    /** Signed like the balance: negative when you owe them. */
    opening: number;
    /** Set when no rate prices the opening, so the person still counts toward net worth. */
    openingUsd: number | null;
    openedAt: number;
}

export function createdPerson(
    books: Pick<LedgerBooks, "accounts" | "exchangeRates">,
    person: NewPerson,
    id: string,
    at: number
) {
    const row = createdAccount(
        books,
        {
            creditLimit: null,
            currency: person.currency,
            customColor: null,
            emoji: null,
            icon: null,
            imageColor: null,
            imageKey: null,
            kind: "person",
            name: person.name.trim(),
            paymentDay: null,
            statementDay: null,
        },
        person.opening,
        id,
        at
    );
    return nextRow(
        "accounts",
        { deletedAt: null, localId: id, updatedAt: 0 },
        {
            ...row.fields,
            initialBalanceDate: person.openedAt,
            initialBalanceUsd:
                person.openingUsd === null
                    ? frozenUsd(books, person.opening, person.currency, person.openedAt)
                    : Math.sign(person.opening) * person.openingUsd,
        },
        at
    );
}

export interface DebtLeg {
    accountId: string;
    amount: number;
    currency: string;
}

export interface DebtMovement {
    /** In that account's own currency. */
    account: DebtLeg;
    /** The person's side was typed, not priced at the day's rate. */
    byHand: boolean;
    date: number;
    note: string;
    person: DebtLeg;
    verb: DebtVerb;
}

/** Each leg is already in its account's currency, so the stored rate is the one they imply and reads back as typed. */
export function debtTransferInput({ account, byHand, date, note, person, verb }: DebtMovement): TransferInput {
    const [from, to] = comesFromPerson(verb) ? [person, account] : [account, person];
    const crossed = from.currency !== to.currency;
    let exchangeRateType: string | null = null;
    if (crossed) {
        exchangeRateType = byHand ? "custom" : "official";
    }
    return {
        date: new Date(date),
        exchangeRate: crossed && from.amount > 0 ? to.amount / from.amount : 1,
        exchangeRateType,
        fees: {},
        fromAccountId: from.accountId,
        fromAmount: from.amount,
        fromCurrency: from.currency,
        note: note.trim(),
        toAccountId: to.accountId,
        toAmount: to.amount,
        toCurrency: to.currency,
    };
}

export function movementProblem(ledger: Ledger, input: TransferInput): "amount" | "rateMissing" | null {
    if (Number.isNaN(input.date.getTime()) || transferRejection(input) !== null) {
        return "amount";
    }
    const { fromAmountUsd, toAmountUsd } = Effect.runSync(freezeTransfer(ratesLookup(ledger.books), input));
    return fromAmountUsd === null || toAmountUsd === null ? "rateMissing" : null;
}

export interface OutsideMove {
    amount: number;
    date: number;
    note: string;
    person: { currency: string; id: string };
    /** Typed by hand when no rate prices the person's currency that day. */
    usd: number | null;
    verb: DebtVerb;
}

/** Money that changed hands outside every account: it only moves the person's balance. */
export function outsideMove(books: Pick<LedgerBooks, "exchangeRates">, move: OutsideMove, id: string, at: number) {
    const amount = comesFromPerson(move.verb) ? -move.amount : move.amount;
    return nextRow(
        "outsideMoves",
        { deletedAt: null, localId: id, updatedAt: 0 },
        {
            accountId: move.person.id,
            adjustment: false,
            amount,
            amountUsd:
                move.usd === null
                    ? frozenUsd(books, amount, move.person.currency, move.date)
                    : Math.sign(amount) * move.usd,
            date: move.date,
            note: move.note.trim(),
        },
        at
    );
}

export interface OnCredit {
    amountText: string;
    categoryId: string | null;
    currency: string;
    dateText: string;
    /** Sold on credit is income once; they owe you until a transfer pays it. */
    income: boolean;
    note: string;
    personId: string;
    usd: number | null;
}

export function onCreditDraft(ledger: Ledger, entry: OnCredit, amount: number, at: number) {
    const values = {
        ...blankValues(ledger, entry.personId, at),
        accountId: entry.personId,
        amountText: entry.amountText,
        categoryId: entry.categoryId,
        currency: entry.currency,
        currencyByHand: true,
        dateText: entry.dateText,
        income: entry.income,
        note: entry.note.trim(),
        rateText: entry.usd === null || entry.usd <= 0 ? "" : (amount / entry.usd).toFixed(RATE_DIGITS),
        rateType: entry.usd === null ? ("official" as const) : ("custom" as const),
    };
    return draftOf(ledger, values, null, "");
}

export function onCreditRows(
    ledger: Ledger,
    entry: OnCredit,
    amount: number,
    id: string,
    at: number
): { problem: EntryProblem } | { rows: CommitRow[] } {
    const draft = onCreditDraft(ledger, entry, amount, at);
    const problem = entryProblem(ledger, draft, null, at);
    return problem === null ? { rows: createdEntry(ledger, id, draft, at) } : { problem };
}

export interface PlanTarget {
    accountId: string;
    /** Signed, in the account's currency: the start the plan measures progress from. */
    balance: number;
    currency: string;
    name: string;
}

/**
 * A live plan only moves its date; otherwise the old ones go and a new one anchors on the balance now, in the
 * account's own currency, so the share paid never moves with a rate. Null when no rate prices that balance.
 */
export function payoffPlanRows(
    books: Pick<LedgerBooks, "exchangeRates" | "savingsGoals">,
    target: PlanTarget,
    plans: { all: readonly Goal[]; live: Goal | null },
    targetDate: number,
    id: string,
    at: number
): CommitRow[] | null {
    if (plans.live) {
        return [nextRow("savingsGoals", plans.live, { targetDate }, at)];
    }
    const created = createdGoal(books, { ...target, startAmount: target.balance, targetAmount: 0, targetDate }, id, at);
    return created === null ? null : [...plans.all.map((goal) => deletedGoal(goal, at)), created];
}

export const removedPlans = (plans: readonly Goal[], at: number) => plans.map((goal) => deletedGoal(goal, at));

export const renamedPerson = (account: Account, name: string, at: number) =>
    nextRow("accounts", account, { name: name.trim() }, at);
