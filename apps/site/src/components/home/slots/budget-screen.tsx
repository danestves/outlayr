import { useLocale } from "react-intlayer";

import { BudgetsScreen } from "@/components/app-ui/budgets";

import type { SlotProps } from "./placeholder";

export function BudgetScreen({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <BudgetsScreen fit locale={locale} theme={theme} />;
}
