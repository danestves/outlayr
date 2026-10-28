import { describe, expect, it } from "vite-plus/test";

import { comesFromPerson, debtChoices, debtStanding } from "./debt-choices";

describe("debt choices", () => {
    it("leads with the movement that brings the balance back to zero", () => {
        // You owe: paying back sends money to the person, raising a negative balance.
        expect(comesFromPerson(debtChoices("youOwe")[0].verb)).toBe(false);
        // They owe you: being paid back takes money from them, lowering a positive one.
        expect(comesFromPerson(debtChoices("owesYou")[0].verb)).toBe(true);
    });

    it("reads a float residue as settled", () => {
        expect(debtStanding(0.1 + 0.2 - 0.3, "USD")).toBe("settled");
        expect(debtStanding(-0.004, "USD")).toBe("settled");
        expect(debtStanding(-0.01, "USD")).toBe("youOwe");
        expect(debtStanding(1, "USD")).toBe("owesYou");
    });
});
