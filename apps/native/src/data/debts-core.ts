import type { EntryRateType } from "@outlayr/money/rates";
import { and, eq, isNull } from "drizzle-orm";

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

export interface PersonInput {
    currency: string;
    name: string;
    /** Signed like the balance: negative when you owe them, positive when they owe you. */
    openingBalance?: number;
}

export async function createPerson(db: Database, input: PersonInput): Promise<string> {
    return await accountsRepo.create(db, {
        currency: input.currency,
        initialBalance: roundToMinorUnits(input.openingBalance ?? 0, input.currency),
        kind: "person",
        name: input.name.trim(),
    });
}

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

export async function recordDebtMovement(db: Database, input: DebtMovementInput): Promise<string> {
    return await transfersRepo.create(db, debtTransferInput(input));
}

export interface OutsideMoveInput {
    amount: number;
    date: Date;
    note?: string;
    person: { currency: string; id: string };
    verb: DebtVerb;
}

export async function recordOutsideMove(db: Database, input: OutsideMoveInput): Promise<string> {
    const { date, person } = input;
    const amount = comesFromPerson(input.verb) ? -input.amount : input.amount;
    const id = newId();
    await db.insert(outsideMoves).values({
        accountId: person.id,
        amount,
        amountUsd: await frozenUsdAmount(db, amount, person.currency, date),
        date,
        id,
        note: input.note ?? "",
        updatedAt: new Date(),
    });
    return id;
}

export async function deleteOutsideMove(db: Database, id: string, now: Date = new Date()): Promise<void> {
    await db
        .update(outsideMoves)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(outsideMoves.id, id), isNull(outsideMoves.deletedAt)));
}

export interface OnCreditInput {
    amount: number;
    categoryId: string;
    date: Date;
    note?: string;
    person: { currency: string; id: string };
}

// An income entry on the person's account: income once, and they owe you. Being paid back later is a transfer.
export async function recordSoldOnCredit(db: Database, input: OnCreditInput): Promise<string> {
    return await transactionsRepo.create(
        db,
        {
            accountId: input.person.id,
            amount: input.amount,
            categoryId: input.categoryId,
            currency: input.person.currency,
            date: input.date,
            details: null,
            income: true,
            note: input.note ?? translateNow("debts.sale.title"),
        },
        { logoCandidate: false }
    );
}

export async function recordBoughtOnCredit(db: Database, input: OnCreditInput): Promise<string> {
    return await transactionsRepo.create(
        db,
        {
            accountId: input.person.id,
            amount: input.amount,
            categoryId: input.categoryId,
            currency: input.person.currency,
            date: input.date,
            details: null,
            income: false,
            note: input.note ?? translateNow("debts.purchase.title"),
        },
        { logoCandidate: false }
    );
}
