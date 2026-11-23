import { describe, expect, it } from "vite-plus/test";

import { alsoRowsFor, meterSegments, topBlockOf } from "./top-block";

describe("topBlockOf", () => {
    it("opens with the limit the person hit", () => {
        expect(topBlockOf("currencies", 0)).toBe("currencies");
        expect(topBlockOf("installment_apps", 0)).toBe("installment_apps");
        expect(topBlockOf("autolog", 30)).toBe("autolog");
    });

    it("does not claim auto-logged purchases when none were logged this month", () => {
        expect(topBlockOf("autolog", 0)).toBe("generic");
    });

    it("leads with sync where no feature opened the paywall", () => {
        expect(topBlockOf("settings", 12)).toBe("sync");
        expect(topBlockOf("unknown", 12)).toBe("sync");
    });

    it("keeps a gated feature off the sync lead", () => {
        expect(topBlockOf("webhooks", 0)).toBe("generic");
        expect(topBlockOf("people", 0)).toBe("generic");
    });
});

describe("alsoRowsFor", () => {
    it("skips the row the top block already covers and keeps three", () => {
        expect(alsoRowsFor("currencies")).toStrictEqual(["autolog", "installments", "sync"]);
        expect(alsoRowsFor("autolog")).toStrictEqual(["currencies", "installments", "sync"]);
        expect(alsoRowsFor("installment_apps")).toStrictEqual(["autolog", "currencies", "sync"]);
        expect(alsoRowsFor("accounts")).toHaveLength(3);
    });
});

describe("meterSegments", () => {
    it("splits segments by share and always shows a waiting entry", () => {
        expect(meterSegments(30, 9)).toStrictEqual({ filled: 9, waiting: 3 });
        expect(meterSegments(300, 1)).toStrictEqual({ filled: 11, waiting: 1 });
    });

    it("fills the meter when nothing waits", () => {
        expect(meterSegments(30, 0)).toStrictEqual({ filled: 12, waiting: 0 });
    });
});
