import { useMaterialColors } from "@/theme/use-material-colors";

export function useSheetSurface(_ios?: string): string {
    return useMaterialColors().surfaceContainerLow;
}
