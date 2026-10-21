import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import {
    isSubscriptionReminderId,
    leadLabelKey,
    MAX_PENDING_SUBSCRIPTION_REMINDERS,
    normalizeLead,
    orphanedReminderIds,
    reminderFireAt,
    reminderPlan,
    subscriptionReminderId,
} from "./subscription-reminder";

const NINE_AM = { hour: 9, minute: 0 };

const wallClock = (d: Date): [number, number, number, number, number, number] => [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
];

describe("subscription reminder identity", () => {
    it("claims its own requests and nothing else", () => {
        expect(isSubscriptionReminderId(subscriptionReminderId("abc"))).toBe(true);
        expect(isSubscriptionReminderId("outlayr.daily-reminder")).toBe(false);
        expect(isSubscriptionReminderId("outlayr.sub-due")).toBe(false);
        expect(isSubscriptionReminderId("")).toBe(false);
    });
});

describe("normalizing a stored lead", () => {
    it("refuses a lead that is not a real number", () => {
        expect(normalizeLead(Number.NaN)).toBeNull();
        expect(normalizeLead(Number.POSITIVE_INFINITY)).toBeNull();
        expect(normalizeLead(Number.NEGATIVE_INFINITY)).toBeNull();
    });

    it("clamps both ends instead of turning the reminder off", () => {
        expect(normalizeLead(-3)).toBe(0);
        expect(normalizeLead(99)).toBe(30);
        expect(normalizeLead(30)).toBe(30);
    });
});

describe("when a reminder fires", () => {
    it("lands on the due day at the configured hour with no lead", () => {
        const fire = reminderFireAt(new Date(2026, 4, 14, 23, 12), 0, NINE_AM);
        expect(wallClock(fire)).toStrictEqual([2026, 5, 14, 9, 0, 0]);
    });

    it("carries the chosen minute through", () => {
        const fire = reminderFireAt(new Date(2026, 4, 14), 1, {
            hour: 20,
            minute: 45,
        });
        expect(wallClock(fire)).toStrictEqual([2026, 5, 13, 20, 45, 0]);
    });

    it("crosses a month boundary onto the right day", () => {
        const fire = reminderFireAt(new Date(2026, 2, 3), 7, NINE_AM);
        expect(wallClock(fire)).toStrictEqual([2026, 2, 24, 9, 0, 0]);
    });

    // A subprocess with `TZ` set: the host zone may have no DST, and Jest caches the zone on first `Date` use, so
    // mutating `process.env.TZ` here would be ignored.
    it("keeps the chosen hour across a DST change", () => {
        const probe = join(import.meta.dirname, "dst-probe.ts");
        const out = execFileSync(
            process.execPath,
            [
                "--import",
                "tsx",
                probe,
                "reminder",
                JSON.stringify([
                    [2026, 2, 15],
                    [2026, 2, 1],
                ]),
            ],
            { encoding: "utf-8", env: { ...process.env, TZ: "America/New_York" } }
        );
        const { landingOffset, earlierOffset, fire } = JSON.parse(out) as {
            landingOffset: number;
            earlierOffset: number;
            fire: [number, number, number, number, number, number];
        };

        expect(landingOffset).not.toBe(earlierOffset);
        expect(fire).toStrictEqual([2026, 3, 8, 9, 0, 0]);
    });
});

describe("planning what to arm", () => {
    const now = new Date(2026, 2, 10, 12, 0);

    it("drops a charge whose reminder hour has already gone by", () => {
        const plan = reminderPlan({
            candidates: [
                { landing: new Date(2026, 2, 10), leadDays: 0, localId: "past" },
                { landing: new Date(2026, 2, 12), leadDays: 0, localId: "ahead" },
            ],
            now,
            time: NINE_AM,
        });
        expect(plan.arm.map((armed) => armed.localId)).toStrictEqual(["ahead"]);
    });

    it("arms nothing for a candidate whose lead is off", () => {
        const plan = reminderPlan({
            candidates: [{ landing: new Date(2026, 2, 12), leadDays: null, localId: "off" }],
            now,
            time: NINE_AM,
        });
        expect(plan.arm).toStrictEqual([]);
    });

    it("clamps a negative lead instead of firing after the charge", () => {
        const landing = new Date(2026, 2, 12);
        const plan = reminderPlan({
            candidates: [{ landing, leadDays: -3, localId: "backwards" }],
            now,
            time: NINE_AM,
        });
        expect(plan.arm).toHaveLength(1);
        expect(plan.arm[0].fireAt).toStrictEqual(new Date(2026, 2, 12, 9, 0));
    });

    it("keeps the soonest charges when it has to truncate", () => {
        const plan = reminderPlan({
            candidates: [
                { landing: new Date(2026, 2, 20), leadDays: 0, localId: "third" },
                { landing: new Date(2026, 2, 11), leadDays: 0, localId: "first" },
                { landing: new Date(2026, 2, 15), leadDays: 0, localId: "second" },
            ],
            cap: 2,
            now,
            time: NINE_AM,
        });
        expect(plan.arm.map((armed) => armed.localId)).toStrictEqual(["first", "second"]);
    });

    it("arms nothing at all rather than one request at a cap of zero", () => {
        const plan = reminderPlan({
            candidates: [{ landing: new Date(2026, 2, 12), leadDays: 0, localId: "ahead" }],
            cap: 0,
            now,
            time: NINE_AM,
        });
        expect(plan.arm).toStrictEqual([]);
    });

    it("caps at the iOS budget when no cap is given", () => {
        const candidates = Array.from({ length: 80 }, (_, index) => ({
            landing: new Date(2026, 2, 11 + index),
            leadDays: 0,
            localId: `sub-${index}`,
        }));
        const plan = reminderPlan({ candidates, now, time: NINE_AM });
        expect(plan.arm).toHaveLength(MAX_PENDING_SUBSCRIPTION_REMINDERS);
        expect(plan.arm[0].localId).toBe("sub-0");
    });
});

describe("reconciling what iOS still holds", () => {
    it("returns a subscription request the plan no longer covers", () => {
        const armed = [subscriptionReminderId("keep")];
        const pending = [subscriptionReminderId("keep"), subscriptionReminderId("stale")];
        expect(orphanedReminderIds(armed, pending)).toStrictEqual([subscriptionReminderId("stale")]);
    });

    it("never touches the daily reminder", () => {
        const pending = ["outlayr.daily-reminder", subscriptionReminderId("stale"), "some.other.app.request"];
        expect(orphanedReminderIds([], pending)).toStrictEqual([subscriptionReminderId("stale")]);
        expect(orphanedReminderIds([subscriptionReminderId("stale")], pending)).toStrictEqual([]);
    });
});

describe("labelling a lead", () => {
    it("falls back to the counted form for a lead nothing offers", () => {
        expect(leadLabelKey(5)).toBe("settings.notifications.leadDaysBefore");
        expect(leadLabelKey(30)).toBe("settings.notifications.leadDaysBefore");
    });

    it("reads a nonsense lead as off, matching what is stored back", () => {
        expect(leadLabelKey(Number.NaN)).toBe("settings.notifications.leadOff");
    });

    it("labels a clamped lead by the value that will actually be used", () => {
        expect(leadLabelKey(-3)).toBe("settings.notifications.leadSameDay");
        expect(leadLabelKey(1.5)).toBe("settings.notifications.leadOneDay");
    });
});
