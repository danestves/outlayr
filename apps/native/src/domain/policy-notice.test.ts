import { expect, test } from "vite-plus/test";

import { pendingNotice } from "./policy-notice";
import type { PolicyNotice } from "./policy-notice";

const notice = (effectiveAtMs: number): PolicyNotice => ({
    changes: { en: [], es: [], fr: [], pt: [] },
    document: "privacy",
    effectiveAtMs,
});

test("shows each notice once, oldest first, and none that took effect before the install", () => {
    const november = notice(Date.UTC(2026, 10, 2));
    const december = notice(Date.UTC(2026, 11, 1));
    const notices = [december, november];

    expect(pendingNotice(notices, 0)).toBe(november);
    expect(pendingNotice(notices, november.effectiveAtMs)).toBe(december);
    expect(pendingNotice(notices, december.effectiveAtMs)).toBeNull();
    expect(pendingNotice(notices, Date.UTC(2026, 10, 20))).toBe(december);
});
