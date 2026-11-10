import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { expect, test } from "vite-plus/test";

import type { ResolvedVoiceEntry } from "@/domain/voice-entry";

import { voiceEntryDraft } from "./entry-drafts";

const spoken: ResolvedVoiceEntry = {
    accountId: "bank",
    accountUnresolved: false,
    amount: 9.99,
    categoryId: null,
    categoryUnresolved: true,
    currency: "USD",
    date: new Date("2026-03-10T15:00:00.000Z"),
    details: null,
    domain: null,
    income: false,
    kind: "entry",
    merchant: "Netflix",
    recurrence: null,
};

test("schedules a spoken subscription with no end date under the category it was resolved to, and nothing for a one-off", () => {
    const monthly = voiceEntryDraft({ ...spoken, recurrence: { coefficient: 1, type: RECURRING_TYPE.monthly } }, "tv");
    expect([monthly.categoryId, monthly.schedule]).toStrictEqual([
        "tv",
        { coefficient: 1, endDate: null, leadDays: null, type: RECURRING_TYPE.monthly },
    ]);
    expect(voiceEntryDraft(spoken, "tv").schedule).toBeNull();
});
