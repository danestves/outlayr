import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import type { ConvexHttpClient } from "convex/browser";

export const CONVEX = "convex";

export const ledgerDependencies = (convex: ConvexCollectionClient) => ({ [CONVEX]: convex });

export function snapshotClient(http: ConvexHttpClient): ConvexCollectionClient {
    return {
        onUpdate: (query, args, callback, onError) => {
            let current: Parameters<typeof callback>[0] | undefined;
            const read = async () => {
                try {
                    current = await http.consistentQuery(query, args);
                } catch (error) {
                    onError?.(error instanceof Error ? error : new Error(String(error)));
                    return;
                }
                callback(current);
            };
            void read();
            return Object.assign(() => undefined, { getCurrentValue: () => current, unsubscribe: () => undefined });
        },
    };
}
