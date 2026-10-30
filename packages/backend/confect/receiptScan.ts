import { HOUR, isRateLimitError, RateLimiter } from "@convex-dev/rate-limiter";
import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import { ActionCtx, MutationRunner } from "./_generated/services";
import { clampDate, describeTree, draftCurrency, normalizeDomain, pickKnown, trimTo } from "./lib/ledgerPrompt";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { perUserBurst } from "./lib/limits";
import { modelCallError, modelSchema } from "./lib/modelCall";
import { MAX_AMOUNT } from "./lib/sanitizeLimits";
import type { ReceiptDraft, ReceiptItem, ScanResult, ScanStatus } from "./receiptScan.spec";
import { isPro } from "./revenuecat";

// A Convex value tops out at 1MB and the photo travels as one; the client re-encodes to fit.
export const MAX_IMAGE_BYTES = 900_000;
const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const MAX_MERCHANT_LENGTH = 80;
const MAX_ITEM_NAME_LENGTH = 80;
const MAX_PAYMENT_LENGTH = 40;
export const MAX_ITEMS = 60;
const MAX_PAST_DAYS = 366 * 3;
// Under the client's 30s abort.
export const REQUEST_TIMEOUT_MS = 22_000;

export function failure(status: Exclude<typeof ScanStatus.Type, "ok">): typeof ScanResult.Type {
    return { receipt: null, status };
}

/** Only the JSON shape: the model's output stays untrusted until `normalizeDraft`. */
export const ModelOutput = Schema.Struct({
    accountName: Schema.NullOr(Schema.String),
    categoryName: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    currencyPrinted: Schema.Boolean,
    date: Schema.NullOr(Schema.String),
    domain: Schema.NullOr(Schema.String),
    found: Schema.Boolean,
    items: Schema.Array(
        Schema.Struct({
            name: Schema.String,
            price: Schema.NullOr(Schema.Finite),
            quantity: Schema.NullOr(Schema.Finite),
        })
    ),
    kind: Schema.Literals(["expense", "refund"]),
    merchant: Schema.NullOr(Schema.String),
    paymentMethod: Schema.NullOr(Schema.String),
    subtotal: Schema.NullOr(Schema.Finite),
    tax: Schema.NullOr(Schema.Finite),
    tip: Schema.NullOr(Schema.Finite),
    total: Schema.NullOr(Schema.Finite),
});

export type ModelOutput = typeof ModelOutput.Type;

const modelOutputSchema = modelSchema(ModelOutput);

// Unsharded, a global counter is one hot document that throws OCC write conflicts under concurrency.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
    receiptScanGlobal: {
        kind: "fixed window",
        period: HOUR,
        rate: 1000,
        shards: 10,
    },
});

export function looksLikeJpeg(image: ArrayBuffer): boolean {
    const head = new Uint8Array(image, 0, Math.min(JPEG_MAGIC.length, image.byteLength));
    return head.length === JPEG_MAGIC.length && JPEG_MAGIC.every((byte, index) => head[index] === byte);
}

export function buildPrompt(args: LedgerContext): string {
    return [
        "You read photographed receipts, invoices and bills for a person's expense tracker and answer one JSON object describing the purchase.",
        "found is false when the photo holds no receipt, invoice or bill (a menu, a product, a screen, a blank page); then every other field may be null or empty.",
        'merchant is the store, restaurant or business that issued the receipt, 1–4 words, written the way the brand writes itself ("Mercadona", not "MERCADONA S.A.") — never its legal suffix, address or tax id.',
        'domain is the merchant\'s primary web domain, a bare hostname ("carrefour.es", "starbucks.com"), only when you know it with confidence for that merchant in the person\'s region; otherwise null.',
        `date is the purchase date printed on the receipt as YYYY-MM-DD. Today is ${args.today}; a printed date is read against it (a receipt is never from the future, and a two-digit year is the most recent one). With no date printed, answer null.`,
        `The ledger's currency is ${args.currency}. currency is the ISO 4217 code of the receipt's own currency: the code when one is printed (EUR, MXN, JPY); else the code a printed symbol most likely means${args.regionCode ? ` for a receipt in ${args.regionCode}` : ""} ("€" is EUR, "£" is GBP, "¥" is JPY or CNY by the language, "$" is the dollar or peso of the country the receipt comes from). currencyPrinted is true only when the code itself is printed.`,
        "total is the amount the person paid, as a positive number of major units — the grand total after tax, tip, discounts and rounding, not a subtotal and not a change line. subtotal, tax and tip are the printed lines when present, else null.",
        `items are the purchased lines in printed order: name as printed (trimmed, without codes and without the quantity that opens the line), quantity (1 when none is printed) and price as the LINE total in the receipt's currency, quantity included. Never include subtotal, tax, tip, discount, total, payment or change lines as items. At most ${MAX_ITEMS} items; a longer receipt keeps its first ${MAX_ITEMS}.`,
        'paymentMethod is how it was paid as printed, in at most 4 words ("Visa •••• 4242", "Cash", "Apple Pay"); null when not printed.',
        'kind is "refund" only for a return or refund slip where money came back to the person; otherwise "expense".',
        `The person's categories, with any nested under them, are: ${describeTree(args.categoryTree)}. Pick the one that fits the merchant and the items best and answer its name verbatim, or null when none fits. Never invent a category name.`,
        args.accounts.length > 0
            ? `Their accounts are: ${args.accounts.join(", ")}. Set accountName verbatim only when the payment line clearly names one of them (a card brand or bank printed there that appears in an account's name, so "Mastercard ••1234" names an account called "Mastercard Santander"); otherwise null.`
            : "They have no accounts; accountName is null.",
        args.language
            ? `The person's language is ${args.language}; keep item and merchant names as printed, do not translate them.`
            : "",
    ]
        .filter((line) => line.length > 0)
        .join(" ");
}

