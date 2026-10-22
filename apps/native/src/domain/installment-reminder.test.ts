import { describe, expect, it } from "@jest/globals";

import {
    cuotaNotice,
    cuotaReminders,
    DEBT_REMINDER_PREFIX,
    installmentReminderCap,
    installmentReminderId,
    orphanedInstallmentReminderIds,
} from "./installment-reminder";

const EIGHT_AM = { hour: 8, minute: 0 };

describe("cuotaReminders", () => {
    const cuota = (installmentId: string, dueDate: Date) => ({ dueDate, installmentId });

    it("fires the day before at the reminder time, soonest first, dropping what has already passed", () => {
        const now = new Date(2026, 9, 18, 9, 0);
        const armed = cuotaReminders(
            [
                cuota("nov-15", new Date(2026, 10, 15)),
                // Its 8:00 the day before is an hour gone.
                cuota("due-tomorrow", new Date(2026, 9, 19)),
                cuota("nov-1", new Date(2026, 10, 1)),
            ],
            now,
            EIGHT_AM,
            8
        );
        expect(armed.map((row) => [row.installmentId, row.fireAt])).toStrictEqual([
            ["nov-1", new Date(2026, 9, 31, 8, 0)],
            ["nov-15", new Date(2026, 10, 14, 8, 0)],
        ]);
    });

    it("keeps the soonest when the cap cuts", () => {
        const now = new Date(2026, 9, 18);
        const armed = cuotaReminders(
            [cuota("late", new Date(2026, 11, 1)), cuota("soon", new Date(2026, 10, 1))],
            now,
            EIGHT_AM,
            1
        );
        expect(armed.map((row) => row.installmentId)).toStrictEqual(["soon"]);
    });
});

describe("cuotaNotice", () => {
    const cuota = {
        account: "Cashea",
        amount: 13.33,
        currency: "USD",
        fireAt: new Date(2026, 9, 31, 8, 0),
        id: installmentReminderId("nov-1"),
        order: "Nike Air",
        planId: "plan",
    };

    it("says what is owed to whom, and only to whom when amounts are hidden", () => {
        expect(cuotaNotice(cuota, false, "en")).toStrictEqual({
            body: "$13.33 to Cashea. Tap when it's paid.",
            data: { open: "installment", plan: "plan" },
            fireAt: cuota.fireAt,
            id: cuota.id,
            title: "Nike Air is due tomorrow",
        });
        expect(cuotaNotice(cuota, true, "en").body).toBe("Cashea. Tap when it's paid.");
        expect(cuotaNotice(cuota, true, "es").body).toBe("Cashea. Toca cuando la pagues.");
    });
});

describe("installmentReminderCap", () => {
    it("takes what the other reminders leave of iOS's 64, never more than its own share", () => {
        const others = (count: number) => Array.from({ length: count }, (_, index) => `outlayr.sub-due.${index}`);
        expect(installmentReminderCap(others(7))).toBe(8);
        expect(installmentReminderCap(others(60))).toBe(4);
        expect(installmentReminderCap([...others(64), installmentReminderId("a")])).toBe(0);
    });
});

describe("orphanedInstallmentReminderIds", () => {
    it("cancels only cuota and debt notices the sweep dropped", () => {
        const kept = installmentReminderId("kept");
        const paid = installmentReminderId("paid");
        const paidBack = `${DEBT_REMINDER_PREFIX}goal-1`;
        expect(
            orphanedInstallmentReminderIds(
                [kept],
                [kept, paid, paidBack, "outlayr.daily-reminder.1", "outlayr.sub-due.x"]
            )
        ).toStrictEqual([paid, paidBack]);
    });
});
