import { useLocale } from "react-intlayer";

import { LogScreen } from "@/components/app-ui/log";

import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function LogPhone({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return (
        <PhoneFit dark={theme === "dark"}>
            <LogScreen locale={locale} theme={theme} />
        </PhoneFit>
    );
}
