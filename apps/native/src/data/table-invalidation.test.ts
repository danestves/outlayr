import { describe, expect, it } from "vite-plus/test";

import { invalidate, invalidateAll, subscribeToTable } from "./table-invalidation";

describe("table invalidation", () => {
    it("notifies every subscriber of the named table", () => {
        const seen: string[] = [];
        const off1 = subscribeToTable("transactions", () => seen.push("a"));
        const off2 = subscribeToTable("transactions", () => seen.push("b"));

        invalidate("transactions");

        expect(seen).toStrictEqual(["a", "b"]);
        off1();
        off2();
    });

    it("leaves other tables alone", () => {
        let hits = 0;
        const off = subscribeToTable("budgets", () => {
            hits += 1;
        });

        invalidate("transactions");

        expect(hits).toBe(0);
        off();
    });

    it("stops notifying after unsubscribe", () => {
        let hits = 0;
        const off = subscribeToTable("categories", () => {
            hits += 1;
        });

        invalidate("categories");
        off();
        invalidate("categories");

        expect(hits).toBe(1);
    });

    it("still reaches the later subscriber when an earlier one unsubscribes itself", () => {
        let reached = false;
        let off1 = () => {};
        off1 = subscribeToTable("mainBudget", () => {
            off1();
        });
        const off2 = subscribeToTable("mainBudget", () => {
            reached = true;
        });

        invalidate("mainBudget");

        expect(reached).toBe(true);
        off2();
    });

    it("fires once per distinct table in a batch", () => {
        let hits = 0;
        const off = subscribeToTable("transactions", () => {
            hits += 1;
        });

        invalidateAll(["transactions", "transactions", "appMeta"]);

        expect(hits).toBe(1);
        off();
    });
});
