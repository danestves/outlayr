import { GoogleSansFlex_400Regular } from "@expo-google-fonts/google-sans-flex/400Regular";
import { GoogleSansFlex_500Medium } from "@expo-google-fonts/google-sans-flex/500Medium";
import { GoogleSansFlex_600SemiBold } from "@expo-google-fonts/google-sans-flex/600SemiBold";
import { GoogleSansFlex_700Bold } from "@expo-google-fonts/google-sans-flex/700Bold";

import type { BodyFonts, SansWeight } from "./body-fonts";

export type { BodyFonts, SansWeight } from "./body-fonts";

/** Android cannot pick a weight out of one `useFonts` family, so each weight is its own family name. */
export const SANS_BY_WEIGHT: Record<SansWeight, string> = {
    400: "GoogleSansFlex_400Regular",
    500: "GoogleSansFlex_500Medium",
    600: "GoogleSansFlex_600SemiBold",
    700: "GoogleSansFlex_700Bold",
};

export const BODY_FONTS: BodyFonts = {
    GoogleSansFlex_400Regular,
    GoogleSansFlex_500Medium,
    GoogleSansFlex_600SemiBold,
    GoogleSansFlex_700Bold,
};
