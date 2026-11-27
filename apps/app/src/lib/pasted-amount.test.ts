import { expect, it } from "vite-plus/test";

import { pastedAmount } from "./pasted-amount";

it("reads a pasted amount that carries its currency symbol", () => {
    expect(pastedAmount("Cg. 500.00", 2)).toBe(500);
    expect(pastedAmount("$25,993.52", 2)).toBe(25_993.52);
    expect(pastedAmount("500,00 Cg.", 2)).toBe(500);
});

it("ignores a paste with no figure", () => {
    expect(pastedAmount("Cg.", 2)).toBeNull();
});

it("leaves a plain number to the field so it can insert at the caret", () => {
    expect(pastedAmount("9", 2)).toBeNull();
    expect(pastedAmount("1,234.50", 2)).toBeNull();
});
