import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { Profile } from "./account-state";
import { authServer } from "./auth-server";
import { timed } from "./server-timing";
import { signedOutOf } from "./token-wait";

const MS_PER_SECOND = 1000;
const URL_SAFE = /[-_]/gu;

const decodeClaims = Schema.decodeUnknownOption(
    Schema.fromJsonString(Schema.Struct({ exp: Schema.Number, sub: Schema.String }))
);
const decodeProfile = Schema.decodeUnknownOption(
    Schema.fromJsonString(
        Schema.Struct({
            email: Schema.String,
            emailVerified: Schema.Boolean,
            name: Schema.String,
            sessionId: Schema.String,
            sub: Schema.String,
        })
    )
);

const readToken = createServerFn({ method: "GET" }).handler(
    async () => (await timed("token", () => authServer().getToken())) ?? null
);

export interface Session {
    token: string | null;
}

const payloadOf = (token: string) => {
    const payload = token.split(".")[1]?.replaceAll(URL_SAFE, (char) => (char === "-" ? "+" : "/")) ?? "";
    try {
        return new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.codePointAt(0) ?? 0));
    } catch {
        return "";
    }
};

const claimsOf = (token: string) => decodeClaims(payloadOf(token));

export const tokenProfile = (token: string): Profile | undefined =>
    Option.getOrUndefined(
        Option.map(decodeProfile(payloadOf(token)), ({ sub, ...claims }) => ({ ...claims, id: sub, image: null }))
    );

export const userOf = (token: string) => Option.getOrUndefined(claimsOf(token))?.sub;

const isLive = (token: string) => Option.exists(claimsOf(token), (claims) => claims.exp * MS_PER_SECOND > Date.now());

export const signedOut = createIsomorphicFn()
    .server(() => signedOutOf(new Headers(getRequestHeaders())))
    .client(() => false);

export async function currentToken(session: Session) {
    if (session.token && isLive(session.token)) {
        return session.token;
    }
    session.token = await readToken();
    return session.token;
}

let channel: BroadcastChannel | undefined;
const sessionChannel = () => {
    channel ??= new BroadcastChannel("outlayr-session");
    return channel;
};

export const announceSessionChange = () => {
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a BroadcastChannel has no target origin.
    sessionChannel().postMessage("changed");
};

export function onSessionChange(listener: () => void) {
    sessionChannel().addEventListener("message", listener);
    return () => sessionChannel().removeEventListener("message", listener);
}
