import { ConvexError } from "convex/values";

import type { ActionCtx, MutationCtx, QueryCtx } from "../../convex/_generated/server";
import { authComponent } from "./betterAuth";

// A revoked or expired session resolves to null here, though `ctx.auth.getUserIdentity()` still decodes its token.
export async function optionalUserId(ctx: ActionCtx | MutationCtx | QueryCtx): Promise<string | null> {
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
