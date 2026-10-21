import { describe, expect, it } from "@jest/globals";

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

describe("transaction sentence templates", () => {
    // `catalog.test.ts` cannot catch a slot dropped from both languages at once, which agrees with itself.
    for (const language of SUPPORTED_LANGUAGES) {
        for (const key of TRANSACTION_SENTENCE_KEYS) {
            it(`states every fact once in ${language} ${key}`, () => {
                const template = CATALOGS[language][key];
                expect(template).toBeDefined();
                expect([...sentenceSlotNames(template ?? "")].sort()).toStrictEqual(expected);
            });
        }
    }

    for (const language of SUPPORTED_LANGUAGES) {
        for (const key of TRANSACTION_RATE_SENTENCE_KEYS) {
            it(`continues the sentence with the dollars and the source in ${language} ${key}`, () => {
                const clause = CATALOGS[language][key] ?? "";
                expect([...sentenceSlotNames(clause)].sort()).toStrictEqual([...TRANSACTION_RATE_SLOTS]);
                expect(continueSentence("Spent {amount} {when}.", clause)).toBe(`Spent {amount} {when}${clause}`);
                expect(clause.startsWith(",") && clause.endsWith(".")).toBe(true);
            });
        }
        it(`asks for the rate alone in ${language} transaction.sentence.rate.missing`, () => {
            expect([...sentenceSlotNames(CATALOGS[language]["transaction.sentence.rate.missing"] ?? "")]).toStrictEqual(
                ["rate"]
            );
        });
    }
});
