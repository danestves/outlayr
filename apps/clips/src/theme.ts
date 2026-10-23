import { loadFont as loadSans } from "@remotion/google-fonts/Geist";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

export const SANS = loadSans("normal", { subsets: ["latin", "latin-ext"], weights: ["400", "500", "600"] }).fontFamily;
export const MONO = loadMono("normal", { subsets: ["latin"], weights: ["400", "500"] }).fontFamily;

export const PAPER = "#F2F0EA";
export const INK = "#17150F";
export const MUTED = "#6B6557";
export const HAIR = "rgba(23, 21, 15, 0.07)";
