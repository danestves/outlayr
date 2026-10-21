import { useEffect } from "react";

import type { Database } from "@/db/client";
import { replateLogos } from "@/lib/logo-replate";
import { photoFiles } from "@/lib/photo-storage";

import { reconcilePhotos } from "./photo-store-core";

/**
 * Once per launch, not per foreground: the unreferenced-file sweep would widen the window in which a
 * picked-but-unsaved photo survives only on the purge grace period.
 */
export function usePhotoReconcile(db: Database | null): void {
    useEffect(() => {
        if (db == null) {
            return;
        }
        // The logo repair matches rows by photo path, so it waits for the reconcile to repoint stale ones.
        reconcilePhotos(db, photoFiles, Date.now())
            .then(() => replateLogos(db))
            .catch((error) => {
                console.error("Photo reconcile failed", error);
            });
    }, [db]);
}
