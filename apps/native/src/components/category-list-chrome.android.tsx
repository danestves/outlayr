import { MonoLabel } from "@/components/mono-label";
import type { ThemeColors } from "@/theme/use-colors";

export const PARENT_TILE = 34;
export const CHILD_TILE = 28;

// `colors` is unused here but keeps the call sites type-checking against either platform's file.
export function Eyebrow({ children }: { colors: ThemeColors; children: string }) {
    return (
        <MonoLabel accessibilityRole="header" className="text-m3-on-surface-variant">
            {children}
        </MonoLabel>
    );
}
