import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { PushTarget } from "../tables/captureKeys";
import { APNS_HOSTS, APNS_TOPIC, providerToken, sealFor } from "./apns";
import type { ApnsCredentials } from "./apns";
import type { EnrichmentResult } from "./enrichmentResult";

const EXPIRY_SECONDS = 60 * 60;

export const PUSH_SECRET = /^[0-9a-f]{64}$/u;
export const DEVICE_TOKEN = /^[0-9a-f]{64,200}$/u;

const FALLBACK_EN = "Your purchase details are ready";
const FALLBACK = new Map([
    ["de", "Details zu deinem Kauf sind da"],
    ["es", "Los detalles de tu compra están listos"],
    ["fr", "Les détails de votre achat sont prêts"],
    ["pt", "Os detalhes da sua compra estão prontos"],
]);

export type { ApnsCredentials } from "./apns";

export interface CaptureAnswer {
    readonly captureId: string;
    readonly locale?: string | undefined;
    readonly name: string;
    readonly result: typeof EnrichmentResult.Type;
}

export async function capturePushRequest(
    credentials: ApnsCredentials,
    target: typeof PushTarget.Type,
    answer: CaptureAnswer,
    nowSeconds: number
) {
    const sealed = await sealFor(
        target.secret,
        JSON.stringify({ answer: answer.result, id: answer.captureId, name: answer.name })
    );
    const body = {
        aps: {
            alert: { body: FALLBACK.get(answer.locale?.slice(0, 2) ?? "en") ?? FALLBACK_EN, title: "Outlayr" },
            "mutable-content": 1,
            "thread-id": "automation",
        },
        capture: sealed,
    };
    return {
        init: {
            body: JSON.stringify(body),
            headers: {
                authorization: `bearer ${await providerToken(credentials, nowSeconds)}`,
                // The intent posted its own notification under the capture id; this one replaces it.
                "apns-collapse-id": answer.captureId,
                "apns-expiration": String(nowSeconds + EXPIRY_SECONDS),
                "apns-priority": "10",
                "apns-push-type": "alert",
                "apns-topic": APNS_TOPIC,
            },
            method: "POST",
        },
        url: `${APNS_HOSTS[target.environment]}/3/device/${target.token}`,
    };
}

const decodeRejection = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ reason: Schema.String })));

export const rejectionReason = (body: string) => Option.getOrUndefined(decodeRejection(body))?.reason;

export const isDeadToken = (status: number, reason: string | undefined) =>
    status === 410 || (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic"));
