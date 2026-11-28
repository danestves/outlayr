import type { ApnsEnvironment } from "../tables/captureKeys";
import { APNS_HOSTS, APNS_TOPIC, providerToken } from "./apns";
import type { ApnsCredentials } from "./apns";

export const REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const REVIEW_PUSH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PUSH_EXPIRY_SECONDS = 12 * 60 * 60;
const REVIEW_PUSH_THREAD = "review";

export interface ReviewPushTarget {
    readonly environment: typeof ApnsEnvironment.Type;
    readonly token: string;
}

interface Copy {
    readonly many: (count: number) => string;
    readonly one: string;
}

const COPY_EN: Copy = {
    many: (count) => `${count} new bank entries to review`,
    one: "1 new bank entry to review",
};

const COPY = new Map<string, Copy>([
    [
        "de",
        {
            many: (count) => `${count} neue Bankbuchungen zum Prüfen`,
            one: "1 neue Bankbuchung zum Prüfen",
        },
    ],
    [
        "es",
        {
            many: (count) => `${count} movimientos nuevos del banco por revisar`,
            one: "1 movimiento nuevo del banco por revisar",
        },
    ],
    [
        "fr",
        {
            many: (count) => `${count} nouvelles opérations bancaires à vérifier`,
            one: "1 nouvelle opération bancaire à vérifier",
        },
    ],
    [
        "pt",
        {
            many: (count) => `${count} lançamentos novos do banco para revisar`,
            one: "1 lançamento novo do banco para revisar",
        },
    ],
]);

// Inclusive at both edges: a row dated now and one exactly seven days old still reach the queue.
export const needsReview = (dateMs: number, nowMs: number) => dateMs <= nowMs && nowMs - dateMs <= REVIEW_WINDOW_MS;

export const needsReviewAlert = (alertedAt: number | null | undefined, nowMs: number) =>
    alertedAt == null || nowMs - alertedAt >= REVIEW_PUSH_INTERVAL_MS;

export function reviewAlertBody(count: number, language: string | undefined) {
    const copy = COPY.get(language?.slice(0, 2) ?? "") ?? COPY_EN;
    return count === 1 ? copy.one : copy.many(count);
}

export async function reviewPushRequest(
    credentials: ApnsCredentials,
    target: ReviewPushTarget,
    count: number,
    language: string | undefined,
    nowSeconds: number
) {
    const body = {
        aps: {
            alert: { body: reviewAlertBody(count, language), title: "Outlayr" },
            sound: "default",
            "thread-id": REVIEW_PUSH_THREAD,
        },
    };
    return {
        init: {
            body: JSON.stringify(body),
            headers: {
                authorization: `bearer ${await providerToken(credentials, nowSeconds)}`,
                "apns-collapse-id": REVIEW_PUSH_THREAD,
                "apns-expiration": String(nowSeconds + PUSH_EXPIRY_SECONDS),
                "apns-priority": "10",
                "apns-push-type": "alert",
                "apns-topic": APNS_TOPIC,
            },
            method: "POST",
        },
        url: `${APNS_HOSTS[target.environment]}/3/device/${target.token}`,
    };
}
