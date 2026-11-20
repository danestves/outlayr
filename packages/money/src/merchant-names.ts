import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { knowledgeKeys, merchantKey } from "./merchant-key";

/** The synced `appMeta` key holding the merchants a person renamed, as `merchantKey(old)` to the new name. */
export const MERCHANT_NAMES_KEY = "merchantNames";

// One appMeta value syncs on every change, so the oldest renames fall off past this.
const MAX_RENAMES = 500;

const MerchantNames = Schema.Record(Schema.String, Schema.String);
export type MerchantNames = typeof MerchantNames.Type;

const decodeNames = Schema.decodeUnknownOption(Schema.fromJsonString(MerchantNames));

export const merchantNamesOf = (raw: string | null | undefined): MerchantNames =>
    raw ? Option.getOrElse(decodeNames(raw), () => ({})) : {};

/** Records `from` as `to`, folding earlier renames into `from` along with it and dropping one that pointed back. */
export function renamedMerchant(names: MerchantNames, from: string, to: string): MerchantNames {
    const fromKey = merchantKey(from);
    const toKey = merchantKey(to);
    const name = to.trim();
    if (fromKey === "" || toKey === "") {
        return names;
    }
    const kept = Object.entries(names)
        .filter(([key]) => key !== fromKey && key !== toKey)
        .map(([key, value]): [string, string] => [key, merchantKey(value) === fromKey ? name : value]);
    return Object.fromEntries([...kept, [fromKey, name]].slice(-MAX_RENAMES));
}

/** The name a person gave this merchant, matched on the raw name, its descriptor, then the model's brand. */
export function renameFor(names: MerchantNames, name: string, brand?: string | null): string | null {
    for (const key of new Set([merchantKey(name), ...knowledgeKeys(name, undefined, brand)])) {
        const renamed = names[key];
        if (renamed !== undefined && key !== "") {
            return renamed;
        }
    }
    return null;
}
