import { addDays, startOfDay } from "@outlayr/money/calendar";
import { merchantKey } from "@outlayr/money/merchant-key";
import { assert, date, integer, pre, property, string } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { dedupFingerprint } from "./import-dedup";

const cents = integer({ max: 10_000_000, min: 0 });
const note = string({ maxLength: 24 });
const instant = date({
    max: new Date(Date.UTC(2031, 0, 1)),
    min: new Date(Date.UTC(2020, 0, 1)),
    noInvalidDate: true,
});
const hours = integer({ max: 23, min: 0 });
const minutes = integer({ max: 59, min: 0 });

const entry = (amount: number, at: Date, text: string) => ({
    amount,
    date: at,
    income: false,
    note: text,
});

describe("dedupFingerprint", () => {
    it("gives a note the same fingerprint after it was normalised once", () => {
        assert(
            property(cents, note, (value, text) => {
                const at = new Date(2026, 7, 1, 9);

                expect(dedupFingerprint(entry(value / 100, at, merchantKey(text)))).toBe(
                    dedupFingerprint(entry(value / 100, at, text))
                );
            })
        );
    });

    it("tells two different cent amounts apart", () => {
        assert(
            property(cents, cents, (lhs, rhs) => {
                pre(lhs !== rhs);
                const at = new Date(2026, 7, 1);

                expect(dedupFingerprint(entry(rhs / 100, at, "shop"))).not.toBe(
                    dedupFingerprint(entry(lhs / 100, at, "shop"))
                );
            })
        );
    });

    it("folds any time of day but keeps neighbouring days apart", () => {
        assert(
            property(instant, hours, minutes, (value, hour, minute) => {
                const day = startOfDay(value);
                const later = new Date(day);
                later.setHours(hour, minute);

                expect(dedupFingerprint(entry(12.5, later, "shop"))).toBe(dedupFingerprint(entry(12.5, day, "shop")));
                expect(dedupFingerprint(entry(12.5, addDays(day, 1), "shop"))).not.toBe(
                    dedupFingerprint(entry(12.5, day, "shop"))
                );
            })
        );
    });
});
