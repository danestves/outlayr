import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import type { CryptoKey, JWTVerifyGetKey } from "jose";
import { beforeAll, expect, test } from "vite-plus/test";

import { handlePhoto } from "./photos";
import type { PhotoDeps } from "./photos";

const ISSUER = "https://edge.example.com";
const OWN = "transaction-photos/alice/receipt.jpg";
const FOREIGN = "transaction-photos/bob/receipt.jpg";
const LEGACY = "transaction-photos/alice/legacy.jpg";

let signingKey: CryptoKey;
let strangerKey: CryptoKey;
let keys: JWTVerifyGetKey;

beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    signingKey = pair.privateKey;
    strangerKey = (await generateKeyPair("RS256")).privateKey;
    keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: "RS256" }] });
});

const token = (claims: Record<string, unknown> = {}, key = signingKey, issuer = ISSUER) =>
    new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256" })
        .setSubject("alice")
        .setIssuer(issuer)
        .setAudience("convex")
        .setExpirationTime("1h")
        .sign(key);

function deps(granted: Record<string, string> = {}): PhotoDeps & { asked: string[] } {
    const asked: string[] = [];
    return {
        appHost: "app.example.com",
        asked,
        issuer: ISSUER,
        keys,
        origin: () => Promise.resolve(new Response("origin")),
        readUrl: (_session, key) => {
            asked.push(key);
            return Promise.resolve(granted[key] ?? null);
        },
        store: {
            read: (key) => Promise.resolve(key === LEGACY ? null : new Response(`bytes of ${key}`)),
        },
    };
}

const fromFiles = (key: string, bearer: string) =>
    new Request(`https://files.example.com/${key}`, { headers: { authorization: `Bearer ${bearer}` } });

test("serves an own photo from the bucket without asking Convex", async () => {
    const photo = deps();
    const response = await handlePhoto(fromFiles(OWN, await token()), photo);
    expect(await response.text()).toBe(`bytes of ${OWN}`);
    expect(photo.asked).toEqual([]);
});

test("refuses another person's photo unless Convex grants it", async () => {
    const refused = await handlePhoto(fromFiles(FOREIGN, await token()), deps());
    expect(refused.status).toBe(404);

    const shared = await handlePhoto(fromFiles(FOREIGN, await token()), deps({ [FOREIGN]: "https://signed" }));
    expect(await shared.text()).toBe(`bytes of ${FOREIGN}`);
});

test("redirects an own photo that predates the bucket to the url Convex signs", async () => {
    const response = await handlePhoto(fromFiles(LEGACY, await token()), deps({ [LEGACY]: "https://legacy" }));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://legacy");
});

test("rejects tokens Convex would not accept as an account", async () => {
    const rejected = [
        await token({}, strangerKey),
        await token({}, signingKey, "https://elsewhere.example.com"),
        await token({ isAnonymous: true }),
    ];
    const responses = await Promise.all(rejected.map((bearer) => handlePhoto(fromFiles(OWN, bearer), deps())));
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401]);
});

test("reads the session cookie on the app and leaves a visitor without one to the app's own route", async () => {
    const withCookie = new Request(`https://app.example.com/photos/${OWN}`, {
        headers: { cookie: `theme=dark; __Secure-better-auth.convex_jwt=${await token()}` },
    });
    expect(await (await handlePhoto(withCookie, deps())).text()).toBe(`bytes of ${OWN}`);

    const without = new Request(`https://app.example.com/photos/${OWN}`);
    expect(await (await handlePhoto(without, deps())).text()).toBe("origin");
});
