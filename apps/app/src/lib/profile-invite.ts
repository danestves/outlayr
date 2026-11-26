import { api } from "@outlayr/backend/convex/_generated/api";
import { normalizeReferralCode } from "@outlayr/money/contract";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";

import { serverConvexUrl } from "./convex";

export type ProfileInvite = FunctionReturnType<typeof api.profileSharing.invite>;

export async function readProfileInvite(token: string | null, rawCode: string): Promise<ProfileInvite> {
    const code = normalizeReferralCode(rawCode);
    if (code === null) {
        return null;
    }
    const client = new ConvexHttpClient(serverConvexUrl());
    if (token) {
        client.setAuth(token);
    }
    return client.query(api.profileSharing.invite, { code }).catch(() => null);
}
