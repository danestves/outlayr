import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { exportPKCS8, generateKeyPair } from "jose";
import { describe, expect, it } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
    needsReview,
    needsReviewAlert,
    REVIEW_PUSH_INTERVAL_MS,
    REVIEW_WINDOW_MS,
    reviewAlertBody,
    reviewPushRequest,
} from "./lib/reviewPush";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const NOW = Date.parse("2027-01-05T15:00:00Z");
const TOKEN = "a".repeat(64);

const credentials = async () => {
    const { privateKey } = await generateKeyPair("ES256", { extractable: true });
    return { keyId: "KEY1234567", privateKey: await exportPKCS8(privateKey), teamId: "8ZB3YXDU7V" };
};

describe("review window", () => {
    it("keeps a row exactly seven days old and drops the next millisecond", () => {
        expect(needsReview(NOW, NOW)).toBeTruthy();
        expect(needsReview(NOW - REVIEW_WINDOW_MS, NOW)).toBeTruthy();
        expect(needsReview(NOW - REVIEW_WINDOW_MS - 1, NOW)).toBeFalsy();
        expect(needsReview(NOW + 1, NOW)).toBeFalsy();
    });
});

describe("review throttle", () => {
    it("alerts again only once a full day has passed", () => {
        expect(needsReviewAlert(undefined, NOW)).toBeTruthy();
        expect(needsReviewAlert(null, NOW)).toBeTruthy();
        expect(needsReviewAlert(NOW - REVIEW_PUSH_INTERVAL_MS, NOW)).toBeTruthy();
        expect(needsReviewAlert(NOW - REVIEW_PUSH_INTERVAL_MS + 1, NOW)).toBeFalsy();
        expect(needsReviewAlert(NOW, NOW)).toBeFalsy();
    });
});

describe("review push request", () => {
    it("builds the alert for the target environment and language", async () => {
        const apns = await credentials();
        const nowSeconds = Math.floor(NOW / 1000);
        const development = await reviewPushRequest(
            apns,
            { environment: "development", token: TOKEN },
            3,
            "de",
            nowSeconds
        );
        const production = await reviewPushRequest(
            apns,
            { environment: "production", token: TOKEN },
            1,
            "en",
            nowSeconds
        );

        expect(development.url).toBe(`https://api.sandbox.push.apple.com/3/device/${TOKEN}`);
        expect(production.url).toBe(`https://api.push.apple.com/3/device/${TOKEN}`);
        expect(development.init.headers).toMatchObject({
            "apns-collapse-id": "review",
            "apns-expiration": String(nowSeconds + 12 * 60 * 60),
            "apns-priority": "10",
            "apns-push-type": "alert",
            "apns-topic": "com.tryoutlayr.app",
        });
        expect(JSON.parse(String(development.init.body))).toStrictEqual({
            aps: {
                alert: { body: "3 neue Bankbuchungen zum Prüfen", title: "Outlayr" },
                sound: "default",
                "thread-id": "review",
            },
        });
        expect(JSON.parse(String(production.init.body))).toMatchObject({
            aps: { alert: { body: "1 new bank entry to review" } },
        });
    });

    it("pluralizes by count and falls back to English for an unknown language", () => {
        expect(reviewAlertBody(1, "de")).toBe("1 neue Bankbuchung zum Prüfen");
        expect(reviewAlertBody(4, "it")).toBe("4 new bank entries to review");
    });
});

describe("review push target", () => {
    it("is refused while the account is being deleted, so nothing outlives the purge", async () => {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        const user = await seedAuthUser(t);
        await t.run((ctx) =>
            ctx.db.insert("accountDeletionJobs", {
                errorCode: null,
                expiresAt: Date.now() + 60_000,
                googleReceiptChallengeHash: null,
                googleReceiptDigest: null,
                phase: "providersRevoked",
                provider: "credentialOnly",
                secretHash: "hash",
                userId: user.userId,
            })
        );

        await expect(
            authenticatedAs(t, user).mutation(api.reviewPush.setTarget, {
                deviceId: "phone",
                environment: "development",
                token: TOKEN,
            })
        ).resolves.toBeFalsy();
        await expect(t.run((ctx) => ctx.db.query("reviewPushTargets").collect())).resolves.toHaveLength(0);
    });

    it("keeps today's alert stamp across turning alerts off and on, so the daily limit holds", async () => {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        const user = await seedAuthUser(t);
        const phone = authenticatedAs(t, user);
        const target = { deviceId: "phone", environment: "development", token: TOKEN } as const;
        await phone.mutation(api.reviewPush.setTarget, target);
        const alertedAt = Date.now();
        await t.run(async (ctx) => {
            for (const row of await ctx.db.query("reviewPushTargets").collect()) {
                await ctx.db.patch(row._id, { alertedAt });
            }
        });

        await phone.mutation(api.reviewPush.clearTarget, { deviceId: "phone" });
        const [off] = await t.run((ctx) => ctx.db.query("reviewPushTargets").collect());
        expect(off).toMatchObject({ alertedAt });
        expect(off?.token).toBeUndefined();

        await phone.mutation(api.reviewPush.setTarget, target);
        const rows = await t.run((ctx) => ctx.db.query("reviewPushTargets").collect());
        expect(rows).toMatchObject([{ alertedAt, token: TOKEN }]);
    });
});
