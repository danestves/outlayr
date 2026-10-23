import { SymbolView } from "expo-symbols";
import type { SymbolViewProps } from "expo-symbols";

// Each name needs a Hugeicon in `app-symbol.android.tsx`; the `satisfies` there keeps the lists in step.
export type AppSymbolName =
    | "checkmark.circle.fill"
    | "circle"
    | "exclamationmark.circle.fill"
    | "magnifyingglass"
    | "plus.circle.fill"
    | "star"
    | "xmark";

export type AppSymbolProps = Omit<SymbolViewProps, "name"> & { name: AppSymbolName };

// Android's sibling draws Hugeicons: expo-symbols' Material fallback loads a font on every mount, so lists flash blank.
export function AppSymbol(props: AppSymbolProps) {
    return <SymbolView {...props} />;
}
