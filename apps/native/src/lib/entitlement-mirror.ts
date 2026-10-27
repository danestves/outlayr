import * as Effect from "effect/Effect";

import { cloudAction, convex } from "@/lib/convex";

/**
 * Copies the store's entitlement onto the account, which `requirePro` reads. Run it on every positive entitlement,
 * not only at checkout: a missed webhook or a pre-mirror purchase leaves the server behind. True with no backend.
 */
export const mirrorEntitlement = Effect.fn("EntitlementMirror.mirror")(function* mirrorEntitlement() {
    if (convex === null) {
        return true;
    }
    return yield* cloudAction<Record<string, never>, boolean>("revenuecat:syncFromStore", {}).pipe(
        Effect.catchTags({ CloudError: () => Effect.succeed(false) })
    );
});
