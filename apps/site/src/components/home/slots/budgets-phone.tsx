import { useLocale } from "react-intlayer";

import { BudgetsScreen } from "@/components/app-ui/budgets";

import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function BudgetsPhone({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return (
        <PhoneFit dark={theme === "dark"}>
            <BudgetsScreen locale={locale} theme={theme} />
        </PhoneFit>
    );
}
