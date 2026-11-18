import { useLocale } from "react-intlayer";

import { InsightsScreen } from "@/components/app-ui/insights";

import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function InsightsPhone({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return (
        <PhoneFit dark={theme === "dark"}>
            <InsightsScreen locale={locale} theme={theme} />
        </PhoneFit>
    );
}
