import { parseAmount } from "panelui-web/currency-input";
import { expect, it } from "vite-plus/test";

import { typedFigure } from "./typed-figure";

const held = (figure: string) => figure.trim() === "" || figure.trim() === "." || parseAmount(figure) !== null;

const typeInto = (keys: string, start = "") => {
    let shown = start;
    let labelled = false;
    for (const key of keys) {
        const typed = typedFigure(shown + key, labelled);
        ({ labelled } = typed);
        if (held(typed.figure)) {
            shown = typed.figure;
        }
    }
    return parseAmount(shown);
};

it("keeps the figure when a currency label is typed before it", () => {
    expect(typeInto("Cg. 500.00")).toBe(500);
    expect(typeInto("Bs. 1250,5")).toBe(1250.5);
    expect(typeInto("$ 25")).toBe(25);
});

it("keeps the figure when a currency label is typed after it", () => {
    expect(typeInto("500 Bs.")).toBe(500);
});

it("leaves ordinary typing alone", () => {
    expect(typeInto(".5")).toBe(0.5);
    expect(typeInto("12.50")).toBe(12.5);
    expect(typedFigure("1,5", false)).toStrictEqual({ figure: "1,5", labelled: false });
});

it("reads a pasted amount that carries its currency label", () => {
    expect(parseAmount(typedFigure("Cg. 500.00", false).figure)).toBe(500);
    expect(parseAmount(typedFigure("500,00 Cg.", false).figure)).toBe(500);
    expect(parseAmount(typedFigure("$25,993.52", false).figure)).toBe(25_993.52);
});

it("holds back a paste with more than one number", () => {
    expect(held(typedFigure("Invoice 42: Cg. 500.00", false).figure)).toBe(false);
    expect(held(typedFigure("Cg. 500.00\n600.00", false).figure)).toBe(false);
});
