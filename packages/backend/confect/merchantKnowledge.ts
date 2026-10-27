import * as Schema from "effect/Schema";

import type { MerchantKnowledgeDoc } from "./_generated/docs";
import { WEB_TTL_MS } from "./lib/merchantTrust";

export const MAX_KEYS = 5;

export const KnowledgeSource = Schema.Literals(["model", "web"]);

export function sourceOf(row: MerchantKnowledgeDoc): typeof KnowledgeSource.Type {
    return row.source ?? "web";
}

export function expiresAt(row: MerchantKnowledgeDoc): number {
    return row.expiresAt ?? row.resolvedAt + WEB_TTL_MS;
}
