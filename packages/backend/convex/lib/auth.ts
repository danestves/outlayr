import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

// A revoked or expired session resolves to null here, though `ctx.auth.getUserIdentity()` still decodes its token.
export async function optionalUserId(ctx: MutationCtx | QueryCtx): Promise<string | null> {
    const user = await authComponent.safeGetAuthUser(ctx);
    return user ? user._id : null;
}

// The returned id is what gets stored as `userId`; never accept one as a function argument.
export async function requireUserId(ctx: MutationCtx | QueryCtx): Promise<string> {
    const userId = await optionalUserId(ctx);
    if (userId === null) {
        throw new ConvexError("Unauthenticated: sign in to access your data");
    }
    return userId;
}
