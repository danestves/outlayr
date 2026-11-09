import { expect, test } from "vite-plus/test";

import { base64Url, encryptPush, fromBase64Url, localClock, reminderDue } from "./webPush";

test("encrypts the RFC 8291 appendix A message byte for byte", async () => {
    const serverPublic = fromBase64Url(
        "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"
    );
    const jwk = {
        crv: "P-256",
        ext: true,
        kty: "EC",
        x: base64Url(serverPublic.slice(1, 33)),
        y: base64Url(serverPublic.slice(33, 65)),
    };
    const algorithm = { name: "ECDH", namedCurve: "P-256" };
    const keys = {
        privateKey: await crypto.subtle.importKey(
            "jwk",
            { ...jwk, d: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw" },
            algorithm,
            true,
            ["deriveBits"]
        ),
        publicKey: await crypto.subtle.importKey("jwk", jwk, algorithm, true, []),
    };
    const body = await encryptPush(
        "When I grow up, I want to be a watermelon",
        {
            auth: "BTBZMqHH6r4Tts7J_aSIgg",
            p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
        },
        keys,
        fromBase64Url("DGv6ra1nlYgDCS1FRnbzlw")
    );
    expect(base64Url(body)).toBe(
        "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
    );
});

test("the local day follows the zone, not UTC", () => {
    const lateInCaracas = Date.UTC(2026, 10, 10, 2, 30);
    expect(localClock(lateInCaracas, "America/Caracas")).toStrictEqual({
        day: "2026-11-09",
        dayStartMs: Date.UTC(2026, 10, 9, 4),
        minute: 22 * 60 + 30,
    });
});

test("a reminder fires once inside its window and never for time already past", () => {
    const at = (minute: number) => ({ day: "2026-11-09", dayStartMs: 0, minute });
    const reminder = { dailyMinute: 1200, lastSentDay: null };
    expect(reminderDue(reminder, at(1199))).toBeFalsy();
    expect(reminderDue(reminder, at(1205))).toBeTruthy();
    expect(reminderDue({ ...reminder, lastSentDay: "2026-11-09" }, at(1205))).toBeFalsy();
    expect(reminderDue(reminder, at(1230))).toBeFalsy();
});
