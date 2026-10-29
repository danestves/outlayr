import { describe, expect, it } from "vite-plus/test";

import { parseReceipt, serializeReceipt } from "./receipt-items";

const SCANNED = {
    items: [
        { name: "Leche entera 1L", price: 1.9, quantity: 2 },
        { name: "Pan chapata", price: 1.25, quantity: 1 },
    ],
    subtotal: 3.15,
    tax: null,
    tip: null,
};

describe("receipt items", () => {
    it("round-trips what a scan saved", () => {
        expect(parseReceipt(serializeReceipt(SCANNED))).toStrictEqual({
            items: SCANNED.items,
            subtotal: 3.15,
            tax: null,
            tip: null,
        });
    });

    it("saves nothing for a receipt with no lines", () => {
        expect(serializeReceipt({ ...SCANNED, items: [] })).toBeNull();
    });

    it("reads nothing from data another device could have mangled", () => {
        const malformed = [
            null,
            "",
            "not json",
            "[]",
            '{"items":[],"subtotal":null,"tax":null,"tip":null}',
            '{"items":[{"name":"Pan","price":"1.25","quantity":1}],"subtotal":null,"tax":null,"tip":null}',
            '{"items":[{"name":"Pan","price":1.25,"quantity":1}],"subtotal":null,"tax":null}',
        ];

        expect(malformed.map(parseReceipt)).toStrictEqual(malformed.map(() => null));
    });
});
