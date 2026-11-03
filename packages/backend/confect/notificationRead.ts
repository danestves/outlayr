import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { isPickableCurrency } from "@outlayr/money/currency";
import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import * as Effect from "effect/Effect";

import { components } from "../convex/_generated/api";
import { MAX_NAME_LENGTH } from "./lib/ledgerPrompt";
import { modelCallError, modelSchema } from "./lib/modelCall";
import { NotificationRead } from "./notificationRead.spec";
import type { ReadResult, ReadStatus } from "./notificationRead.spec";

export const MAX_TEXT_LENGTH = 1000;
/** The drain gives up at 8s and falls back to the on-device parser. */
const REQUEST_TIMEOUT_MS = 7000;

export function failure(status: Exclude<ReadStatus, "ok">): ReadResult {
    return { read: null, status };
}

const modelOutputSchema = modelSchema(NotificationRead);

function buildPrompt(text: string, language: string | undefined): string {
    return [
        "This is the text of a phone notification, possibly from a bank, card or payment app.",
        "Decide what it reports: a purchase or payment the user made (purchase), money the user received or a refund (income), a charge that was declined or failed (declined), or anything else such as a login, a statement, a promotion or a balance reminder (other).",
        "For purchase and income, read the amount as a plain positive number with a dot for decimals, the ISO 4217 currency code when the text names it or shows a symbol only one currency uses (null for a symbol several currencies share, such as $), and the merchant or sender as a short name the user would recognize (no card numbers, no city, no payment processor prefix such as SQ * or SumUp *). The app that posted the notification and the card are never the merchant.",
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

// Untrusted model output: an amount that is not positive, an unknown currency or an overlong name is dropped.
export function cleanRead(output: NotificationRead): NotificationRead {
    const amount = output.amount !== null && output.amount > 0 ? output.amount : null;
    const code = output.currency?.trim().toUpperCase() ?? null;
    const merchant = output.merchant?.trim() ?? "";
    return {
        amount,
        currency: code !== null && isPickableCurrency(code) ? code : null,
        kind: output.kind,
        merchant: merchant !== "" && merchant.length <= MAX_NAME_LENGTH ? merchant : null,
    };
}

/** Exported so tests can inject a fake `LanguageModel`. */
export const readNotification = Effect.fn("NotificationRead.readNotification")(
    function* readNotification(model: LanguageModel, text: string, language: string | undefined) {
        const { output } = yield* Effect.tryPromise({
            catch: modelCallError,
            try: () =>
                generateText({
                    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                    maxRetries: 0,
                    model,
                    output: Output.object({ schema: modelOutputSchema }),
                    prompt: buildPrompt(text, language),
                    reasoning: "low",
                }),
        });
        const result: ReadResult = { read: cleanRead(output), status: "ok" };
        return result;
    },
    Effect.catchTags({
        ModelCallError: ({ reason }) =>
            Effect.succeed(failure(reason === "invalidResponse" ? "invalidResponse" : "providerError")),
    })
);
