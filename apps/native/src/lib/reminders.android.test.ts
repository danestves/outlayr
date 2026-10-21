import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NotificationRequestInput } from "expo-notifications";

import { requestReminderPermission, scheduleDatedReminder } from "./reminders";

const mockCalls: string[] = [];
const mockSchedule = jest.fn<(request: NotificationRequestInput) => Promise<string>>(async () => "id");
const mockChannel = jest.fn<(id: string, channel: { name: string | null }) => Promise<null>>(async () => {
    mockCalls.push("channel");
    return null;
});
jest.mock("expo-notifications", () => ({
    AndroidImportance: { DEFAULT: 4 },
    requestPermissionsAsync: async () => {
        mockCalls.push("request");
        return { canAskAgain: true, granted: true };
    },
    SchedulableTriggerInputTypes: { DATE: "date" },
    scheduleNotificationAsync: (request: NotificationRequestInput) => mockSchedule(request),
    setNotificationChannelAsync: (id: string, channel: { name: string | null }) => mockChannel(id, channel),
}));

beforeEach(() => {
    mockCalls.length = 0;
    mockSchedule.mockClear();
    mockChannel.mockClear();
});

describe("reminders on Android", () => {
    it("creates the Reminders channel before asking, so Android 13 shows the prompt", async () => {
        await expect(requestReminderPermission()).resolves.toBe("granted");

        expect(mockCalls).toStrictEqual(["channel", "request"]);
        expect(mockChannel).toHaveBeenCalledWith("reminders", expect.objectContaining({ name: "Reminders" }));
    });

    it("schedules on that channel rather than Miscellaneous", async () => {
        const fireAt = new Date(2026, 9, 14, 20);

        await scheduleDatedReminder({ body: "b", data: {}, fireAt, id: "daily-1", title: "t" });

        expect(mockSchedule.mock.calls[0]?.[0].trigger).toStrictEqual({
            channelId: "reminders",
            date: fireAt,
            type: "date",
        });
    });
});
