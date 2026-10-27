import { FontWeight, Skia } from "@shopify/react-native-skia";
import type { SkTypeface } from "@shopify/react-native-skia";
import * as Effect from "effect/Effect";

import type { CardWeight } from "@/domain/day-card";

import { DayCardFontError } from "./day-card-font-error";

export type CardTypefaces = Readonly<Record<CardWeight, SkTypeface>>;

const WEIGHTS = {
    medium: FontWeight.Medium,
    mono: FontWeight.Medium,
    regular: FontWeight.Normal,
    semibold: FontWeight.SemiBold,
} satisfies Record<CardWeight, FontWeight>;

/** Skia's `matchFamilyStyle` never returns null: an unmatched name, even an empty one, yields a blank face. */
const FAMILIES = ["System", "Helvetica Neue", "sans-serif"];

function draws(typeface: SkTypeface): boolean {
    return Skia.Font(typeface, 12).measureText("A").width > 0;
}

const TYPEFACES = new Map<CardWeight, SkTypeface>();

function typefaceFor(weight: CardWeight): SkTypeface {
    const cached = TYPEFACES.get(weight);
    if (cached) {
        return cached;
    }
    const manager = Skia.FontMgr.System();
    for (const family of FAMILIES) {
        const candidate = manager.matchFamilyStyle(family, { weight: WEIGHTS[weight] });
        if (draws(candidate)) {
            TYPEFACES.set(weight, candidate);
            return candidate;
        }
    }
    // `Skia.Font` throws without a typeface: better a failed share than a blank card.
    throw new DayCardFontError({ reason: "noFace", weight });
}

export const loadCardTypefaces = Effect.fn("DayCardFonts.load")(function* loadCardTypefaces() {
    return yield* Effect.try({
        catch: (cause) =>
            cause instanceof DayCardFontError ? cause : new DayCardFontError({ cause, reason: "notLoaded" }),
        try: (): CardTypefaces => ({
            medium: typefaceFor("medium"),
            mono: typefaceFor("mono"),
            regular: typefaceFor("regular"),
            semibold: typefaceFor("semibold"),
        }),
    });
});
