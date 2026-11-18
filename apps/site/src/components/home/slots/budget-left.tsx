import { useLocale } from "react-intlayer";

import { BudgetLeftFragment } from "@/components/app-ui/budgets";

import type { SlotProps } from "./placeholder";

export function BudgetLeft({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <BudgetLeftFragment fit locale={locale} theme={theme} />;
}
