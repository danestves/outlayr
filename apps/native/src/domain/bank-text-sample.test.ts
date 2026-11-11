import { expect, test } from "vite-plus/test";

import { bankTextSample } from "./bank-text-sample";
import { parseNotification } from "./parse-notification";

test("shows a Log row the parser reads out of the sample text", () => {
    const sample = bankTextSample(new Date(2026, 10, 11));
    const text = sample.pieces.map((piece) => piece.text).join("");

    expect(parseNotification(text)).toStrictEqual({
        amount: sample.amount,
        amountText: sample.amountText,
        income: sample.income,
        merchant: sample.name,
    });
    expect(sample.pieces.filter((piece) => piece.read).map((piece) => piece.text)).toStrictEqual([
        sample.name,
        sample.amountText,
    ]);
});
