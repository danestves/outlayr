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
export const optionalUserId = Effect.fn("Auth.optionalUserId")(function* optionalUserId(
    ctx: ActionCtx | MutationCtx | QueryCtx
) {
    const user = yield* Effect.promise(() => authComponent.safeGetAuthUser(ctx));
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
    return (yield* optionalUserId(ctx)) === null ? null : identity;
});

// The returned id is what gets stored as `userId`; never accept one as a function argument.
export const requireUserId = Effect.fn("Auth.requireUserId")(function* requireUserId(ctx: MutationCtx | QueryCtx) {
    const userId = yield* optionalUserId(ctx);
    if (userId === null) {
        return yield* new Unauthenticated();
    }
    return userId;
});
