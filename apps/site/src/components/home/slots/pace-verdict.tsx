import { useLocale } from "react-intlayer";

import { PaceVerdictFragment } from "@/components/app-ui/budgets";

import type { SlotProps } from "./placeholder";

export function PaceVerdict({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <PaceVerdictFragment fit locale={locale} theme={theme} />;
}
