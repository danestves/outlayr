import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { ResolvedReceipt } from "./receipt-scan";

const StoredReceipt = Schema.Struct({
    items: Schema.NonEmptyArray(Schema.Struct({ name: Schema.String, price: Schema.Finite, quantity: Schema.Finite })),
    subtotal: Schema.NullOr(Schema.Finite),
    tax: Schema.NullOr(Schema.Finite),
    tip: Schema.NullOr(Schema.Finite),
});

export type StoredReceipt = typeof StoredReceipt.Type;

const decodeStoredReceipt = Schema.decodeUnknownOption(Schema.fromJsonString(StoredReceipt));

export function serializeReceipt({
    items,
    subtotal,
    tax,
    tip,
}: Pick<ResolvedReceipt, "items" | "subtotal" | "tax" | "tip">): string | null {
    if (items.length === 0) {
        return null;
    }
    return JSON.stringify({
        items: items.map(({ name, price, quantity }) => ({ name, price, quantity })),
        subtotal,
        tax,
        tip,
    });
}

export function parseReceipt(raw: string | null | undefined): StoredReceipt | null {
    if (raw == null) {
        return null;
    }
    return Option.getOrNull(decodeStoredReceipt(raw));
}
