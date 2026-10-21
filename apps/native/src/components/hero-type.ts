import type { TextStyle } from "react-native";

interface HeroType {
    /** Spread into a hero's text style. Empty keeps the face its classes name. */
    face: Pick<TextStyle, "fontFamily">;
    /** Multiplies the figure's size, before it is fitted to the width. */
    scale: number;
}

export const HERO_TYPE: HeroType = { face: {}, scale: 1 };
