import type { ConvexReactClient } from "convex/react";

import { PUSHER } from "./ledger-write";
import type { LedgerPusher } from "./ledger-write";

export const CONVEX = "convex";
export const SERVER = "server";

export type LedgerConvex = Pick<ConvexReactClient, "watchQuery"> & LedgerPusher;

export const ledgerDependencies = (convex: LedgerConvex) => ({
    [CONVEX]: convex,
    [PUSHER]: convex,
});

// The server's tables are filled by hydration from its own pull, so they never reach Convex.
export const serverDependencies = () => ({ [SERVER]: true });
