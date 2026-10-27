import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono/500Medium";
import { GoogleSansFlex_400Regular } from "@expo-google-fonts/google-sans-flex/400Regular";
import { GoogleSansFlex_500Medium } from "@expo-google-fonts/google-sans-flex/500Medium";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { Skia } from "@shopify/react-native-skia";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { Image } from "react-native";

import type { CardWeight } from "@/domain/day-card";

import { DayCardFontError } from "./day-card-font-error";
import type { CardTypefaces, loadCardTypefaces as loadCardTypefacesBase } from "./day-card-fonts";

export type { CardTypefaces } from "./day-card-fonts";

const FILES = {
    medium: GoogleSansFlex_500Medium,
    mono: GeistMono_500Medium,
    regular: GoogleSansFlex_400Regular,
    semibold: InstrumentSerif_400Regular,
} satisfies Record<CardWeight, number>;

const notLoaded = (cause?: unknown) => new DayCardFontError({ cause, reason: "notLoaded" });

const typefaceFrom = Effect.fn("DayCardFonts.typefaceFrom")(function* typefaceFrom(file: number) {
    const source = Image.resolveAssetSource(file);
    if (!source) {
        return yield* notLoaded();
    }
    const data = yield* Effect.tryPromise({ catch: notLoaded, try: () => Skia.Data.fromURI(source.uri) });
    const typeface = yield* Effect.try({ catch: notLoaded, try: () => Skia.Typeface.MakeFreeTypeFaceFromData(data) });
    if (typeface == null) {
        return yield* notLoaded();
    }
    return typeface;
});

let loading: Deferred.Deferred<CardTypefaces, DayCardFontError> | null = null;

const loadAll = Effect.all(
    {
        medium: typefaceFrom(FILES.medium),
        mono: typefaceFrom(FILES.mono),
        regular: typefaceFrom(FILES.regular),
        semibold: typefaceFrom(FILES.semibold),
    },
    { concurrency: "unbounded" }
);

/**
 * Loaded from the bundled files: Android's system manager hands back blank typefaces for family names it cannot
 * match. A failure is retried on the next share rather than cached.
 */
export const loadCardTypefaces: typeof loadCardTypefacesBase = () =>
    Effect.suspend(() => {
        if (loading !== null) {
            return Deferred.await(loading);
        }
        const pass = Deferred.makeUnsafe<CardTypefaces, DayCardFontError>();
        loading = pass;
        return loadAll.pipe(
            Effect.onExit((exit) =>
                Effect.suspend(() => {
                    if (Exit.isFailure(exit)) {
                        loading = null;
                    }
                    return Deferred.done(pass, exit);
                })
            ),
            Effect.uninterruptible
        );
    });
