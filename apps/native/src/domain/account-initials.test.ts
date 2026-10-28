import { describe, expect, it } from "vite-plus/test";

import { accountInitials } from "./account-initials";

describe("accountInitials", () => {
    it("takes the first and last word of a name", () => {
        expect(accountInitials({ name: "Daniel Esteves" })).toBe("DE");
        expect(accountInitials({ name: "  ana maria   lopez " })).toBe("AL");
        expect(accountInitials({ name: "madonna" })).toBe("M");
    });

    it("falls back to the email, then to nothing", () => {
        expect(accountInitials({ email: "dan@example.com", name: " " })).toBe("D");
        expect(accountInitials({ email: null, name: null })).toBe("");
        expect(accountInitials(undefined)).toBe("");
    });
});
