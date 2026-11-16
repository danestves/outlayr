import { createContext } from "react";

export const ROW_TYPE = {
    amount: "font-sans-medium text-title",
    balance: "font-sans-medium text-callout",
    cell: "font-sans-semibold text-body",
    name: "font-sans-semibold text-body",
    subtitle: "font-sans-medium text-subtitle",
    /** The weight only; the size is the caller's. */
    subtotal: "font-sans-semibold",
    title: "font-sans-medium text-callout",
} as const;

/** The Log's denser rows; every other list keeps the roomier type above. */
export const COMPACT_ROW_TYPE = {
    amount: "font-sans-semibold text-subtitle",
    subtitle: "font-sans-medium text-label",
    title: "font-sans-medium text-subtitle leading-5",
} as const;

export const CompactRowsContext = createContext(false);
