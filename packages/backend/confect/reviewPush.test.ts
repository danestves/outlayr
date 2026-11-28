import { exportPKCS8, generateKeyPair } from "jose";
import { describe, expect, it } from "vite-plus/test";

import {
    needsReview,
    needsReviewAlert,
    REVIEW_PUSH_INTERVAL_MS,
    REVIEW_WINDOW_MS,
    reviewAlertBody,
    reviewPushRequest,
} from "./lib/reviewPush";

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
    it("alerts again only once twenty hours have passed", () => {
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
