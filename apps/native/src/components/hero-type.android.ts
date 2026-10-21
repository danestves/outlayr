import type { HERO_TYPE as HERO_TYPE_BASE } from "./hero-type";

// A quarter larger than the sans it replaces: the serif runs condensed and would otherwise read smaller.
export const HERO_TYPE: typeof HERO_TYPE_BASE = { face: { fontFamily: "InstrumentSerif_400Regular" }, scale: 1.25 };
