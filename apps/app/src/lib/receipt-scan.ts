import { namesWithinBudget } from "@outlayr/backend/confect/lib/ledgerPrompt";
import type { ReceiptDraft, ScanStatus } from "@outlayr/backend/confect/receiptScan.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { categoryTree } from "@/components/dashboard/import/ai";

import { liveCategories } from "./category-writes";
import { convexClient } from "./convex";
import { openAccounts } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import { blankValues, wallText } from "./entry-writes";
import type { EntryValues } from "./entry-writes";
import { scanImage } from "./installment-scan";
import { money } from "./ledger";

export const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024;
const PDF_TYPE = "application/pdf";
const PDF_WIDTH = 1600;

export type ScanFailure = Exclude<typeof ScanStatus.Type, "ok"> | "offline" | "tooBig" | "unreadable";

const StoredReceipt = Schema.Struct({
    items: Schema.NonEmptyArray(Schema.Struct({ name: Schema.String, price: Schema.Finite, quantity: Schema.Finite })),
    subtotal: Schema.NullOr(Schema.Finite),
    tax: Schema.NullOr(Schema.Finite),
    tip: Schema.NullOr(Schema.Finite),
});

/** The lines an entry keeps from its receipt, in the phone's JSON shape. */
export type StoredReceipt = typeof StoredReceipt.Type;

const decodeStoredReceipt = Schema.decodeUnknownOption(Schema.fromJsonString(StoredReceipt));

export const parseReceipt = (raw: string | null | undefined) =>
    raw == null ? null : Option.getOrNull(decodeStoredReceipt(raw));

export interface ScannedEntry {
    fileName: string;
    receipt: StoredReceipt | null;
    values: EntryValues;
}

export const isReceiptFile = (file: File) => file.type.startsWith("image/") || isPdf(file);

const isPdf = (file: File) => file.type === PDF_TYPE || file.name.toLowerCase().endsWith(".pdf");

async function firstPage(file: File): Promise<Blob | null> {
    try {
        const { renderPageAsImage } = await import("unpdf");
        const png = await renderPageAsImage(new Uint8Array(await file.arrayBuffer()), 1, { width: PDF_WIDTH });
        return new Blob([png], { type: "image/png" });
    } catch {
        return null;
    }
}

/** The JPEG the action takes. A PDF goes as a picture of its first page, drawn here so the file itself never leaves. */
export async function receiptImage(
    file: File
): Promise<{ image: ArrayBuffer; ok: true } | { ok: false; reason: "tooBig" | "unreadable" }> {
    if (file.size > MAX_RECEIPT_FILE_BYTES) {
        return { ok: false, reason: "tooBig" };
    }
    const source = isPdf(file) ? await firstPage(file) : file;
    const image = source && (await scanImage(source));
    return image ? { image, ok: true } : { ok: false, reason: "unreadable" };
}

const fold = (name: string) => name.trim().toLowerCase();

function uniqueByName<Row extends { name: string | null }>(rows: readonly Row[], name: string | null) {
    if (name === null) {
        return null;
    }
    const found = rows.filter((row) => row.name !== null && fold(row.name) === fold(name));
    return found.length === 1 ? (found[0] ?? null) : null;
}

/** Only the names the backend's budget lets through, or none: an oversized ledger would fail every scan as invalid. */
export function promptNames(books: Ledger["books"]) {
    const accounts = openAccounts(books).map((row) => row.name);
    const tree = categoryTree(books);
    return namesWithinBudget(tree, accounts) ? { accounts, categoryTree: tree } : { accounts: [], categoryTree: [] };
}

function regionOf(language: string) {
    try {
        return new Intl.Locale(language).region;
    } catch {
        return undefined;
    }
}

export async function scanReceipt(
    image: ArrayBuffer,
    ledger: Ledger,
    language: string
): Promise<{ draft: typeof ReceiptDraft.Type; ok: true } | { ok: false; reason: ScanFailure }> {
    const reply = await convexClient()
        .action(api.receiptScan.scan, {
            ...promptNames(ledger.books),
            aiConsent: AI_CONSENT_VERSION,
            currency: ledger.currency,
            image,
            language,
            regionCode: regionOf(globalThis.navigator?.language ?? language),
            today: ledger.today,
        })
        .catch(() => null);
    if (reply === null) {
        return { ok: false, reason: globalThis.navigator?.onLine === false ? "offline" : "providerError" };
    }
    if (reply.status !== "ok") {
        return { ok: false, reason: reply.status };
    }
    return reply.receipt === null ? { ok: false, reason: "unclear" } : { draft: reply.receipt, ok: true };
}

/**
 * The Add form's values for a read receipt. A name that matches nothing stays blank for the form to ask, and a
 * receipt from today keeps the clock so it sorts among today's rows; other days land at noon, as on the phone.
 */
export function scannedEntry(
    ledger: Ledger,
    draft: typeof ReceiptDraft.Type,
    start: { accountId: string | null; at: number; fileName: string }
): ScannedEntry {
    const blank = blankValues(ledger, start.accountId, start.at);
    const account = uniqueByName(openAccounts(ledger.books), draft.accountName);
    const accountId = account?.localId ?? blank.accountId;
    const accountCurrency = account?.currency ?? blank.currency;
    const currency = (draft.currencyUnresolved ? null : draft.currency) ?? accountCurrency;
    const decimals = decimalsFor(currency);
    const sameKind = liveCategories(ledger.books.categories).filter((row) => row.income === draft.income);
    const round = (value: number | null) => (value === null ? null : roundMoney(value, decimals));
    const [first, ...rest] = draft.items.map(({ name, price, quantity }) => ({
        name,
        price: roundMoney(price, decimals),
        quantity,
    }));
    return {
        fileName: start.fileName,
        receipt:
            first === undefined
                ? null
                : {
                      items: [first, ...rest],
                      subtotal: round(draft.subtotal),
                      tax: round(draft.tax),
                      tip: round(draft.tip),
                  },
        values: {
            ...blank,
            accountId,
            amountText: money(roundMoney(draft.total, decimals), currency),
            categoryId: uniqueByName(sameKind, draft.categoryName)?.localId ?? null,
            currency,
            currencyByHand: currency !== accountCurrency,
            dateText: draft.date === ledger.today ? wallText(start.at, ledger) : `${draft.date}T12:00`,
            income: draft.income,
            note: draft.merchant.trim(),
        },
    };
}
