import { cloudAction, convex } from "@/lib/convex";

/**
 * Copies the store's entitlement onto the account, which `requirePro` reads. Run it on every positive entitlement,
 * not only at checkout: a missed webhook or a pre-mirror purchase leaves the server behind. True with no backend.
 */
export async function mirrorEntitlement(): Promise<boolean> {
    if (convex === null) {
        return true;
    }
    return await cloudAction<Record<string, never>, boolean>("revenuecat:syncFromStore", {}).catch(() => false);
}
