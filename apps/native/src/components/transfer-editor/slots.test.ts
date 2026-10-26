import { describe, expect, it } from "@jest/globals";

import { sentenceSlotNames } from "@/domain/sentence-template";
import { CATALOGS } from "@/i18n/catalog";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";

import {
    TRANSFER_CUSTOM_RATE_KEY,
    TRANSFER_FEE_ARRIVAL_KEY,
    TRANSFER_FEES_ARRIVAL_KEY,
    TRANSFER_FEE_ON_TOP_KEY,
    TRANSFER_SENTENCE_KEYS,
    TRANSFER_SENTENCE_SLOTS,
} from "./transfer-sentence";

describe("transfer sentence templates", () => {
    for (const language of SUPPORTED_LANGUAGES) {
        it(`states every fact exactly once across the ${language} clauses`, () => {
            const stated = TRANSFER_SENTENCE_KEYS.filter((key) => key !== "transfers.sentence.noFee").flatMap((key) =>
                sentenceSlotNames(CATALOGS[language][key] ?? "")
            );
            expect(stated.sort()).toStrictEqual([...TRANSFER_SENTENCE_SLOTS].sort());
        });

        it(`states the same facts for a custom rate as for a quoted one in ${language}`, () => {
            expect(sentenceSlotNames(CATALOGS[language][TRANSFER_CUSTOM_RATE_KEY] ?? "")).toStrictEqual(
                sentenceSlotNames(CATALOGS[language]["transfers.sentence.rate"] ?? "")
            );
        });

        it(`adds the arrival to the fee's facts when no rate clause states it in ${language}`, () => {
            expect([...sentenceSlotNames(CATALOGS[language][TRANSFER_FEE_ARRIVAL_KEY] ?? "")].sort()).toStrictEqual(
                [...sentenceSlotNames(CATALOGS[language]["transfers.sentence.fee"] ?? ""), "arrives"].sort()
            );
        });

        it(`states the receiver's fee on top of the sender's when both charge in ${language}`, () => {
            const single = sentenceSlotNames(CATALOGS[language]["transfers.sentence.fee"] ?? "");
            expect([...sentenceSlotNames(CATALOGS[language]["transfers.sentence.fees"] ?? "")].sort()).toStrictEqual(
                [...single, "arrivalFee", "arrivalFeeSide"].sort()
            );
            expect([...sentenceSlotNames(CATALOGS[language][TRANSFER_FEES_ARRIVAL_KEY] ?? "")].sort()).toStrictEqual(
                [...single, "arrivalFee", "arrivalFeeSide", "arrives"].sort()
            );
        });

        it(`states the same facts for a fee on top as for an included one in ${language}`, () => {
            expect(sentenceSlotNames(CATALOGS[language][TRANSFER_FEE_ON_TOP_KEY] ?? "")).toStrictEqual(
                sentenceSlotNames(CATALOGS[language]["transfers.sentence.fee"] ?? "")
            );
        });

        it(`keeps the fee slot in the ${language} feeless clause`, () => {
            expect(sentenceSlotNames(CATALOGS[language]["transfers.sentence.noFee"] ?? "")).toStrictEqual(["fee"]);
        });
    }
});
