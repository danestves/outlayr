import { describe, expect, it } from "vite-plus/test";

import { sentenceSlotNames } from "@/domain/sentence-template";
import { CATALOGS } from "@/i18n/catalog";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";

import {
    continueSentence,
    TRANSACTION_RATE_SENTENCE_KEYS,
    TRANSACTION_RATE_SLOTS,
    TRANSACTION_SENTENCE_KEYS,
    TRANSACTION_SENTENCE_SLOTS,
} from "./slots";

const expected = [...TRANSACTION_SENTENCE_SLOTS].sort();

const languageKeys = <Key extends string>(keys: readonly Key[]) =>
    SUPPORTED_LANGUAGES.flatMap((language) => keys.map((key) => [language, key] as const));

describe("transaction sentence templates", () => {
    // `catalog.test.ts` cannot catch a slot dropped from both languages at once, which agrees with itself.
    it.each(languageKeys(TRANSACTION_SENTENCE_KEYS))("states every fact once in %s %s", (language, key) => {
        const template = CATALOGS[language][key];
        expect(template).toBeDefined();
        expect([...sentenceSlotNames(template ?? "")].sort()).toStrictEqual(expected);
    });

    it.each(languageKeys(TRANSACTION_RATE_SENTENCE_KEYS))(
        "continues the sentence with the dollars and the source in %s %s",
        (language, key) => {
            const clause = CATALOGS[language][key] ?? "";
            expect([...sentenceSlotNames(clause)].sort()).toStrictEqual([...TRANSACTION_RATE_SLOTS]);
            expect(continueSentence("Spent {amount} {when}.", clause)).toBe(`Spent {amount} {when}${clause}`);
            expect(clause.startsWith(",") && clause.endsWith(".")).toBe(true);
        }
    );

    it.each(SUPPORTED_LANGUAGES)("asks for the rate alone in %s transaction.sentence.rate.missing", (language) => {
        expect([...sentenceSlotNames(CATALOGS[language]["transaction.sentence.rate.missing"] ?? "")]).toStrictEqual([
            "rate",
        ]);
    });
});
