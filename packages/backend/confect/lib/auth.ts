import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { ActionCtx, MutationCtx, QueryCtx } from "../../convex/_generated/server";
import { authComponent } from "./betterAuth";

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()("Unauthenticated", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed("Unauthenticated: sign in to access your data"))
    ),
}) {}

// A revoked or expired session resolves to null here, though `ctx.auth.getUserIdentity()` still decodes its token.
const authUser = (ctx: ActionCtx | MutationCtx | QueryCtx) => Effect.promise(() => authComponent.safeGetAuthUser(ctx));

// Anything that stores account data uses this; a guest only holds a purchase and is deleted on sign-in.
export const optionalUserId = Effect.fn("Auth.optionalUserId")(function* optionalUserId(
    ctx: ActionCtx | MutationCtx | QueryCtx
) {
    const user = yield* authUser(ctx);
    return user && user.isAnonymous !== true ? user._id : null;
});

// The RevenueCat customer: an account, or a guest that bought Pro signed out.
export const optionalBillingId = Effect.fn("Auth.optionalBillingId")(function* optionalBillingId(
    ctx: ActionCtx | MutationCtx | QueryCtx
) {
    const user = yield* authUser(ctx);
    return user ? user._id : null;
});

// Better Auth puts its user fields in the Convex token, so an anonymous user carries isAnonymous.
export const isGuest = (identity: UserIdentity) => identity["isAnonymous"] === true;

export const liveIdentity = Effect.fn("Auth.liveIdentity")(function* liveIdentity(
    ctx: ActionCtx | MutationCtx | QueryCtx
) {
    const identity = yield* Effect.promise(() => ctx.auth.getUserIdentity());
    if (identity === null) {
        return null;
    }
    return (yield* optionalBillingId(ctx)) === null ? null : identity;
});

// The returned id is what gets stored as `userId`; never accept one as a function argument.
export const requireUserId = Effect.fn("Auth.requireUserId")(function* requireUserId(ctx: MutationCtx | QueryCtx) {
    const userId = yield* optionalUserId(ctx);
    if (userId === null) {
        return yield* new Unauthenticated();
    }
    return userId;
});

export const requireBillingId = Effect.fn("Auth.requireBillingId")(function* requireBillingId(
    ctx: MutationCtx | QueryCtx
) {
    const billingId = yield* optionalBillingId(ctx);
    if (billingId === null) {
        return yield* new Unauthenticated();
    }
    return billingId;
});
