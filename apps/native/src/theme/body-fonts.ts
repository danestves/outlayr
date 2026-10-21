import type { FontSource } from "expo-font";

/** Anything else rounds to the nearest. */
export type SansWeight = 400 | 500 | 600 | 700;

/** iOS uses the system rounded face, which takes weight as a style. */
export const SANS_BY_WEIGHT: Record<SansWeight, string> = {
    400: "ui-rounded",
    500: "ui-rounded",
    600: "ui-rounded",
    700: "ui-rounded",
};

export type BodyFonts = Record<string, FontSource>;

export const BODY_FONTS: BodyFonts = {};
