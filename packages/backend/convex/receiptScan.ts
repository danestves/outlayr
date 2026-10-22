// oxlint-disable unicorn/filename-case -- the Convex module name is the function path: clients call this action as api.receiptScan.scan

import { createAnthropic } from "@ai-sdk/anthropic";
import { HOUR, isRateLimitError, RateLimiter } from "@convex-dev/rate-limiter";
import { generateText, NoObjectGeneratedError, Output, TypeValidationError } from "ai";
import type { LanguageModel } from "ai";
import type { UserIdentity } from "convex/server";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { admitCapture } from "./lib/captures";
import { PICKABLE_CURRENCY_CODES } from "./lib/currencies";
import {
    clampDate,
    CURRENCY_PATTERN,
    DATE_PATTERN,
    describeTree,
    LANGUAGE_PATTERN,
    namesWithinBudget,
    normalizeDomain,
    pickKnown,
    REGION_PATTERN,
    trimTo,
} from "./lib/ledgerPrompt";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { perUserBurst } from "./lib/limits";
import { AI_CONSENT_VERSION, CLAUDE_FAST_MODEL_ID } from "./lib/models";
import { isPro } from "./revenuecat";

// A Convex value tops out at 1MB and the photo travels as one; the client re-encodes to fit.
export const MAX_IMAGE_BYTES = 900_000;
const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const MAX_MERCHANT_LENGTH = 80;
const MAX_ITEM_NAME_LENGTH = 80;
const MAX_PAYMENT_LENGTH = 40;
export const MAX_ITEMS = 60;
const MAX_PAST_DAYS = 366 * 3;
// The ledger's 13-digit ceiling (apps/native/src/domain/numpad.ts) keeps cent arithmetic inside float64's safe range.
export const MAX_AMOUNT = 9_999_999_999_999;
// Under the client's 30s abort.
export const REQUEST_TIMEOUT_MS = 22_000;

// A privacy boundary: the photo plus only what the model needs in this ledger's terms. No ids, balances or history.
export const receiptScanArgs = {
    accounts: v.array(v.string()),
    aiConsent: v.optional(v.number()),
    categoryTree: v.array(v.object({ children: v.array(v.string()), name: v.string() })),
    currency: v.string(),
    image: v.bytes(),
    language: v.optional(v.string()),
    /** ISO 3166-1 alpha-2, to break a currency symbol's tie ("$" in Mexico is pesos). */
    regionCode: v.optional(v.string()),
    /** `YYYY-MM-DD` in the device's local calendar. */
    today: v.string(),
};

export const scanStatus = v.union(
    v.literal("ok"),
    v.literal("unauthenticated"),
    v.literal("notConfigured"),
    v.literal("rateLimited"),
    v.literal("notEntitled"),
    v.literal("quotaExceeded"),
    v.literal("invalid"),
    v.literal("providerError"),
    v.literal("invalidResponse"),
    v.literal("unclear")
);

const receiptItem = v.object({
    name: v.string(),
    /** The line total, quantity included. */
    price: v.number(),
    quantity: v.number(),
});

const receiptDraft = v.object({
    accountName: v.union(v.string(), v.null()),
    categoryName: v.union(v.string(), v.null()),
    currency: v.union(v.string(), v.null()),
    currencySource: v.union(v.literal("printed"), v.literal("inferred")),
    currencyUnresolved: v.boolean(),
    date: v.string(),
    domain: v.union(v.string(), v.null()),
    income: v.boolean(),
    items: v.array(receiptItem),
    merchant: v.string(),
    paymentMethod: v.union(v.string(), v.null()),
    subtotal: v.union(v.number(), v.null()),
    tax: v.union(v.number(), v.null()),
    tip: v.union(v.number(), v.null()),
    total: v.number(),
});

const scanResult = v.object({
    receipt: v.union(receiptDraft, v.null()),
    status: scanStatus,
});

export type ScanStatus = Infer<typeof scanStatus>;

export interface ReceiptItem {
    name: string;
    price: number;
    quantity: number;
}

export interface ReceiptDraft {
    accountName: string | null;
    categoryName: string | null;
    /** ISO 4217, upper case. Null means the ledger's own currency. */
    currency: string | null;
    currencySource: "printed" | "inferred";
    /** A code the ledger cannot price; `currency` is then null as a stand-in, never a guess. */
    currencyUnresolved: boolean;
    /** `YYYY-MM-DD` in the device's local calendar. */
    date: string;
    domain: string | null;
    income: boolean;
    items: ReceiptItem[];
    merchant: string;
    paymentMethod: string | null;
    subtotal: number | null;
    tax: number | null;
    tip: number | null;
    total: number;
}

export interface ScanResult {
    receipt: ReceiptDraft | null;
    status: ScanStatus;
}

