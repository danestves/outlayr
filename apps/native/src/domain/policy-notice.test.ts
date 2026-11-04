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
