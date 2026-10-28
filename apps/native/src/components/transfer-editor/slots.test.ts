import { describe, expect, it } from "vite-plus/test";

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
    it.each(SUPPORTED_LANGUAGES)("states every fact exactly once across the %s clauses", (language) => {
        const stated = TRANSFER_SENTENCE_KEYS.filter((key) => key !== "transfers.sentence.noFee").flatMap((key) =>
            sentenceSlotNames(CATALOGS[language][key] ?? "")
        );
        expect(stated.sort()).toStrictEqual([...TRANSFER_SENTENCE_SLOTS].sort());
    });

    it.each(SUPPORTED_LANGUAGES)("states the same facts for a custom rate as for a quoted one in %s", (language) => {
        expect(sentenceSlotNames(CATALOGS[language][TRANSFER_CUSTOM_RATE_KEY] ?? "")).toStrictEqual(
            sentenceSlotNames(CATALOGS[language]["transfers.sentence.rate"] ?? "")
        );
    });

    it.each(SUPPORTED_LANGUAGES)(
        "adds the arrival to the fee's facts when no rate clause states it in %s",
        (language) => {
            expect([...sentenceSlotNames(CATALOGS[language][TRANSFER_FEE_ARRIVAL_KEY] ?? "")].sort()).toStrictEqual(
                [...sentenceSlotNames(CATALOGS[language]["transfers.sentence.fee"] ?? ""), "arrives"].sort()
            );
        }
    );

    it.each(SUPPORTED_LANGUAGES)(
        "states the receiver's fee on top of the sender's when both charge in %s",
        (language) => {
            const single = sentenceSlotNames(CATALOGS[language]["transfers.sentence.fee"] ?? "");
            expect([...sentenceSlotNames(CATALOGS[language]["transfers.sentence.fees"] ?? "")].sort()).toStrictEqual(
                [...single, "arrivalFee", "arrivalFeeSide"].sort()
            );
            expect([...sentenceSlotNames(CATALOGS[language][TRANSFER_FEES_ARRIVAL_KEY] ?? "")].sort()).toStrictEqual(
                [...single, "arrivalFee", "arrivalFeeSide", "arrives"].sort()
            );
        }
    );

    it.each(SUPPORTED_LANGUAGES)("states the same facts for a fee on top as for an included one in %s", (language) => {
        expect(sentenceSlotNames(CATALOGS[language][TRANSFER_FEE_ON_TOP_KEY] ?? "")).toStrictEqual(
            sentenceSlotNames(CATALOGS[language]["transfers.sentence.fee"] ?? "")
        );
    });

    it.each(SUPPORTED_LANGUAGES)("keeps the fee slot in the %s feeless clause", (language) => {
        expect(sentenceSlotNames(CATALOGS[language]["transfers.sentence.noFee"] ?? "")).toStrictEqual(["fee"]);
    });
});
