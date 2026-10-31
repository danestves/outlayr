import * as Schema from "effect/Schema";
import type { UpdateInfo } from "expo-updates";

import type { Language } from "@/i18n/languages";

const isWhatsNew = Schema.is(Schema.String);
const isWhatsNewByLanguage = Schema.is(Schema.Record(Schema.String, Schema.String));

/** Null for a rollback or a missing update: neither has anything to announce. */
export function describeUpdate(
    update: UpdateInfo | undefined,
    language: Language
): { at: Date; id: string; notes: string[] } | null {
    if (!update?.updateId || !update.manifest) {
        return null;
    }
    const extra = "extra" in update.manifest ? update.manifest.extra?.expoClient?.extra : undefined;
    const byLanguage: unknown = extra?.whatsNewByLanguage;
    const whatsNew: unknown = (isWhatsNewByLanguage(byLanguage) ? byLanguage[language] : undefined) ?? extra?.whatsNew;
    const lines = isWhatsNew(whatsNew) ? whatsNew.split("\n").map((line) => line.trim()) : [];
    const notes = [...new Set(lines.filter(Boolean))];
    return { at: update.createdAt, id: update.updateId, notes };
}
