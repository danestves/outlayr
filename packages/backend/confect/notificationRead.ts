import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { generateObject } from "@outlayr/ai/generate";
import type { TextModel } from "@outlayr/ai/model";
import { isPickableCurrency } from "@outlayr/money/currency";
import * as Effect from "effect/Effect";

import { components } from "../convex/_generated/api";
import { MAX_NAME_LENGTH } from "./lib/ledgerPrompt";
import { NotificationRead } from "./notificationRead.spec";
import type { DebtInstallment, ReadResult, ReadStatus } from "./notificationRead.spec";

export const MAX_TEXT_LENGTH = 1000;
/** The drain gives up at 8s and falls back to the on-device parser. */
const REQUEST_TIMEOUT_MS = 7000;

export function failure(status: Exclude<ReadStatus, "ok">): ReadResult {
    return { read: null, status };
}

function buildPrompt(text: string, language: string | undefined): string {
    return [
        "This is the text of a phone notification, possibly from a bank, card or payment app.",
        "Decide what it reports: a purchase or payment the user made (purchase), money the user received or a refund (income), a charge that was declined or failed (declined), a debt between the user and a person or lender (debt), or anything else such as a login, a statement, a promotion, an exchange rate or a balance reminder (other).",
        "It is a debt when the text says someone owes money (me debes, te debo, you owe me, I owe you), talks about a loan (préstamo, me prestó, te presté, loan) or pays one installment of a debt (cuota 2 de 6, installment 3 of 12). A purchase split into cuotas at checkout is still a purchase.",
        'The notification speaks to the user: "you" and "te" are the user, "I" and "me" are the other person. For a debt, set debt.verb: borrowed when the user now owes more (me debes, te presté, a loan the user received), lent when the person now owes the user more (te debo, me prestaste), paidBack when the user paid toward what they owe (a cuota the user paid), gotPaidBack when the person paid the user back. Set debt.installment to the cuota number and the total count (of, null when not given), or null when no cuota is named. Use null for debt on every other kind.',
        "For purchase, income and debt, read the amount as a plain positive number with a dot for decimals, the ISO 4217 currency code when the text names it or shows a symbol only one currency uses (null for a symbol several currencies share, such as $), and the merchant, sender or person as a short name the user would recognize (no card numbers, no city, no payment processor prefix such as SQ * or SumUp *). The app that posted the notification and the card are never the merchant.",
        "Use null for anything the text does not say.",
        language ? `The user's language is ${language}.` : "",
        `Notification: """${text}"""`,
    ]
        .filter(Boolean)
        .join(" ");
}

/** `shards: 10` is load-bearing: one unsharded counter throws OCC conflicts. */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
    notificationReadGlobal: { kind: "fixed window", period: HOUR, rate: 3000, shards: 10 },
});

const MAX_INSTALLMENTS = 600;

function cleanInstallment(installment: DebtInstallment | null): DebtInstallment | null {
    if (installment === null || installment.number < 1 || installment.number > MAX_INSTALLMENTS) {
        return null;
    }
    const counted =
        installment.of !== null && installment.of >= installment.number && installment.of <= MAX_INSTALLMENTS;
    return { number: installment.number, of: counted ? installment.of : null };
}

// Untrusted model output: an amount that is not positive, an unknown currency or an overlong name is dropped, and a
// debt kind without its verb reads as other.
export function cleanRead(output: NotificationRead): NotificationRead {
    const amount = output.amount !== null && output.amount > 0 ? output.amount : null;
    const code = output.currency?.trim().toUpperCase() ?? null;
    const merchant = output.merchant?.trim() ?? "";
    const debt = output.kind === "debt" && output.debt !== null ? output.debt : null;
    return {
        amount,
        currency: code !== null && isPickableCurrency(code) ? code : null,
        debt: debt && { installment: cleanInstallment(debt.installment), verb: debt.verb },
        kind: output.kind === "debt" && debt === null ? "other" : output.kind,
        merchant: merchant !== "" && merchant.length <= MAX_NAME_LENGTH ? merchant : null,
    };
}

/** Exported so tests can inject a fake `TextModel`. */
export const readNotification = Effect.fn("NotificationRead.readNotification")(
    function* readNotification(model: TextModel, text: string, language: string | undefined) {
        const output = yield* generateObject(model, NotificationRead, {
            messages: [{ content: buildPrompt(text, language), role: "user" }],
            timeout: REQUEST_TIMEOUT_MS,
        });
        const result: ReadResult = { read: cleanRead(output), status: "ok" };
        return result;
    },
    Effect.catchTags({
        ModelCallError: ({ reason }) =>
            Effect.succeed(failure(reason === "invalidResponse" ? "invalidResponse" : "providerError")),
    })
);
