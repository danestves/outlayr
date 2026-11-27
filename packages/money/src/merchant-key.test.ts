import { describe, expect, it } from "vite-plus/test";

import { descriptorKey, isMatchableKey, knowledgeKeys, merchantKey } from "./merchant-key";

describe(merchantKey, () => {
    it("lowercases, trims, and collapses whitespace", () => {
        expect(merchantKey("  NETFLIX   Inc  ")).toBe("netflix inc");
    });

    it("strips diacritics", () => {
        expect(merchantKey("Café Amazon")).toBe("cafe amazon");
    });

    it("turns punctuation into word breaks", () => {
        expect(merchantKey("AT&T*BILL")).toBe("at t bill");
    });
});

describe("merchantKey across scripts", () => {
    it("keeps voiced marks and long vowels apart", () => {
        expect(merchantKey("ドトール")).not.toBe(merchantKey("トトール"));
        expect(merchantKey("ドトール")).not.toBe(merchantKey("トトル"));
    });

    it("folds halfwidth katakana to the fullwidth form", () => {
        expect(merchantKey("ﾄﾞﾄｰﾙ")).toBe(merchantKey("ドトール"));
    });

    it("recomposes decomposed Hangul into syllables", () => {
        expect(merchantKey("쿠팡".normalize("NFD"))).toBe("쿠팡");
    });

    it("keeps compatibility characters that are not fullwidth forms", () => {
        expect(merchantKey("Coffee²")).not.toBe(merchantKey("Coffee2"));
    });

    it("keeps a combining mark Unicode cannot compose", () => {
        expect(merchantKey("セ゚・マート")).not.toBe(merchantKey("セ・マート"));
    });
});

describe(isMatchableKey, () => {
    it("counts code points and lets two-character CJK keys through", () => {
        expect(isMatchableKey("쿠팡")).toBeTruthy();
        expect(isMatchableKey("ab")).toBeFalsy();
        expect(isMatchableKey("無印")).toBeTruthy();
    });
});

describe(descriptorKey, () => {
    it.each([
        ["AIRBNB * HMASFW2JP2", "airbnb"],
        ["NYX*VenetisABEET", "venetis"],
        ["CARE4BAG AE", "care4bag"],
        ["SQ *BLUE BOTTLE COFFEE", "blue bottle coffee"],
        ["BLUE BOTTLE COFFEE #08761", "blue bottle coffee"],
        ["FIUMICINO AEROPORTO SS", "fiumicino aeroporto ss"],
        ["UBER *EATS PENDING", "uber eats pending"],
        ["PayPal", "paypal"],
        ["Panadería San José", "panaderia san jose"],
    ])("%s decodes to %s", (raw, expected) => {
        expect(descriptorKey(raw)).toBe(expected);
    });
});

describe(knowledgeKeys, () => {
    it("files one answer under the raw name, the decoded descriptor and the merchant's own name", () => {
        expect(knowledgeKeys("NYX*VenetisABEET", "EUR", "Venetis Bakery")).toStrictEqual([
            "nyx venetisabeet|eur",
            "venetis|eur",
            "venetis bakery|eur",
        ]);
    });

    it("drops duplicates and keys too short to mean anything", () => {
        expect(knowledgeKeys("Airbnb", undefined, "Airbnb")).toStrictEqual(["airbnb"]);
        expect(knowledgeKeys("AB", undefined)).toStrictEqual([]);
    });

    it("keeps two-character CJK names but not two-letter Latin ones", () => {
        expect(knowledgeKeys("無印", "JPY")).toStrictEqual(["無印|jpy"]);
        expect(knowledgeKeys("ab", "USD")).toStrictEqual([]);
    });
});
