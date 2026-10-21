import type { AccountKind } from "@outlayr/money/account-kind";

import { roundToMinorUnits } from "./money";

export interface DebtsInputRow {
    balance: number;
    exact: boolean;
    id: string;
    kind: AccountKind;
}

export type DebtRow<Row extends DebtsInputRow = DebtsInputRow> = Row & {
    /** Positive; an overpaid card is the one negative, matching `netWorth`. */
    amount: number;
    kind: Exclude<AccountKind, "asset">;
};

export interface DebtsOverview<Row extends DebtsInputRow = DebtsInputRow> {
    assetsExact: boolean;
    exact: boolean;
    haveTotal: number;
    owedToYou: DebtRow<Row>[];
    owedToYouTotal: number;
    settled: DebtRow<Row>[];
    youOwe: DebtRow<Row>[];
    youOweTotal: number;
}

const largestFirst = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;

/** Rounds each balance first, so a float residue (0.10 + 0.20 - 0.30) reads as settled, not as owing $0.00. */
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

export type DebtVerb = "borrowed" | "gotPaidBack" | "lent" | "paidBack";

/** The person's balance drops when money leaves them, so borrowing makes it negative (you owe them). */
export function debtLegs<Leg>(verb: DebtVerb, legs: { account: Leg; person: Leg }): { from: Leg; to: Leg } {
    const fromPerson = verb === "borrowed" || verb === "gotPaidBack";
    return fromPerson ? { from: legs.person, to: legs.account } : { from: legs.account, to: legs.person };
}
