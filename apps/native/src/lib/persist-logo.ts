import * as Effect from "effect/Effect";

export const persistLogo = Effect.fn("PersistLogo.persist")(function* persistLogo(bytes: Uint8Array) {
    // Required lazily so neither caller pulls Skia's downscaler into the module graph at import time.
    // SAFETY: untyped `require`, asserted to that module's own type.
    const photoStorage = require("@/lib/photo-storage") as typeof import("@/lib/photo-storage");
    // SAFETY: as on the line above.
    const { glowFromImage } = require("@/theme/glow") as typeof import("@/theme/glow");
    const imageUri = yield* photoStorage.persistLogoBytes(bytes);
    const hues = yield* glowFromImage(imageUri);
    return { imageColor: hues[0] ?? null, imageUri };
});
