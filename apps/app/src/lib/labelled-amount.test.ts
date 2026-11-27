import { expect, it } from "vite-plus/test";

import { labelledAmount } from "./labelled-amount";

it("reads a pasted amount that carries its currency symbol", () => {
    expect(labelledAmount("Cg. 500.00", 2)).toBe(500);
    expect(labelledAmount("$25,993.52", 2)).toBe(25_993.52);
    expect(labelledAmount("500,00 Cg.", 2)).toBe(500);
});

it("ignores a paste with no figure", () => {
    expect(labelledAmount("Cg.", 2)).toBeNull();
});

it("leaves a plain number to the field so it can insert at the caret", () => {
    expect(labelledAmount("9", 2)).toBeNull();
    expect(labelledAmount("1,234.50", 2)).toBeNull();
});

it("refuses text holding more than one number", () => {
    expect(labelledAmount("Invoice 42: Cg. 500.00", 2)).toBeNull();
});

it("refuses two amounts on separate lines", () => {
    expect(labelledAmount("Cg. 500.00\n600.00", 2)).toBeNull();
});
