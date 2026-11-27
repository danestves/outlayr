import type { RedeemStatus } from "@outlayr/backend/confect/referrals.spec";
import { api } from "@outlayr/backend/convex/_generated/api";

import { convexClient } from "./convex";

export type Refusal = Exclude<RedeemStatus, "claimed" | "signedOut"> | "offline";

export async function redeemInvite(code: string): Promise<"claimed" | Refusal> {
    const status = await convexClient()
        .action(api.referrals.redeem, { code })
        .catch(() => "offline" as const);
    return status === "signedOut" ? "offline" : status;
}
