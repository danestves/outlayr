import * as Effect from "effect/Effect";
import { expect, test, vi } from "vite-plus/test";

import { setReviewAlerts, syncReviewPush } from "./review-push";

const storeData = vi.hoisted(() => new Map<string, string>());

const cloud = vi.hoisted(() => {
    const calls: Record<string, unknown>[] = [];
    const state: { release: (() => void) | null } = { release: null };
    return { calls, state };
});

vi.mock("./shared-store", () => ({
    sharedStore: {
        get: (key: string) => storeData.get(key) ?? null,
        remove: (key: string) => {
            storeData.delete(key);
        },
        set: (key: string, value: string) => {
            storeData.set(key, value);
        },
    },
}));

vi.mock("./capture-lookup", () => ({ captureDeviceLabel: () => "install-1" }));

vi.mock("./convex", () => ({
    cloudMutation: (_ref: unknown, args: Record<string, unknown>) => {
        cloud.calls.push(args);
        if (cloud.calls.length === 1) {
            return Effect.tryPromise(
                () =>
                    new Promise<boolean>((resolve) => {
                        cloud.state.release = () => resolve(true);
                    })
            );
        }
        return Effect.succeed(true);
    },
    cloudQuery: () => Effect.succeed({ accounts: [{}] }),
    isCloudAccount: () => true,
}));

vi.mock("expo-notifications", () => ({
    getDevicePushTokenAsync: async () => ({ data: "tok" }),
    getPermissionsAsync: async () => ({ granted: true }),
}));

vi.mock("expo-application", () => ({
    getIosPushNotificationServiceEnvironmentAsync: async () => "production",
}));

const settle = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

const sync = () => Effect.runPromise(syncReviewPush());

test("keeps the target set when a pass overlaps an alerts toggle and has to undo itself", async () => {
    const first = sync();
    await vi.waitFor(() => expect(cloud.calls).toHaveLength(1));

    setReviewAlerts(false);
    setReviewAlerts(true);

    const second = sync();
    await settle();
    cloud.state.release?.();

    await Promise.all([first, second]);

    expect(cloud.calls).toStrictEqual([
        { deviceId: "install-1", environment: "production", token: "tok" },
        { deviceId: "install-1" },
        { deviceId: "install-1", environment: "production", token: "tok" },
    ]);
    expect(storeData.get("reviewPush")).toBe("production:tok");
    expect(storeData.get("reviewPushDevice")).toBe("install-1");
});
