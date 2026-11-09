const SENT_WINDOW_MINUTES = 30;
const RECORD_SIZE = 4096;
const VAPID_LIFETIME_SECONDS = 43_200;
const RAW_PUBLIC_KEY_BYTES = 65;

type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const encode = (text: string) => encoder.encode(text);

const concat = (...parts: readonly Bytes[]) => {
    const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let at = 0;
    for (const part of parts) {
        joined.set(part, at);
        at += part.length;
    }
    return joined;
};

export const base64Url = (bytes: Uint8Array) =>
    btoa(String.fromCodePoint(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/[=]+$/u, "");

export const fromBase64Url = (text: string) =>
    Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (char) => char.codePointAt(0) ?? 0);

const hkdf = async (ikm: Bytes, salt: Bytes, info: Bytes, bytes: number) => {
    const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    return new Uint8Array(
        await crypto.subtle.deriveBits({ hash: "SHA-256", info, name: "HKDF", salt }, key, bytes * 8)
    );
};

const importPublicKey = (raw: Bytes) =>
    crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, true, []);

export interface PushTarget {
    auth: string;
    p256dh: string;
}

export const newServerKeys = () =>
    crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);

export async function encryptPush(
    plaintext: string,
    target: PushTarget,
    keys: CryptoKeyPair,
    salt: Bytes = crypto.getRandomValues(new Uint8Array(16))
) {
    const browserPublic = fromBase64Url(target.p256dh);
    const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
    const shared = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: "ECDH", public: await importPublicKey(browserPublic) },
            keys.privateKey,
            256
        )
    );
    const info = concat(encode("WebPush: info\0"), browserPublic, serverPublic);
    const ikm = await hkdf(shared, fromBase64Url(target.auth), info, 32);
    const contentKey = await hkdf(ikm, salt, encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(ikm, salt, encode("Content-Encoding: nonce\0"), 12);
    const aes = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
    const sealed = await crypto.subtle.encrypt(
        { iv: nonce, name: "AES-GCM" },
        aes,
        concat(encode(plaintext), Uint8Array.of(2))
    );
    const header = new Uint8Array(21);
    header.set(salt);
    new DataView(header.buffer).setUint32(16, RECORD_SIZE);
    header[20] = RAW_PUBLIC_KEY_BYTES;
    return concat(header, serverPublic, new Uint8Array(sealed));
}

export async function vapidAuthorization(
    endpoint: string,
    { privateKey, publicKey, subject }: { privateKey: string; publicKey: string; subject: string },
    nowSeconds: number
) {
    const point = fromBase64Url(publicKey);
    const key = await crypto.subtle.importKey(
        "jwk",
        {
            crv: "P-256",
            d: privateKey,
            ext: true,
            kty: "EC",
            x: base64Url(point.slice(1, 33)),
            y: base64Url(point.slice(33, 65)),
        },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );
    const part = (claims: Record<string, number | string>) => base64Url(encode(JSON.stringify(claims)));
    const unsigned = `${part({ alg: "ES256", typ: "JWT" })}.${part({
        aud: new URL(endpoint).origin,
        exp: nowSeconds + VAPID_LIFETIME_SECONDS,
        sub: subject,
    })}`;
    const signature = await crypto.subtle.sign({ hash: "SHA-256", name: "ECDSA" }, key, encode(unsigned));
    return `vapid t=${unsigned}.${base64Url(new Uint8Array(signature))}, k=${publicKey}`;
}

export interface LocalClock {
    day: string;
    dayStartMs: number;
    minute: number;
}

export function localClock(now: number, timeZone: string): LocalClock {
    const parts = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        hourCycle: "h23",
        hour: "numeric",
        minute: "numeric",
        month: "numeric",
        second: "numeric",
        timeZone,
        year: "numeric",
    }).formatToParts(now);
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const year = read("year");
    const month = read("month");
    const date = read("day");
    const hour = read("hour");
    const minute = read("minute");
    const wallNow = Date.UTC(year, month - 1, date, hour, minute, read("second"));
    const offset = wallNow - Math.floor(now / 1000) * 1000;
    return {
        day: `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
        dayStartMs: Date.UTC(year, month - 1, date) - offset,
        minute: hour * 60 + minute,
    };
}

export const isValidTimeZone = (timeZone: string) => {
    try {
        localClock(0, timeZone);
        return true;
    } catch {
        return false;
    }
};

export const reminderDue = (
    { dailyMinute, lastSentDay }: { dailyMinute: number; lastSentDay: string | null },
    clock: LocalClock
) => lastSentDay !== clock.day && clock.minute >= dailyMinute && clock.minute < dailyMinute + SENT_WINDOW_MINUTES;

const NUDGE = {
    en: "Nothing logged today. Add it before you forget.",
    es: "Hoy no registraste nada. Agrégalo antes de que se te olvide.",
    fr: "Rien de saisi aujourd'hui. Ajoutez-le avant d'oublier.",
    pt: "Nada registrado hoje. Adicione antes que esqueça.",
};

const NUDGE_BY_LANGUAGE = new Map<string, string>(Object.entries(NUDGE));

export const nudgeText = (locale: string) => NUDGE_BY_LANGUAGE.get(locale.slice(0, 2)) ?? NUDGE.en;