function failure(status: Exclude<ScanStatus, "ok">): ScanResult {
    return { receipt: null, status };
}

/** Only the JSON shape: the model's output stays untrusted until `normalizeDraft`. */
export const modelOutputSchema = z.object({
    accountName: z.string().nullable(),
    categoryName: z.string().nullable(),
    currency: z.string().nullable(),
    currencyPrinted: z.boolean(),
    date: z.string().nullable(),
    domain: z.string().nullable(),
    found: z.boolean(),
    items: z.array(
        z.object({
            name: z.string(),
            price: z.number().nullable(),
            quantity: z.number().nullable(),
        })
    ),
    kind: z.enum(["expense", "refund"]),
    merchant: z.string().nullable(),
    paymentMethod: z.string().nullable(),
    subtotal: z.number().nullable(),
    tax: z.number().nullable(),
    tip: z.number().nullable(),
    total: z.number().nullable(),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;

export const KNOWN_CURRENCIES: ReadonlySet<string> = new Set(PICKABLE_CURRENCY_CODES);

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

export function normalizeItems(items: ModelOutput["items"]): ReceiptItem[] {
    const kept: ReceiptItem[] = [];
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

export function normalizeDraft(output: ModelOutput, args: LedgerContext): ReceiptDraft | null {
    const { total } = output;
    if (!(output.found && total != null && Number.isFinite(total) && total > 0 && total <= MAX_AMOUNT)) {
        return null;
    }
    const knownCategories = args.categoryTree.flatMap((branch) => [branch.name, ...branch.children]);
    const printedCurrency = output.currency?.trim().toUpperCase() ?? null;
    // An unknown code ("RMB") would match no rate row, and folding it into the ledger's currency would be the
    // wrong denomination, so it is flagged instead.
    const foreign = printedCurrency != null && printedCurrency !== args.currency;
    const currencyUnresolved = foreign && !KNOWN_CURRENCIES.has(printedCurrency);
    const currency = foreign && !currencyUnresolved ? printedCurrency : null;
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

export async function readReceipt(
    model: LanguageModel,
    image: ArrayBuffer,
    context: LedgerContext
): Promise<ScanResult> {
    try {
        const { output } = await generateText({
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
        });
        const receipt = normalizeDraft(output, context);
        return receipt === null ? failure("unclear") : { receipt, status: "ok" };
    } catch (error) {
        if (NoObjectGeneratedError.isInstance(error) || TypeValidationError.isInstance(error)) {
            return failure("invalidResponse");
        }
        return failure("providerError");
    }
}

export const admit = internalMutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return "notEntitled" as const;
        }
        return admitCapture(ctx, identity, () => rateLimiter.limit(ctx, "receiptScanGlobal"));
    },
});

export async function admitScan(
    ctx: ActionCtx,
    identity: UserIdentity
): Promise<"ok" | "rateLimited" | "notEntitled" | "quotaExceeded"> {
    const perUser = await rateLimiter.limit(ctx, "receiptScanPerUser", {
        config: perUserBurst("receiptScan", await isPro(ctx, identity.subject)),
        key: identity.tokenIdentifier,
    });
    if (!perUser.ok) {
        return "rateLimited";
    }
    return ctx.runMutation(internal.receiptScan.admit, {}).catch((error) => {
        if (isRateLimitError(error)) {
            return "rateLimited" as const;
        }
        throw error;
    });
}

export const scan = action({
    args: receiptScanArgs,
    handler: async (ctx, args): Promise<ScanResult> => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return failure("unauthenticated");
        }

        // Read per call, so clearing the key with `npx convex env set` takes effect on the next scan.
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        if (
            args.image.byteLength === 0 ||
            args.image.byteLength > MAX_IMAGE_BYTES ||
            !looksLikeJpeg(args.image) ||
            !namesWithinBudget(args.categoryTree, args.accounts) ||
            !DATE_PATTERN.test(args.today) ||
            !CURRENCY_PATTERN.test(args.currency) ||
            (args.language !== undefined && !LANGUAGE_PATTERN.test(args.language)) ||
            (args.regionCode !== undefined && !REGION_PATTERN.test(args.regionCode))
        ) {
            return failure("invalid");
        }

        const admitted = await admitScan(ctx, identity);
        if (admitted !== "ok") {
            return failure(admitted);
        }

        const modelId = process.env.CLAUDE_FAST_MODEL_ID || CLAUDE_FAST_MODEL_ID;
        return readReceipt(createAnthropic({ apiKey })(modelId), args.image, {
            accounts: args.accounts,
            categoryTree: args.categoryTree,
            currency: args.currency,
            language: args.language,
            regionCode: args.regionCode,
            today: args.today,
        });
    },
    returns: scanResult,
});
