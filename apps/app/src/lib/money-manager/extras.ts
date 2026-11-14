import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { MoneyManagerImported } from "./writes";

const Ids = Schema.Array(Schema.String);

const Imported = Schema.Struct({
    accountIds: Ids,
    accountKeys: Schema.Record(Schema.String, Schema.String),
    budgetIds: Ids,
    categoryIds: Ids,
    entryIds: Ids,
    expectedBalances: Schema.Record(Schema.String, Schema.Number),
    renamedCategories: Schema.Array(
        Schema.Struct({ id: Schema.String, imported: Schema.String, previous: Schema.String })
    ),
    transferIds: Ids,
}) satisfies Schema.Codec<MoneyManagerImported, unknown>;

const KEY = "outlayr.import.moneyManager.v1";
const decode = Schema.decodeUnknownOption(Imported);

/** `ImportRecord` has no room for budgets, transfers or renames, so Undo reads them back from here. */
export function keepImported(recordId: string, imported: MoneyManagerImported) {
    try {
        globalThis.localStorage?.setItem(`${KEY}:${recordId}`, JSON.stringify(imported));
    } catch {
        // Undo then falls back to the entries and accounts the record itself lists.
    }
}

export function keptImported(recordId: string): MoneyManagerImported | null {
    try {
        const raw = globalThis.localStorage?.getItem(`${KEY}:${recordId}`);
        return raw ? Option.getOrNull(decode(JSON.parse(raw))) : null;
    } catch {
        return null;
    }
}
