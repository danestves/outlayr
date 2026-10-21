import type { AccountKind } from "@outlayr/money/account-kind";

import { roundToMinorUnits } from "./money";

/** One account's standing in the display currency, as `accountsOverview` reports it. */
export interface DebtsInputRow {
    balance: number;
    exact: boolean;
    id: string;
    kind: AccountKind;
}

/** An input row, with what it owes stated as a figure. */
export type DebtRow<Row extends DebtsInputRow = DebtsInputRow> = Row & {
    /**
     * What is owed, stated positive. An overpaid card is the one row where it is
     * negative, which is what `netWorth` says about it too.
     */
    amount: number;
    kind: Exclude<AccountKind, "asset">;
};

export interface DebtsOverview<Row extends DebtsInputRow = DebtsInputRow> {
    assetsExact: boolean;
    /** False when any row fell back to face value instead of converting. */
    exact: boolean;
    haveTotal: number;
    /** People with a positive balance, largest first. */
    owedToYou: DebtRow<Row>[];
    /** Sum of `owedToYou`, positive. */
    owedToYouTotal: number;
    /** People whose balance is back at zero, in ledger order, so they stay reachable. */
    settled: DebtRow<Row>[];
    /** Every liability account and every person you owe, largest first. */
    youOwe: DebtRow<Row>[];
    /** Sum of `youOwe`, positive. */
    youOweTotal: number;
}

const largestFirst = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;

/**
 * Splits the debts on the ledger into the two directions.
 *
 * Each balance is rounded to the display currency first: a person lent 0.10
 * and 0.20 and paid back 0.30 holds a float residue, and it must read as
 * settled rather than as owing you $0.00. Ties keep ledger order, the sort
 * being stable. Whatever else a row carries (the account itself, say) rides
 * along.
 */
export function debtsOverview<Row extends DebtsInputRow>(
    rows: readonly Row[],
    displayCurrency: string
): DebtsOverview<Row> {
    const youOwe: DebtRow<Row>[] = [];
    const owedToYou: DebtRow<Row>[] = [];
    const settled: DebtRow<Row>[] = [];
    let exact = true;
    let assets = 0;
    let assetsExact = true;
    for (const input of rows) {
        const { kind } = input;
        if (kind === "asset") {
            assets += input.balance;
            assetsExact &&= input.exact;
            continue;
        }
        exact &&= input.exact;
        const rounded = roundToMinorUnits(input.balance, displayCurrency);
        // `|| 0` keeps a negated zero from formatting as "-$0.00".
        const row = { ...input, amount: Math.abs(rounded), kind };
        if (kind === "liability") {
            youOwe.push({ ...row, amount: -rounded || 0 });
        } else if (rounded < 0) {
            youOwe.push(row);
        } else if (rounded > 0) {
            owedToYou.push(row);
        } else {
            settled.push(row);
        }
    }
    youOwe.sort(largestFirst);
    owedToYou.sort(largestFirst);
    const total = (list: readonly DebtRow<Row>[]) =>
        roundToMinorUnits(
            list.reduce((sum, row) => sum + row.amount, 0),
            displayCurrency
        ) || 0;
    const owedToYouTotal = total(owedToYou);
    return {
        assetsExact,
        exact,
        haveTotal: roundToMinorUnits(assets + owedToYouTotal, displayCurrency) || 0,
        owedToYou,
        owedToYouTotal,
        settled,
        youOwe,
        youOweTotal: total(youOwe),
    };
}

/** The four ways money moves with a person, as the new-debt sheet names them. */
export type DebtVerb = "borrowed" | "gotPaidBack" | "lent" | "paidBack";

/**
 * Orients a debt movement as a transfer. Borrowing and being paid back bring
 * money from the person into your account; lending and paying back send it from
 * your account to the person. The person's balance goes down when money leaves
 * them, so borrowing makes it negative (you owe them) and lending positive.
 */
export function debtLegs<Leg>(verb: DebtVerb, legs: { account: Leg; person: Leg }): { from: Leg; to: Leg } {
    const fromPerson = verb === "borrowed" || verb === "gotPaidBack";
    return fromPerson ? { from: legs.person, to: legs.account } : { from: legs.account, to: legs.person };
}
