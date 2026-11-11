import type { ConvexReactClient } from "convex/react";

import { PUSHER } from "./ledger-write";
import type { LedgerPusher } from "./ledger-write";

export const CONVEX = "convex";

export type LedgerConvex = Pick<ConvexReactClient, "watchQuery"> & LedgerPusher;

export const ledgerDependencies = (convex: LedgerConvex) => ({
    [CONVEX]: convex,
    [PUSHER]: convex,
});
