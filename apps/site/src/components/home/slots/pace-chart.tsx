import { useLocale } from "react-intlayer";

import { PaceChartFragment } from "@/components/app-ui/budgets";

import type { SlotProps } from "./placeholder";

export function PaceChart({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <PaceChartFragment fit locale={locale} theme={theme} />;
}
