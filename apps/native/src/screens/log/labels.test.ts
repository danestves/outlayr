import { describe, expect, it } from "@jest/globals";

import { EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import { scopeMeasureLabel } from "./labels";

const t: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });

describe("scopeMeasureLabel", () => {
    it("says only the measure when the figure is in the currency asked for", () => {
        expect(scopeMeasureLabel(t, "out", "USD", "USD")).toBe(t("log.measure.out"));
    });

    it("names the currency when the figure fell back to another bucket", () => {
        const label = scopeMeasureLabel(t, "out", "COP", "USD");

        expect(label).toBe(`${t("log.measure.out")} · COP`);
        expect(label).toMatch(/COP/);
    });
});
