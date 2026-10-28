import { describe, expect, it } from "vite-plus/test";

import {
    clampTimeOfDay,
    dailyReminderNotices,
    enableReminderStep,
    formatTimeOfDay,
    REMINDER_CUSTOM,
    REMINDER_EVENING,
    REMINDER_MORNING,
    reminderReconcile,
    reminderTime,
} from "./reminder";

describe("reminder time", () => {
    it("pins the two fixed options to the hours Swift offered", () => {
        const custom = { hour: 13, minute: 45 };
        expect(reminderTime(REMINDER_MORNING, custom)).toStrictEqual({
            hour: 8,
            minute: 0,
        });
        expect(reminderTime(REMINDER_EVENING, custom)).toStrictEqual({
            hour: 20,
            minute: 0,
        });
    });

    it("uses the stored time only on the custom option", () => {
        expect(reminderTime(REMINDER_CUSTOM, { hour: 13, minute: 45 })).toStrictEqual({
            hour: 13,
            minute: 45,
        });
    });

    it("clamps a stored time that could never fire", () => {
        expect(clampTimeOfDay(25, 70)).toStrictEqual({ hour: 23, minute: 59 });
        expect(clampTimeOfDay(-3, -1)).toStrictEqual({ hour: 0, minute: 0 });
        expect(clampTimeOfDay(9.7, 30.2)).toStrictEqual({ hour: 9, minute: 30 });
        expect(clampTimeOfDay(Number.NaN, Number.NaN)).toStrictEqual({
            hour: 8,
            minute: 0,
        });
    });
});

describe("time of day label", () => {
    it("reads back in the 12-hour form the option rows use", () => {
        expect(formatTimeOfDay({ hour: 8, minute: 0 })).toBe("8:00 AM");
        expect(formatTimeOfDay({ hour: 20, minute: 0 })).toBe("8:00 PM");
    });

    it("writes the meridiem in the reader's language", () => {
        expect(formatTimeOfDay({ hour: 20, minute: 0 }, false, "es")).toBe("8:00 p. m.");
        expect(formatTimeOfDay({ hour: 8, minute: 0 }, false, "es")).toBe("8:00 a. m.");
    });

    it("honours the 24-hour clock the rest of the app already honours", () => {
        expect(formatTimeOfDay({ hour: 20, minute: 0 }, true)).toBe("20:00");
        expect(formatTimeOfDay({ hour: 8, minute: 5 }, true)).toBe("08:05");
    });
});

describe("turning reminders on", () => {
    it("asks iOS the first time", () => {
        expect(enableReminderStep("undetermined")).toBe("request");
    });

    it("schedules straight away once granted", () => {
        expect(enableReminderStep("granted")).toBe("schedule");
    });

    it("sends a denied user to iOS Settings, the only place that can undo it", () => {
        expect(enableReminderStep("denied")).toBe("open-settings");
    });

    it("sends a user whose permission could not be read to iOS Settings rather than silently doing nothing", () => {
        expect(enableReminderStep("unknown")).toBe("open-settings");
    });
});

describe("reconciling a stored setting against iOS", () => {
    it("re-arms the schedule when the permission still holds", () => {
        expect(reminderReconcile(true, "granted")).toBe("schedule");
    });

    it("turns the setting off when the permission was revoked outside the app", () => {
        expect(reminderReconcile(true, "denied")).toBe("disable");
        expect(reminderReconcile(true, "undetermined")).toBe("disable");
    });

    it("does nothing when the permission could not be read at all", () => {
        expect(reminderReconcile(true, "unknown")).toBe("none");
    });

    it("leaves an already-off setting alone whatever iOS says", () => {
        expect(reminderReconcile(false, "granted")).toBe("none");
        expect(reminderReconcile(false, "denied")).toBe("none");
        expect(reminderReconcile(false, "undetermined")).toBe("none");
        expect(reminderReconcile(false, "unknown")).toBe("none");
    });
});

describe("daily reminder", () => {
    const tuesdayNight = new Date(2026, 9, 13, 21, 0);
    const mercadona = {
        amount: 12.4,
        category: "Groceries",
        currency: "EUR",
        date: new Date(2026, 9, 13, 13, 5),
        income: false,
        note: "Mercadona",
    };
    const plan = (overrides: Partial<Parameters<typeof dailyReminderNotices>[0]>) =>
        dailyReminderNotices({
            hideAmounts: false,
            language: "en",
            last: mercadona,
            now: tuesdayNight,
            time: { hour: 20, minute: 0 },
            ...overrides,
        });

    it("stays quiet on the day something was logged, then names the gap", () => {
        const notices = plan({});

        expect(notices.map((notice) => notice.fireAt)).toStrictEqual(
            [14, 15, 16, 17, 18, 19].map((day) => new Date(2026, 9, day, 20, 0))
        );
        expect(notices.slice(0, 2).map(({ title, body }) => [title, body])).toStrictEqual([
            ["Nothing logged today", "Last: Mercadona €12.40, yesterday."],
            ["Nothing logged since Tuesday", "Last: Mercadona €12.40. Tap to catch up."],
        ]);
        expect(notices[0]?.data).toStrictEqual({ open: "create" });
    });

    it("asks a morning reminder about the day before and dates the tap to it", () => {
        const [first] = plan({ time: { hour: 8, minute: 0 } });

        expect(first).toStrictEqual({
            body: "Last: Mercadona €12.40, Tuesday.",
            data: { date: String(new Date(2026, 9, 14, 8, 0).getTime()), open: "create" },
            fireAt: new Date(2026, 9, 15, 8, 0),
            id: `outlayr.daily-reminder.${new Date(2026, 9, 15).getTime()}`,
            title: "Nothing logged yesterday",
        });
    });

    it("goes quiet once a weekday name would point back at the same weekday", () => {
        expect(plan({ last: { ...mercadona, date: new Date(2026, 9, 7, 9, 0) } })).toStrictEqual([]);
    });

    it("drops the amount while amounts are hidden", () => {
        expect(plan({ hideAmounts: true })[0]?.body).toBe("Last: Mercadona, yesterday.");
    });

    it("asks for a first entry on an empty ledger", () => {
        const notices = plan({ last: null });

        expect(notices).toHaveLength(6);
        expect(notices[0]).toMatchObject({ body: "Tap to add your first expense.", title: "Nothing logged yet" });
    });
});
