import { describe, expect, it } from "@jest/globals";

import { applyNumpadKey, numberToNumpad, numpadMode, numpadToNumber } from "./numpad";
import type { NumpadKey, NumpadMode } from "./numpad";

function type(keys: string, minorUnits = 2, from = "", mode: NumpadMode = "explicitSeparator"): string {
    return [...keys].reduce((acc, key) => applyNumpadKey(acc, key as NumpadKey, minorUnits, mode), from);
}

function preDotted(keys: string, minorUnits = 2, from = ""): string {
    return type(keys, minorUnits, from, "preDotted");
}

describe("applyNumpadKey digits", () => {
    it("accumulates digits left to right", () => {
        expect(type("1234")).toBe("1234");
    });

    it("replaces a lone zero instead of prefixing it", () => {
        expect(type("05")).toBe("5");
    });

    it("keeps zeros that follow a real digit", () => {
        expect(type("100")).toBe("100");
    });

    it("caps the integer part at thirteen digits", () => {
        expect(type("12345678901234")).toBe("1234567890123");
    });

    it("keeps the largest entry exactly representable in cents", () => {
        const largest = numpadToNumber(type("1234567890123"));
        expect(Number.isSafeInteger(Math.round(largest * 100))).toBe(true);
    });
});

describe("applyNumpadKey separator", () => {
    it("admits one separator and refuses a second", () => {
        expect(type("1.5.5")).toBe("1.55");
    });

    it("seeds a leading zero when the separator opens the entry", () => {
        expect(type(".")).toBe("0.");
    });

    it("refuses the separator entirely on a zero-minor-unit currency", () => {
        expect(type("1.5", 0)).toBe("15");
    });

    it("caps the fraction at the currency's minor units", () => {
        expect(type("1.239", 2)).toBe("1.23");
    });
});

describe("applyNumpadKey backspace", () => {
    it("peels one character at a time", () => {
        expect(applyNumpadKey("1.23", "back", 2, "explicitSeparator")).toBe("1.2");
    });

    it("is a no-op on an empty entry rather than throwing", () => {
        expect(applyNumpadKey("", "back", 2, "explicitSeparator")).toBe("");
    });

    it("re-admits the separator once it has been peeled off", () => {
        const peeled = applyNumpadKey("0.", "back", 2, "explicitSeparator");
        expect(peeled).toBe("0");
        expect(applyNumpadKey(peeled, ".", 2, "explicitSeparator")).toBe("0.");
    });
});

describe("numpadMode", () => {
    it("maps the stored setting onto the keypad's behaviour", () => {
        expect(numpadMode(1)).toBe("preDotted");
        expect(numpadMode(2)).toBe("explicitSeparator");
    });

    it("reads an unrecognised stored value as the separator keypad", () => {
        expect(numpadMode(0)).toBe("explicitSeparator");
    });
});

describe("applyNumpadKey pre-dotted", () => {
    it("shifts each digit through the minor units", () => {
        expect(preDotted("1")).toBe("0.01");
        expect(preDotted("123")).toBe("1.23");
    });

    it("walks back down the same ladder on backspace", () => {
        const back = (from: string) => applyNumpadKey(from, "back", 2, "preDotted");
        const three = back("12.34");
        expect(three).toBe("1.23");
        const two = back(three);
        expect(two).toBe("0.12");
        const one = back(two);
        expect(one).toBe("0.01");
        expect(back(one)).toBe("");
        expect(back("")).toBe("");
    });

    it("ignores the separator key, which has nothing left to say", () => {
        expect(applyNumpadKey("1.23", ".", 2, "preDotted")).toBe("1.23");
    });

    it("shifts into three minor units just as readily as two", () => {
        expect(preDotted("1234", 3)).toBe("1.234");
        expect(applyNumpadKey("1.234", "back", 3, "preDotted")).toBe("0.123");
    });

    it("leaves a zero-minor-unit currency on whole numbers", () => {
        expect(preDotted("1234", 0)).toBe("1234");
        expect(applyNumpadKey("123", "back", 0, "preDotted")).toBe("12");
    });

    it("never lets a leading zero become part of the amount", () => {
        expect(preDotted("000")).toBe("");
        expect(preDotted("0005")).toBe("0.05");
    });

    it("shifts an entry seeded from an existing amount out of its cents", () => {
        expect(applyNumpadKey("12", "5", 2, "preDotted")).toBe("120.05");
    });

    it("caps the integer part at thirteen digits", () => {
        expect(preDotted("1234567890123456")).toBe("1234567890123.45");
    });

    it("reads back as the amount it displays", () => {
        expect(numpadToNumber(preDotted("1"))).toBe(0.01);
        expect(numpadToNumber(preDotted("1234", 0))).toBe(1234);
    });
});

describe("applyNumpadKey clear", () => {
    it("wipes the whole entry in either mode", () => {
        expect(applyNumpadKey("12.34", "clear", 2, "explicitSeparator")).toBe("");
    });
});

describe("numpadToNumber", () => {
    it("treats an unset or bare-separator entry as zero", () => {
        expect(numpadToNumber("")).toBe(0);
        expect(numpadToNumber(".")).toBe(0);
    });

    it("reads a trailing separator as the integer so far", () => {
        expect(numpadToNumber("12.")).toBe(12);
    });

    it("falls back to zero on anything unparseable", () => {
        expect(numpadToNumber("abc")).toBe(0);
    });
});

describe("numberToNumpad", () => {
    it("returns an unset entry for zero and negatives", () => {
        expect(numberToNumpad(0, 2)).toBe("");
        expect(numberToNumpad(-5, 2)).toBe("");
    });

    it("drops a pure zero fraction so the entry reads like an integer", () => {
        expect(numberToNumpad(12, 2)).toBe("12");
    });

    it("rounds to the currency's minor units", () => {
        expect(numberToNumpad(12.567, 2)).toBe("12.57");
        expect(numberToNumpad(12.5, 0)).toBe("13");
    });

    it("round-trips through numpadToNumber", () => {
        for (const [amount, minorUnits] of [
            [12.34, 2],
            [7, 2],
            [0.05, 2],
            [1234, 0],
            [9.999, 3],
        ] as const) {
            expect(numpadToNumber(numberToNumpad(amount, minorUnits))).toBe(Number(amount.toFixed(minorUnits)));
        }
    });
});
