import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono/500Medium";
import { GoogleSansFlex_400Regular } from "@expo-google-fonts/google-sans-flex/400Regular";
import { GoogleSansFlex_500Medium } from "@expo-google-fonts/google-sans-flex/500Medium";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { Skia } from "@shopify/react-native-skia";
import type { SkTypeface } from "@shopify/react-native-skia";
import { Image } from "react-native";

import type { CardWeight } from "@/domain/day-card";

import type { CardTypefaces, loadCardTypefaces as loadCardTypefacesBase } from "./day-card-fonts";

export type { CardTypefaces } from "./day-card-fonts";

const FILES = {
    medium: GoogleSansFlex_500Medium,
    mono: GeistMono_500Medium,
    regular: GoogleSansFlex_400Regular,
    semibold: InstrumentSerif_400Regular,
} satisfies Record<CardWeight, number>;

async function typefaceFrom(file: number): Promise<SkTypeface> {
    const source = Image.resolveAssetSource(file);
    const typeface = source && Skia.Typeface.MakeFreeTypeFaceFromData(await Skia.Data.fromURI(source.uri));
    if (typeface == null) {
        throw new Error("A day card font file did not load");
    }
    return typeface;
}

let loading: Promise<CardTypefaces> | null = null;

async function loadAll(): Promise<CardTypefaces> {
    try {
        const [medium, mono, regular, semibold] = await Promise.all([
            typefaceFrom(FILES.medium),
            typefaceFrom(FILES.mono),
            typefaceFrom(FILES.regular),
            typefaceFrom(FILES.semibold),
        ]);
        return { medium, mono, regular, semibold };
    } catch (error) {
        loading = null;
        throw error;
    }
}

/**
 * Loaded from the bundled files: Android's system manager hands back blank typefaces for family names it cannot
 * match. A failure is retried on the next share rather than cached.
 */
export const loadCardTypefaces: typeof loadCardTypefacesBase = () => {
    loading ??= loadAll();
    return loading;
};
