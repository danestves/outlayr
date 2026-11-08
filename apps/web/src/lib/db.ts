import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";

import { PUSHER } from "./ledger-write";
import type { LedgerPusher } from "./ledger-write";

export const CONVEX = "convex";

export const ledgerDependencies = (convex: ConvexCollectionClient & LedgerPusher) => ({
    [CONVEX]: convex,
    [PUSHER]: convex,
});
