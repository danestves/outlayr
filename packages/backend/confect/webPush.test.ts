/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const reminder = {
    auth: "auth",
    dailyMinute: 480,
    endpoint: "https://push.example.test/browser",
    locale: "en",
    p256dh: "key",
    timeZone: "America/Caracas",
};

const stubKeys = () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");
    vi.stubEnv("VAPID_PUBLIC_KEY", "public");
    vi.stubEnv("VAPID_SUBJECT", "mailto:support@example.test");
};

afterEach(() => {
    vi.unstubAllEnvs();
});

test("another account can't take over a browser's reminder", async () => {
    stubKeys();
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const other = await seedAuthUser(t);
    await authenticatedAs(t, owner).mutation(api.webPush.save, reminder);

    await expect(
        authenticatedAs(t, other).mutation(api.webPush.save, { ...reminder, dailyMinute: 600 })
    ).rejects.toThrow();

    await expect(
        authenticatedAs(t, owner).query(api.webPush.mine, { endpoint: reminder.endpoint })
    ).resolves.toStrictEqual({ dailyMinute: 480 });
});

test("stores nothing while web push has no keys", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_SUBJECT", "");
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);

    await expect(authenticatedAs(t, owner).mutation(api.webPush.save, reminder)).rejects.toThrow();

    await expect(t.run((ctx) => ctx.db.query("webPushSubscriptions").collect())).resolves.toStrictEqual([]);
});
