import type { PolicyNotice } from "@outlayr/backend/confect/legal";
import { expect, test } from "vite-plus/test";

import { pendingNotices } from "./policy-notice";

const notice = (effectiveAtMs: number, document: PolicyNotice["document"] = "privacy"): PolicyNotice => ({
    changes: { en: [], es: [], fr: [], pt: [] },
    document,
    effectiveAtMs,
});

test("shows one day at a time, oldest first, with every document changing that day", () => {
    const november = notice(Date.UTC(2026, 10, 2));
    const decemberPrivacy = notice(Date.UTC(2026, 11, 1));
    const decemberTerms = notice(Date.UTC(2026, 11, 1), "terms");
    const notices = [decemberTerms, decemberPrivacy, november];

    expect(pendingNotices(notices, { privacy: 0, terms: 0 })).toStrictEqual([november]);
    expect(pendingNotices(notices, { privacy: november.effectiveAtMs, terms: 0 })).toStrictEqual([
        decemberPrivacy,
        decemberTerms,
    ]);
    expect(pendingNotices(notices, { privacy: decemberPrivacy.effectiveAtMs, terms: 0 })).toStrictEqual([
        decemberTerms,
    ]);
    expect(
        pendingNotices(notices, { privacy: decemberPrivacy.effectiveAtMs, terms: decemberTerms.effectiveAtMs })
    ).toStrictEqual([]);
});

test("still shows notices dated after Nov 2 to someone who acknowledged the retired Nov 16 notice", () => {
    const moved = notice(Date.UTC(2026, 10, 3));
    const latest = notice(Date.UTC(2026, 10, 8));
    const notices = [notice(Date.UTC(2026, 10, 2)), moved, latest];
    const retiredMs = Date.UTC(2026, 10, 16);

    expect(pendingNotices(notices, { privacy: retiredMs, terms: retiredMs })).toStrictEqual([moved]);
    expect(pendingNotices(notices, { privacy: moved.effectiveAtMs, terms: retiredMs })).toStrictEqual([latest]);
});

test("a real notice dated Nov 16 stays acknowledged", () => {
    const november16 = notice(Date.UTC(2026, 10, 16));
    const notices = [notice(Date.UTC(2026, 10, 3)), november16];

    expect(pendingNotices(notices, { privacy: november16.effectiveAtMs, terms: 0 })).toStrictEqual([]);
});
