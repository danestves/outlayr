import { describe, expect, it } from "vite-plus/test";

import { resolveTransactionIdentity } from "./transaction-identity";
import type { TransactionIdentitySource } from "./transaction-identity";

const NONE: TransactionIdentitySource = {
    categoryColor: null,
    categoryEmoji: null,
    categoryIcon: null,
    customColor: null,
    emoji: null,
    icon: null,
    imageColor: null,
};

const source = (overrides: Partial<TransactionIdentitySource>): TransactionIdentitySource => ({
    ...NONE,
    ...overrides,
});

describe("resolveTransactionIdentity symbol", () => {
    it("prefers the transaction's own icon", () => {
        const identity = resolveTransactionIdentity(
            source({
                categoryEmoji: "🍕",
                categoryIcon: "Restaurant01",
                icon: "Coffee02",
            })
        );
        expect(identity.icon).toBe("Coffee02");
        expect(identity.emoji).toBeNull();
    });

    it("lets a legacy row carrying both fall to its icon", () => {
        const identity = resolveTransactionIdentity(source({ emoji: "🍕", icon: "Coffee02" }));
        expect(identity.icon).toBe("Coffee02");
        expect(identity.emoji).toBeNull();
    });

    it("suppresses the category symbol whenever the transaction names one", () => {
        const identity = resolveTransactionIdentity(source({ categoryIcon: "Restaurant01", emoji: "🍕" }));
        expect(identity.icon).toBeNull();
        expect(identity.emoji).toBe("🍕");
    });

    it("falls through to the category icon", () => {
        const identity = resolveTransactionIdentity(source({ categoryIcon: "Restaurant01" }));
        expect(identity.icon).toBe("Restaurant01");
        expect(identity.emoji).toBeNull();
    });

    it("falls through to the category emoji", () => {
        const identity = resolveTransactionIdentity(source({ categoryEmoji: "🍕" }));
        expect(identity.icon).toBeNull();
        expect(identity.emoji).toBe("🍕");
    });

    it("treats an empty stored symbol as absent", () => {
        const identity = resolveTransactionIdentity(source({ categoryIcon: "Restaurant01", emoji: "", icon: "" }));
        expect(identity.icon).toBe("Restaurant01");
        expect(identity.emoji).toBeNull();
    });
});

describe("resolveTransactionIdentity colour", () => {
    it("prefers the user's override", () => {
        const identity = resolveTransactionIdentity(
            source({
                categoryColor: "#0000FF",
                customColor: "#FF0000",
                imageColor: "#00FF00",
            })
        );
        expect(identity.color).toBe("#FF0000");
    });

    it("uses the photo colour next", () => {
        const identity = resolveTransactionIdentity(source({ categoryColor: "#0000FF", imageColor: "#00FF00" }));
        expect(identity.color).toBe("#00FF00");
    });

    it("treats an empty stored colour as absent", () => {
        const identity = resolveTransactionIdentity(
            source({ categoryColor: "#0000FF", customColor: "", imageColor: "" })
        );
        expect(identity.color).toBe("#0000FF");
    });
});
