import { expect, it } from "vite-plus/test";

import { acceptsTypedAmountCharacter, amountSeparators } from "./typed-amount";

const typed = (characters: string, locale = "en-US") => {
    const separators = amountSeparators(locale);
    let text = "";
    for (const character of characters) {
        if (acceptsTypedAmountCharacter(character, text, separators)) {
            text += character;
        }
    }
    return text;
};

it("drops a currency prefix typed before the figure", () => {
    expect(typed("Cg. 500.00")).toBe("500.00");
});

it("keeps the separators the figure is written in", () => {
    expect(typed("1,234.50")).toBe("1,234.50");
    expect(typed("1.234,50", "es-VE")).toBe("1.234,50");
});

it("refuses a decimal mark or space before the first digit", () => {
    expect(typed(".5")).toBe("5");
    expect(typed(" 500")).toBe("500");
});

it("still takes a negative sign", () => {
    expect(typed("-500")).toBe("-500");
});
