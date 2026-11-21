import { describe, expect, it } from "vite-plus/test";

import { splitByFreeLimits } from "./onboarding-accounts";

const pick = (id: string, currency: string) => ({ currency, domain: null, id, label: id });

describe("splitByFreeLimits", () => {
    it("holds back picks past the free account and currency caps, keeping the order", () => {
        const picks = [pick("banesco", "VES"), pick("zelle", "USD"), pick("revolut", "EUR"), pick("cash", "VES")];
        const { now, waiting } = splitByFreeLimits(picks, [], true);
        expect(now.map((entry) => entry.id)).toStrictEqual(["banesco", "zelle", "cash"]);
        expect(waiting.map((entry) => entry.id)).toStrictEqual(["revolut"]);
    });

    it("counts accounts already on the ledger", () => {
        const held = [
            { currency: "USD", kind: "asset", name: "Wallet" },
            { currency: "USD", kind: "asset", name: "Chase" },
        ];
        const { now, waiting } = splitByFreeLimits([pick("venmo", "USD"), pick("cash-app", "USD")], held, true);
        expect(now.map((entry) => entry.id)).toStrictEqual(["venmo"]);
        expect(waiting.map((entry) => entry.id)).toStrictEqual(["cash-app"]);
    });

    it("leaves installment apps out of the account cap", () => {
        const held = [
            { currency: "USD", kind: "liability", name: "Klarna" },
            { currency: "USD", kind: "asset", name: "Chase" },
            { currency: "USD", kind: "asset", name: "Wallet" },
        ];
        expect(splitByFreeLimits([pick("venmo", "USD")], held, true).waiting).toStrictEqual([]);
    });
});
