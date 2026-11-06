import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";

export const CONVEX = "convex";

export const ledgerDependencies = (convex: ConvexCollectionClient) => ({ [CONVEX]: convex });
