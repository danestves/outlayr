import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

// A privacy boundary: the photo plus only what the model needs in this ledger's terms. No ids, balances or history.
export const receiptScanArgs = {
    accounts: Schema.Array(Schema.String),
    aiConsent: Schema.optional(Schema.Number),
    categoryTree: Schema.Array(Schema.Struct({ children: Schema.Array(Schema.String), name: Schema.String })),
    currency: Schema.String,
    image: Schema.instanceOf(ArrayBuffer),
    language: Schema.optional(Schema.String),
    /** ISO 3166-1 alpha-2, to break a currency symbol's tie ("$" in Mexico is pesos). */
    regionCode: Schema.optional(Schema.String),
    shareAnalytics: Schema.optional(Schema.Boolean),
    /** `YYYY-MM-DD` in the device's local calendar. */
    today: Schema.String,
};

export const ScanStatus = Schema.Literals([
    "ok",
    "unauthenticated",
    "notConfigured",
    "rateLimited",
    "notEntitled",
    "quotaExceeded",
    "invalid",
    "providerError",
    "invalidResponse",
    "unclear",
]);

export const CaptureAdmission = Schema.Literals(["ok", "notEntitled", "quotaExceeded"]);

export const ReceiptItem = Schema.Struct({
    name: Schema.String,
    /** The line total, quantity included. */
    price: Schema.Number,
    quantity: Schema.Number,
});

export const ReceiptDraft = Schema.Struct({
    accountName: Schema.NullOr(Schema.String),
    categoryName: Schema.NullOr(Schema.String),
    /** ISO 4217, upper case. Null means the ledger's own currency. */
    currency: Schema.NullOr(Schema.String),
    currencySource: Schema.Literals(["printed", "inferred"]),
    /** A code the ledger cannot price; `currency` is then null as a stand-in, never a guess. */
    currencyUnresolved: Schema.Boolean,
    /** `YYYY-MM-DD` in the device's local calendar. */
    date: Schema.String,
    domain: Schema.NullOr(Schema.String),
    income: Schema.Boolean,
    items: Schema.Array(ReceiptItem),
    merchant: Schema.String,
    paymentMethod: Schema.NullOr(Schema.String),
    subtotal: Schema.NullOr(Schema.Number),
    tax: Schema.NullOr(Schema.Number),
    tip: Schema.NullOr(Schema.Number),
    total: Schema.Number,
});

export const ScanResult = Schema.Struct({ receipt: Schema.NullOr(ReceiptDraft), status: ScanStatus });

export default GroupSpec.make()
    .addFunction(FunctionSpec.internalMutation({ args: () => ({}), name: "admit", returns: () => CaptureAdmission }))
    .addFunction(FunctionSpec.publicAction({ args: () => receiptScanArgs, name: "scan", returns: () => ScanResult }));
