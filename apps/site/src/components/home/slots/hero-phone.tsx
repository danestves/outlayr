import { useLocale } from "react-intlayer";

import { NewEntryScreen } from "@/components/app-ui/entry";

import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function HeroPhone({ theme = "light" }: SlotProps) {
    const { locale } = useLocale();
    return (
        <PhoneFit dark={theme === "dark"}>
            <NewEntryScreen locale={locale} theme={theme} />
        </PhoneFit>
    );
}
