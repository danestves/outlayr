import { describe, expect, it } from "vite-plus/test";

import { autologAccessOf, holdsAutolog, withAutologEntry } from "./autolog-cap";
import type { AutologUsage } from "./autolog-cap";
import { FREE_AUTOLOG_PER_MONTH } from "./pro-limits";

const OCT_31_LATE = new Date("2026-10-31T23:30:00-04:00").getTime();
const NOV_1_EARLY = new Date("2026-11-01T00:30:00-04:00").getTime();

function usedIn(at: number, used: number): AutologUsage {
    let usage: AutologUsage = {};
    for (let entry = 0; entry < used; entry += 1) {
        usage = withAutologEntry(usage, at, "applied");
    }
    return usage;
}

describe("holdsAutolog", () => {
    it("lets the entry that fills the month through and holds the next", () => {
        const underCap = usedIn(OCT_31_LATE, FREE_AUTOLOG_PER_MONTH - 1);
        const atCap = usedIn(OCT_31_LATE, FREE_AUTOLOG_PER_MONTH);

        expect(holdsAutolog(underCap, "free", "wallet", OCT_31_LATE)).toBe(false);
        expect(holdsAutolog(atCap, "free", "wallet", OCT_31_LATE)).toBe(true);
        expect(holdsAutolog(atCap, "free", "notification", OCT_31_LATE)).toBe(true);
    });

    it("never holds a Pro customer, or one whose entitlement has not resolved", () => {
        const full = usedIn(OCT_31_LATE, 99);

        expect(holdsAutolog(full, "open", "wallet", OCT_31_LATE)).toBe(false);
        expect(holdsAutolog(full, "pending", "wallet", OCT_31_LATE)).toBe(false);
    });

    it("never holds an entry the user made on purpose", () => {
        const full = usedIn(OCT_31_LATE, 99);

        expect(holdsAutolog(full, "free", "shortcut", OCT_31_LATE)).toBe(false);
        expect(holdsAutolog(full, "free", "watch", OCT_31_LATE)).toBe(false);
    });

    it("starts a new quota at local midnight, not at UTC midnight", () => {
        const full = usedIn(OCT_31_LATE, FREE_AUTOLOG_PER_MONTH);

        expect(holdsAutolog(full, "free", "wallet", OCT_31_LATE)).toBe(true);
        expect(holdsAutolog(full, "free", "wallet", NOV_1_EARLY)).toBe(false);
    });
});

describe("autologAccessOf", () => {
    it("caps only a customer the store has confirmed is free", () => {
        expect(autologAccessOf({ kind: "free", pending: false }, true)).toBe("free");
        expect(autologAccessOf({ kind: "unresolved", pending: true }, true)).toBe("pending");
        expect(autologAccessOf({ kind: "unresolved", pending: false }, true)).toBe("pending");
        expect(autologAccessOf({ kind: "pro", mirrored: false, pending: true }, true)).toBe("open");
        expect(autologAccessOf({ kind: "free", pending: false }, false)).toBe("open");
        expect(autologAccessOf({ kind: "unconfigured" }, true)).toBe("open");
    });
});
