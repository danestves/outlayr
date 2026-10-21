import { useColors } from "@/theme/use-colors";

export function useSheetSurface(ios?: string): string {
    const { background } = useColors();
    return ios ?? background;
}
