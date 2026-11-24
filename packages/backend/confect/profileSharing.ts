import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { DAY_MS } from "@outlayr/money/ledger-zone";

import { components } from "../convex/_generated/api";

export const PROFILE_MEMBER_LIMIT = 5;

export const PROFILE_INVITE_TTL_MS = 7 * DAY_MS;

export const profileInviteLimiter = new RateLimiter(components.rateLimiter, {
    profileInviteClaim: { capacity: 10, kind: "token bucket", period: HOUR, rate: 10 },
});

export type InviteState = "claimed" | "expired" | "full" | "member" | "open" | "own";

export function inviteState(input: {
    readonly invite: { readonly claimedAt: number | null; readonly expiresAt: number; readonly ownerId: string };
    readonly viewerId: string | null;
    readonly viewerIsMember: boolean;
    readonly members: number;
    readonly now: number;
}): InviteState {
    const { invite, viewerId } = input;
    if (viewerId !== null && invite.ownerId === viewerId) {
        return "own";
    }
    if (input.viewerIsMember) {
        return "member";
    }
    if (invite.claimedAt !== null) {
        return "claimed";
    }
    if (invite.expiresAt <= input.now) {
        return "expired";
    }
    return input.members >= PROFILE_MEMBER_LIMIT ? "full" : "open";
}
