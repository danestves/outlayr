import type { EntryRateType } from "@outlayr/money/rates";
import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { outsideMoves } from "@/db/schema";
import { comesFromPerson } from "@/domain/debt-choices";
import { debtLegs } from "@/domain/debts";
import type { DebtVerb } from "@/domain/debts";
import { newId } from "@/domain/ids";
import { roundToMinorUnits } from "@/domain/money";
import { translateNow } from "@/i18n/runtime";

import { accountsRepo } from "./accounts-core";
import { frozenUsdAmount } from "./frozen-usd";
import { transactionsRepo } from "./transactions-core";
import { transfersRepo } from "./transfers-core";
import type { TransferInput } from "./transfers-core";

const DebtsOperation = Schema.Literals(["record-outside-move", "delete-outside-move"]);

export class DebtsError extends Schema.TaggedError<DebtsError>()("DebtsError", {
    cause: Schema.Defect(),
    operation: DebtsOperation,
}) {
    override get message(): string {
        return `Debts ${this.operation} failed`;
    }
}

export interface PersonInput {
    currency: string;
    name: string;
    /** Signed like the balance: negative when you owe them, positive when they owe you. */
    openingBalance?: number;
}

export const createPerson = Effect.fn("Debts.createPerson")(function* createPerson(db: Database, input: PersonInput) {
    return yield* accountsRepo.create(db, {
        currency: input.currency,
        initialBalance: roundToMinorUnits(input.openingBalance ?? 0, input.currency),
        kind: "person",
        name: input.name.trim(),
    });
});

/** In that account's own currency. */
export interface DebtLeg {
    accountId: string;
    amount: number;
    currency: string;
}

export interface DebtMovementInput {
    account: DebtLeg;
    date: Date;
    note?: string;
    person: DebtLeg;
    rateType: EntryRateType | null;
    verb: DebtVerb;
}

// Each leg is already in its account's currency and the stored rate is the one they imply, so it reads back as typed.
export function debtTransferInput(input: DebtMovementInput): TransferInput {
    const { from, to } = debtLegs(input.verb, { account: input.account, person: input.person });
    const crossCurrency = from.currency !== to.currency;
    return {
        date: input.date,
        exchangeRate: crossCurrency ? to.amount / from.amount : 1,
        exchangeRateType: crossCurrency ? input.rateType : null,
        fromAccountId: from.accountId,
        fromAmount: from.amount,
        fromCurrency: from.currency,
        note: input.note ?? "",
        toAccountId: to.accountId,
        toAmount: to.amount,
        toCurrency: to.currency,
    };
}

export const recordDebtMovement = Effect.fn("Debts.recordDebtMovement")(function* recordDebtMovement(
    db: Database,
    input: DebtMovementInput
) {
    return yield* transfersRepo.create(db, debtTransferInput(input));
});

export interface OutsideMoveInput {
    amount: number;
    date: Date;
    note?: string;
    person: { currency: string; id: string };
    verb: DebtVerb;
}

export const recordOutsideMove = Effect.fn("Debts.recordOutsideMove")(function* recordOutsideMove(
    db: Database,
    input: OutsideMoveInput
) {
    const { date, person } = input;
    const amount = comesFromPerson(input.verb) ? -input.amount : input.amount;
    const id = newId();
    const amountUsd = yield* frozenUsdAmount(db, amount, person.currency, date);
    yield* Effect.tryPromise({
        catch: (cause) => new DebtsError({ cause, operation: "record-outside-move" }),
        try: () =>
            db.insert(outsideMoves).values({
                accountId: person.id,
                amount,
                amountUsd,
                date,
                id,
                note: input.note ?? "",
                updatedAt: new Date(),
            }),
    });
    return id;
});

export const deleteOutsideMove = Effect.fn("Debts.deleteOutsideMove")(function* deleteOutsideMove(
    db: Database,
    id: string,
    now: Date = new Date()
) {
    yield* Effect.tryPromise({
        catch: (cause) => new DebtsError({ cause, operation: "delete-outside-move" }),
        try: () =>
            db
                .update(outsideMoves)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(outsideMoves.id, id), isNull(outsideMoves.deletedAt))),
    });
});

export interface OnCreditInput {
    amount: number;
    categoryId: string;
    date: Date;
    note?: string;
    person: { currency: string; id: string };
}

const recordOnCredit = (db: Database, input: OnCreditInput, income: boolean, note: string) =>
    transactionsRepo.create(
        db,
        {
            accountId: input.person.id,
            amount: input.amount,
            categoryId: input.categoryId,
            currency: input.person.currency,
            date: input.date,
            details: null,
            income,
            note,
        },
        { logoCandidate: false }
    );

// An income entry on the person's account: income once, and they owe you. Being paid back later is a transfer.
export const recordSoldOnCredit = Effect.fn("Debts.recordSoldOnCredit")(function* recordSoldOnCredit(
    db: Database,
    input: OnCreditInput
) {
    return yield* recordOnCredit(db, input, true, input.note ?? translateNow("debts.sale.title"));
});

export const recordBoughtOnCredit = Effect.fn("Debts.recordBoughtOnCredit")(function* recordBoughtOnCredit(
    db: Database,
    input: OnCreditInput
) {
    return yield* recordOnCredit(db, input, false, input.note ?? translateNow("debts.purchase.title"));
});
