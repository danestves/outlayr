import { useMaterialColors } from "@/theme/use-material-colors";

import type { useChartInk as useChartInkBase } from "./chart-ink";

export const useChartInk: typeof useChartInkBase = () => useMaterialColors().primary;
