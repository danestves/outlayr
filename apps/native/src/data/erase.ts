import type { Database } from "@/db/client";

import { eraseLedger } from "./erase-core";
import type { EraseScope } from "./erase-core";

export type { EraseScope } from "./erase-core";

// Injected so this stays free of `expo-file-system` and `expo-core-spotlight`, which can't load under node tests.
export interface EraseResidue {
    clearSpotlight: () => Promise<void>;
    clearStoredPhotos: () => void;
}

// Spotlight is cleared even when photos refuse to go: a stale index answers device-wide search with erased notes, a
// worse residue than orphaned files. The photo failure is rethrown so the screen reports a partial erase.
export async function eraseData(db: Database, scope: EraseScope, residue: EraseResidue): Promise<void> {
    await eraseLedger(db, scope);

    // Boxed rather than kept as `unknown`: a thrown `undefined` is still a failure.
    let photoFailure: { cause: unknown } | null = null;
    try {
        residue.clearStoredPhotos();
    } catch (cause) {
        photoFailure = { cause };
    }

    await residue.clearSpotlight();

    if (photoFailure) {
        throw photoFailure.cause;
    }
}
