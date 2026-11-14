import type { PolicyNotice } from "@outlayr/backend/confect/legal";
import { expect, test } from "vite-plus/test";

import { pendingNotices } from "./policy-notice";

const notice = (
    effectiveAtMs: number,
    document: PolicyNotice["document"] = "privacy",
    postedAtMs = effectiveAtMs
): PolicyNotice => ({
    changes: { en: [], es: [], fr: [], pt: [] },
    document,
    effectiveAtMs,
    postedAtMs,
});

const change = (label: string) => ({ changes: { en: [{ label }], es: [{ label }], fr: [{ label }], pt: [{ label }] } });

test("merges every unseen day into one notice per document, dated by its newest change", () => {
    const november = { ...notice(Date.UTC(2026, 10, 2)), ...change("Notion") };
    const december = { ...notice(Date.UTC(2026, 11, 1)), ...change("Invites") };
    const terms = { ...notice(Date.UTC(2026, 10, 3), "terms"), ...change("Plans") };

    const pending = pendingNotices([november, terms, december], { privacy: 0, terms: 0 });

    expect(pending.map(({ document, effectiveAtMs }) => [document, effectiveAtMs])).toStrictEqual([
        ["privacy", december.effectiveAtMs],
        ["terms", terms.effectiveAtMs],
    ]);
    expect(pending[0]?.changes.en.map(({ label }) => label)).toStrictEqual(["Invites", "Notion"]);
    expect(
        pendingNotices([november, terms, december], { privacy: november.effectiveAtMs, terms: terms.effectiveAtMs })
    ).toStrictEqual([december]);
    expect(
        pendingNotices([november, terms, december], { privacy: december.effectiveAtMs, terms: terms.effectiveAtMs })
    ).toStrictEqual([]);
});

test("a change repeated on a later day shows once, in its newest wording", () => {
    const older = {
        ...notice(Date.UTC(2026, 10, 2)),
        changes: { en: [{ detail: "old", label: "Invites" }], es: [], fr: [], pt: [] },
    };
    const newer = {
        ...notice(Date.UTC(2026, 10, 4)),
        changes: { en: [{ detail: "new", label: "Invites" }], es: [], fr: [], pt: [] },
    };

    expect(pendingNotices([older, newer], { privacy: 0, terms: 0 })[0]?.changes.en).toStrictEqual([
        { detail: "new", label: "Invites" },
    ]);
});

test("still shows notices dated after Nov 2 to someone who acknowledged the retired Nov 16 notice", () => {
    const moved = notice(Date.UTC(2026, 10, 3));
    const latest = notice(Date.UTC(2026, 10, 8));
    const notices = [notice(Date.UTC(2026, 10, 2)), moved, latest];
    const retiredMs = Date.UTC(2026, 10, 16);

    expect(pendingNotices(notices, { privacy: retiredMs, terms: retiredMs })).toStrictEqual([latest]);
});

test("a real notice dated Nov 16 stays acknowledged", () => {
    const november16 = notice(Date.UTC(2026, 10, 16));
    const notices = [notice(Date.UTC(2026, 10, 3)), november16];

    expect(pendingNotices(notices, { privacy: november16.effectiveAtMs, terms: 0 })).toStrictEqual([]);
});

test("a new install skips notices posted before it, even ones that take effect later", () => {
    const installedAtMs = Date.UTC(2026, 10, 13, 15);
    const postedBefore = notice(Date.UTC(2027, 0, 1), "privacy", Date.UTC(2026, 10, 9));
    const postedAfter = notice(Date.UTC(2027, 0, 1), "terms", Date.UTC(2026, 10, 20));

    expect(pendingNotices([postedBefore, postedAfter], { privacy: installedAtMs, terms: installedAtMs })).toStrictEqual(
        [postedAfter]
    );
});

test("someone who tapped Got it on a future notice still sees one posted before that date", () => {
    const january = notice(Date.UTC(2027, 0, 1), "privacy", Date.UTC(2026, 10, 9));
    const february = notice(Date.UTC(2027, 1, 1), "privacy", Date.UTC(2026, 11, 1));

    expect(pendingNotices([january, february], { privacy: january.effectiveAtMs, terms: 0 })).toStrictEqual([february]);
});
