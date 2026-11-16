import { createContext } from "react";

/** The Log's denser rows; every other list keeps `ROW_TYPE`. */
export const COMPACT_ROW_TYPE = {
    amount: "font-sans-semibold text-subtitle",
    subtitle: "font-sans-medium text-label",
    title: "font-sans-medium text-subtitle leading-5",
} as const;

export const CompactRowsContext = createContext(false);