function moneyLine(value: number | null): number | null {
    return value !== null && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT ? value : null;
}

// The number needs a space or an x after it, so "2% Milk" keeps its 2.
const LEADING_QUANTITY = /^(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*|\s+)(?=\S)/u;

// Only when it matches the reported quantity, so the review does not read "2× 2 Leche".
function nameWithoutQuantity(name: string, quantity: number): string {
    const match = LEADING_QUANTITY.exec(name);
    if (!match?.[1]) {
        return name;
    }
    const printed = Number.parseFloat(match[1].replace(",", "."));
    const rest = name.slice(match[0].length).trim();
    return printed === quantity && rest.length > 0 ? rest : name;
}

export function normalizeItems(items: ModelOutput["items"]): (typeof ReceiptItem.Type)[] {
    const kept: (typeof ReceiptItem.Type)[] = [];
    for (const item of items) {
        const quantity =
            item.quantity !== null && Number.isFinite(item.quantity) && item.quantity > 0
                ? Math.round(item.quantity * 1000) / 1000
                : 1;
        const trimmed = trimTo(item.name, MAX_ITEM_NAME_LENGTH);
        const name = trimmed === null ? null : nameWithoutQuantity(trimmed, quantity);
        const price = moneyLine(item.price);
        if (name === null || price === null) {
            continue;
        }
        kept.push({ name, price, quantity });
        if (kept.length === MAX_ITEMS) {
            break;
        }
    }
    return kept;
}

export function normalizeDraft(output: ModelOutput, args: LedgerContext): typeof ReceiptDraft.Type | null {
    const { total } = output;
    if (!(output.found && total != null && Number.isFinite(total) && total > 0 && total <= MAX_AMOUNT)) {
        return null;
    }
    const knownCategories = args.categoryTree.flatMap((branch) => [branch.name, ...branch.children]);
    const { currency, unresolved: currencyUnresolved } = draftCurrency(output.currency, args.currency);
    return {
        accountName: pickKnown(output.accountName, args.accounts),
        categoryName: pickKnown(output.categoryName, knownCategories),
        currency,
        currencySource: output.currencyPrinted ? "printed" : "inferred",
        currencyUnresolved,
        date: clampDate(output.date, args.today, MAX_PAST_DAYS, 0),
        domain: normalizeDomain(output.domain),
        income: output.kind === "refund",
        items: normalizeItems(output.items),
        merchant: trimTo(output.merchant, MAX_MERCHANT_LENGTH) ?? "",
        paymentMethod: trimTo(output.paymentMethod, MAX_PAYMENT_LENGTH),
        subtotal: moneyLine(output.subtotal),
        tax: moneyLine(output.tax),
        tip: moneyLine(output.tip),
        total,
    };
}

export const readReceipt = Effect.fn("ReceiptScan.readReceipt")(
    function* readReceipt(model: LanguageModel, image: ArrayBuffer, context: LedgerContext) {
        const { output } = yield* Effect.tryPromise({
            catch: modelCallError,
            try: () =>
                generateText({
                    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                    maxRetries: 0,
                    messages: [
                        {
                            content: [
                                { data: new Uint8Array(image), mediaType: "image/jpeg", type: "file" },
                                { text: "Read this receipt.", type: "text" },
                            ],
                            role: "user",
                        },
                    ],
                    model,
                    output: Output.object({ schema: modelOutputSchema }),
                    reasoning: "low",
                    system: buildPrompt(context),
                }),
        });
        const receipt = normalizeDraft(output, context);
        return receipt === null ? failure("unclear") : { receipt, status: "ok" as const };
    },
    Effect.catchTags({
        ModelCallError: ({ reason }) =>
            Effect.succeed(failure(reason === "invalidResponse" ? "invalidResponse" : "providerError")),
    })
);

export const admitScan = Effect.fn("ReceiptScan.admitScan")(function* admitScan(
    identity: Pick<UserIdentity, "subject" | "tokenIdentifier">
) {
    const ctx = yield* ActionCtx;
    const { runMutation } = yield* MutationRunner;
    const pro = yield* isPro(ctx, identity.subject);
    const config = yield* perUserBurst("receiptScan", pro);
    const perUser = yield* Effect.promise(() =>
        rateLimiter.limit(ctx, "receiptScanPerUser", { config, key: identity.tokenIdentifier })
    );
    if (!perUser.ok) {
        return "rateLimited" as const;
    }
    return yield* runMutation(refs.internal.receiptScan.admit).pipe(
        Effect.catchDefect((defect) =>
            isRateLimitError(defect) ? Effect.succeed("rateLimited" as const) : Effect.die(defect)
        )
    );
});
