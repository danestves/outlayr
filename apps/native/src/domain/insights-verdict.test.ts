import { describe, expect, it } from "vite-plus/test";

import { EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import { insightsVerdict } from "./insights-verdict";
import type { VerdictInput } from "./insights-verdict";

const t: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });

const base: VerdictInput = {
    code: "USD",
    current: 1200,
    measure: "spent",
    prior: 1000,
    priorLabel: "2025",
    showCents: false,
    t,
    topMover: null,
};

describe("insightsVerdict", () => {
    it("says nothing at all when there is no prior window", () => {
        const verdict = insightsVerdict({ ...base, prior: 0 });
        expect(verdict.badge).toBeNull();
        expect(verdict.sentence).toBeNull();
    });

    it("reports the change in currency, not only as a percentage", () => {
        const verdict = insightsVerdict(base);
        expect(verdict.sentence ?? "").toMatch(/200/);
        expect(verdict.sentence ?? "").toMatch(/more than 2025/);
    });

    it("signs the badge", () => {
        expect(insightsVerdict(base).badge).toBe("+20%");
        expect(insightsVerdict({ ...base, current: 800 }).badge).toBe("-20%");
    });

    it("drops the badge at a thousand percent and keeps the sentence", () => {
        const verdict = insightsVerdict({ ...base, current: 120, prior: 2 });
        expect(verdict.badge).toBeNull();
        expect(verdict.sentence ?? "").toMatch(/118 more than 2025/);
        expect(insightsVerdict({ ...base, current: 1100, prior: 100 }).badge).toBeNull();
    });

    it("still shows a badge just under a thousand percent", () => {
        expect(insightsVerdict({ ...base, current: 1099, prior: 100 }).badge).toBe("+999%");
    });

    it("treats spending more as unfavourable and spending less as favourable", () => {
        expect(insightsVerdict(base).favourable).toBe(false);
        expect(insightsVerdict({ ...base, current: 800 }).favourable).toBe(true);
    });

    it("treats a rising net as favourable and a falling one as not", () => {
        expect(insightsVerdict({ ...base, measure: "net" }).favourable).toBe(true);
        expect(insightsVerdict({ ...base, current: 800, measure: "net" }).favourable).toBe(false);
    });

    it("calls a window within two percent the same rather than manufacturing news", () => {
        const verdict = insightsVerdict({ ...base, current: 1010 });
        expect(verdict.sentence).toBe("In line with 2025.");
        expect(verdict.favourable).toBe(true);
    });

    it("names the loudest mover when there is one", () => {
        const verdict = insightsVerdict({
            ...base,
            topMover: { delta: 150, name: "Dinner" },
        });
        expect(verdict.sentence ?? "").toMatch(/Dinner alone added/);
    });

    it("says a falling mover gave money back rather than added it", () => {
        const verdict = insightsVerdict({
            ...base,
            current: 800,
            topMover: { delta: -220, name: "Transport" },
        });
        expect(verdict.sentence ?? "").toMatch(/Transport alone gave back/);
    });

    it("never emits a stray minus inside the amount", () => {
        const verdict = insightsVerdict({ ...base, current: 500 });
        expect(verdict.sentence ?? "").not.toMatch(/-/);
    });
});
