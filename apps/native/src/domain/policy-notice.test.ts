import type { PolicyNotice } from "@outlayr/backend/confect/legal";
import { expect, test } from "vite-plus/test";

import { pendingNotice } from "./policy-notice";

const notice = (effectiveAtMs: number, document: PolicyNotice["document"] = "privacy"): PolicyNotice => ({
    changes: { en: [], es: [], fr: [], pt: [] },
    document,
    effectiveAtMs,
});

test("shows each notice once, oldest first, and none that took effect before the install", () => {
    const november = notice(Date.UTC(2026, 10, 2));
    const december = notice(Date.UTC(2026, 11, 1));
    const notices = [december, november];
    const seen = (privacy: number) => ({ privacy, terms: 0 });

    expect(pendingNotice(notices, seen(0))).toBe(november);
    expect(pendingNotice(notices, seen(november.effectiveAtMs))).toBe(december);
    expect(pendingNotice(notices, seen(december.effectiveAtMs))).toBeNull();
    expect(pendingNotice(notices, seen(Date.UTC(2026, 10, 20)))).toBe(december);
});

test("a privacy and a terms notice on the same day each show", () => {
    const day = Date.UTC(2026, 10, 2);
    const privacy = notice(day);
    const terms = notice(day, "terms");

    expect(pendingNotice([privacy, terms], { privacy: day, terms: 0 })).toBe(terms);
});
