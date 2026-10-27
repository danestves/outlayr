import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";

import { eraseLedger } from "./erase-core";
import type { EraseScope } from "./erase-core";

export type { EraseScope } from "./erase-core";

// Injected so this stays free of `expo-file-system` and `expo-core-spotlight`, which can't load under node tests.
export interface EraseResidue {
    clearSpotlight: () => Effect.Effect<void, unknown>;
    clearStoredPhotos: () => void;
}

export class EraseResidueError extends Schema.TaggedError<EraseResidueError>()("EraseResidueError", {
    cause: Schema.Defect(),
    residue: Schema.Literals(["photos", "spotlight"]),
}) {
    override get message(): string {
        return `Clearing the erased ${this.residue} failed`;
    }
}

// Spotlight is cleared even when photos refuse to go: a stale index answers device-wide search with erased notes, a
// worse residue than orphaned files. The photo failure is reported afterwards so the screen shows a partial erase.
export const eraseData = Effect.fn("Erase.eraseData")(function* eraseData(
    db: Database,
    scope: EraseScope,
    residue: EraseResidue
) {
    yield* eraseLedger(db, scope);

    const photosCleared = yield* Effect.result(
        Effect.try({
            catch: (cause) => new EraseResidueError({ cause, residue: "photos" }),
            try: () => {
                residue.clearStoredPhotos();
            },
        })
    );

    yield* residue
        .clearSpotlight()
        .pipe(Effect.mapError((cause) => new EraseResidueError({ cause, residue: "spotlight" })));

    if (photosCleared._tag === "Failure") {
        return yield* photosCleared.failure;
    }
});
