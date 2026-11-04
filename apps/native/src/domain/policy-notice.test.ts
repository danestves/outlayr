import type { PolicyNotice } from "@outlayr/backend/confect/legal";
import { expect, test } from "vite-plus/test";

import { pendingDocuments } from "./policy-notice";

const notice = (effectiveAtMs: number, document: PolicyNotice["document"] = "privacy"): PolicyNotice => ({
    changes: { en: [], es: [], fr: [], pt: [] },
    document,
    effectiveAtMs,
});

test("groups every unseen notice by document, oldest first, and skips ones already seen", () => {
    const november = notice(Date.UTC(2026, 10, 2));
    const december = notice(Date.UTC(2026, 11, 1));
    const terms = notice(Date.UTC(2026, 11, 1), "terms");
    const notices = [december, terms, november];

    expect(pendingDocuments(notices, { privacy: 0, terms: 0 })).toStrictEqual([
        { document: "privacy", effectiveAtMs: december.effectiveAtMs, notices: [november, december] },
        { document: "terms", effectiveAtMs: terms.effectiveAtMs, notices: [terms] },
    ]);
    expect(pendingDocuments(notices, { privacy: Date.UTC(2026, 10, 20), terms: terms.effectiveAtMs })).toStrictEqual([
        { document: "privacy", effectiveAtMs: december.effectiveAtMs, notices: [december] },
    ]);
    expect(pendingDocuments(notices, { privacy: december.effectiveAtMs, terms: terms.effectiveAtMs })).toStrictEqual(
        []
    );
});
