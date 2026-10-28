import { describe, expect, it } from "vite-plus/test";

import { matchCardAccount } from "./match-card-account";

const ACCOUNTS = [
    { id: "chase", name: "Chase Sapphire" },
    { id: "amex", name: "American Express" },
    { id: "cash", name: "Cash" },
] as const;

describe("matchCardAccount", () => {
    it("matches the same name regardless of case and accents", () => {
        expect(matchCardAccount("CHASE SAPPHIRE", ACCOUNTS)).toBe("chase");
    });

    it("matches a card whose name contains the account's, and the reverse", () => {
        expect(matchCardAccount("Chase Sapphire Reserve ···· 4421", ACCOUNTS)).toBe("chase");
        expect(matchCardAccount("Chase", ACCOUNTS)).toBe("chase");
    });

    it("matches through the institution when the names share none", () => {
        expect(matchCardAccount("Amex Platinum", ACCOUNTS)).toBe("amex");
    });

    it("stays unattached when more than one account could claim the card", () => {
        const twoChase = [...ACCOUNTS, { id: "chase-2", name: "Chase Checking" }];
        expect(matchCardAccount("Chase", twoChase)).toBeNull();
        expect(matchCardAccount("Chase Freedom", twoChase)).toBeNull();
    });

    it("lets the issuer win over a network word that is also an account", () => {
        const withVisa = [...ACCOUNTS, { id: "visa", name: "Visa" }, { id: "zinli", name: "Zinli" }];
        expect(matchCardAccount("Zinli Visa ···· 4421", withVisa)).toBe("zinli");
        expect(matchCardAccount("Visa ···· 4421", withVisa)).toBe("visa");
    });

    it("prefers an account named exactly like the card over its issuer", () => {
        const both = [
            { id: "chase", name: "Chase" },
            { id: "chase-visa", name: "Chase Visa" },
        ];
        expect(matchCardAccount("Chase Visa", both)).toBe("chase-visa");
        expect(matchCardAccount("Chase Sapphire Visa", both)).toBe("chase");
    });

    it("stays unattached when the issuer is ambiguous, even if a network word matches", () => {
        const twoChase = [
            { id: "chase-1", name: "Chase One" },
            { id: "chase-2", name: "Chase Two" },
            { id: "visa", name: "Visa" },
        ];
        expect(matchCardAccount("Chase Visa", twoChase)).toBeNull();
    });

    it("stays unattached when nothing matches", () => {
        expect(matchCardAccount("Apple Card", ACCOUNTS)).toBeNull();
        expect(matchCardAccount("", ACCOUNTS)).toBeNull();
    });
});
