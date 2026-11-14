import { makeFunctionReference } from "convex/server";

export interface AuthRequest {
    clientName?: string;
    kind: "device" | "redirect";
    redirectUri?: string;
    scopes: { description: string; name: string }[];
    status: "approved" | "denied" | "pending";
    userCode?: string;
}

export const getAuthRequest = makeFunctionReference<"query", { requestId: string }, AuthRequest | null>(
    "mcp:getAuthRequest"
);

export const authorize = makeFunctionReference<
    "action",
    { approve: boolean; requestId: string; userCode?: string },
    { redirectUrl: string | null }
>("mcp:authorize");

export const findAuthRequest = makeFunctionReference<"mutation", { userCode: string }, string | null>(
    "mcp:findAuthRequest"
);

const SCOPE_TITLES = new Map([
    ["ledger:read", "Read your ledger"],
    ["ledger:write", "Log entries"],
]);

export const scopeTitle = (name: string) => SCOPE_TITLES.get(name) ?? name;

export function redirectHost(redirectUri: string): string {
    const { host, protocol } = new URL(redirectUri);
    return host || protocol;
}
