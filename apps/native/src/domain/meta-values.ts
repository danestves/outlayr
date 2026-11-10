import { parseFavourites, serialiseFavourites } from "@outlayr/money/favourite-currencies";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

export const BoolText = Schema.Literals(["true", "false"]).pipe(
    Schema.decodeTo(
        Schema.Boolean,
        SchemaTransformation.transform({
            decode: (text) => text === "true",
            encode: (value) => (value ? "true" : "false"),
        })
    )
);

export const BitText = Schema.Literals(["1", "0"]).pipe(
    Schema.decodeTo(
        Schema.Boolean,
        SchemaTransformation.transform({
            decode: (text) => text === "1",
            encode: (value) => (value ? "1" : "0"),
        })
    )
);

export const NumberText = Schema.String.check(Schema.isPattern(/^-?\d+(\.\d+)?$/)).pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transform({
            decode: Number,
            encode: String,
        })
    )
);

export const CountText = Schema.String.check(Schema.isPattern(/^\d+$/)).pipe(
    Schema.decodeTo(
        Schema.Int,
        SchemaTransformation.transform({
            decode: Number,
            encode: String,
        })
    )
);

export const FavouriteCurrenciesText = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Array(Schema.String),
        SchemaTransformation.transform({
            decode: (text): readonly string[] => parseFavourites(text),
            encode: (codes) => serialiseFavourites([...codes]),
        })
    )
);

const IdList = Schema.mutable(Schema.Array(Schema.String));

export const StampedIds = Schema.Record(Schema.String, Schema.Finite);

export type StampedIds = typeof StampedIds.Type;

export const AutologAccess = Schema.Literals(["free", "open", "pending"]);

export type AutologAccess = typeof AutologAccess.Type;

export const AutologUsage = Schema.Record(Schema.String, Schema.Struct({ held: Schema.Boolean, used: Schema.Finite }));

export type AutologUsage = typeof AutologUsage.Type;

/** Only five fields are required: an extension build older than the app is normal. */
export const PendingWrite = Schema.Struct({
    amount: Schema.Finite,
    /** The amount as it arrived (e.g. "€12,40"); the drain reads the currency back out of it. */
    amountText: Schema.optional(Schema.NullOr(Schema.String)),
    card: Schema.optional(Schema.NullOr(Schema.String)),
    category: Schema.NullOr(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
    categoryId: Schema.optional(Schema.NullOr(Schema.String)),
    /** Beats `amountText` when the automation pinned one. */
    currency: Schema.optional(Schema.NullOr(Schema.String)),
    /** Epoch ms: when the intent ran, not when the app drained it. */
    date: Schema.Finite,
    /**
     * Identifies the purchase, where `id` identifies the enqueue: Wallet fires once on authorize and again on
     * settle. Carries no timestamp; the window is `WALLET_DEDUPE_WINDOW_MS` in `src/data/pending-write-decision.ts`.
     */
    dedupeKey: Schema.optional(Schema.NullOr(Schema.String)),
    id: Schema.String,
    income: Schema.Boolean,
    note: Schema.String,
    text: Schema.optional(Schema.NullOr(Schema.String)),
});

export const RepricedSubscription = Schema.Struct({
    currency: Schema.String,
    from: Schema.Finite,
    note: Schema.String,
    to: Schema.Finite,
});

export type RepricedSubscription = typeof RepricedSubscription.Type;

export const LastWalletEntry = Schema.Struct({
    /** Epoch ms of the commit, not of the purchase. */
    at: Schema.Finite,
    push: Schema.optional(Schema.Literal(true)),
    txId: Schema.String,
});

export type LastWalletEntry = typeof LastWalletEntry.Type;

export const NotificationText = Schema.Struct({
    amountText: Schema.NullOr(Schema.String),
    at: Schema.Finite,
    text: Schema.String,
});

export type NotificationText = typeof NotificationText.Type;

export const WalletCard = Schema.Struct({
    accountId: Schema.optional(Schema.NullOr(Schema.String)),
    lastAt: Schema.Finite,
    text: Schema.String,
    waiting: Schema.mutableKey(Schema.optional(Schema.Array(Schema.String))),
});

export type WalletCard = typeof WalletCard.Type;

export const PendingWriteLedgerEntry = Schema.Struct({
    at: Schema.Finite,
    date: Schema.optional(Schema.Finite),
    id: Schema.String,
    key: Schema.NullOr(Schema.String),
    source: Schema.optional(Schema.String),
    txId: Schema.String,
});

export type PendingWriteLedgerEntry = typeof PendingWriteLedgerEntry.Type;

export const FileImportRecord = Schema.Struct({
    categoryIds: IdList,
    importedAt: Schema.Number,
    transactionIds: IdList,
});

export type FileImportRecord = typeof FileImportRecord.Type;

export const MoneyManagerImportRecord = Schema.Struct({
    accountIds: IdList,
    accountKeys: Schema.Record(Schema.String, Schema.String),
    adjustedAccountIds: IdList,
    budgetIds: IdList,
    categoryIds: IdList,
    expectedBalances: Schema.Record(Schema.String, Schema.Number),
    importedAt: Schema.Number,
    renamedCategories: Schema.optionalKey(
        Schema.mutable(
            Schema.Array(Schema.Struct({ id: Schema.String, imported: Schema.String, previous: Schema.String }))
        )
    ),
    transactionIds: IdList,
    transferIds: IdList,
});

export type MoneyManagerImportRecord = typeof MoneyManagerImportRecord.Type;

export const MerchantBook = Schema.Record(
    Schema.String,
    Schema.Struct({
        answer: Schema.Struct({
            categoryName: Schema.NullOr(Schema.String),
            domain: Schema.NullOr(Schema.String),
            emoji: Schema.NullOr(Schema.String),
            isNewCategory: Schema.Boolean,
            parentCategoryName: Schema.NullOr(Schema.String),
            tags: Schema.Array(Schema.String),
        }),
        expiresAt: Schema.Finite,
    })
);

export type MerchantBook = typeof MerchantBook.Type;
