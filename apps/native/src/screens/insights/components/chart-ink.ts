import { useColors } from "@/theme/use-colors";

export function useChartInk(): string {
    return useColors().foreground;
}
