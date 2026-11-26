import type { ConvexReactClient } from "convex/react";

import { CONVEX, PROFILE, PUSHER, SERVER } from "./db-keys";
import type { LedgerPusher } from "./ledger-write";

export type LedgerConvex = Pick<ConvexReactClient, "watchQuery"> & LedgerPusher;

export const ledgerDependencies = (convex: LedgerConvex, profileId: string | null = null) => ({
    [CONVEX]: convex,
    [PROFILE]: profileId,
    [PUSHER]: convex,
});

export { CONVEX, PROFILE, PUSHER, SERVER } from "./db-keys";

// The server's tables are filled by hydration from its own pull, so they never reach Convex.
export const serverDependencies = () => ({ [SERVER]: true });
