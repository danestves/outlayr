import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { authServer } from "./auth-server";
import { tokenWaitOf } from "./token-wait";
import type { TokenWait } from "./token-wait";

const MS_PER_SECOND = 1000;
const URL_SAFE = /[-_]/gu;

const decodeClaims = Schema.decodeUnknownOption(
    Schema.fromJsonString(Schema.Struct({ exp: Schema.Number, sub: Schema.String }))
);

const readToken = createServerFn({ method: "GET" }).handler(async () => (await authServer().getToken()) ?? null);

export interface Session {
    token: string | null;
}

const claimsOf = (token: string) => {
    const payload = token.split(".")[1]?.replaceAll(URL_SAFE, (char) => (char === "-" ? "+" : "/")) ?? "";
    try {
        return decodeClaims(atob(payload));
    } catch {
        return Option.none();
    }
};

export const userOf = (token: string) => Option.getOrUndefined(claimsOf(token))?.sub;

const isLive = (token: string) => Option.exists(claimsOf(token), (claims) => claims.exp * MS_PER_SECOND > Date.now());

export const tokenWait = createIsomorphicFn()
    .server(() => tokenWaitOf(new Headers(getRequestHeaders())))
    .client((): TokenWait => "none");

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
