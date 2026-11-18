import { useLocale } from "react-intlayer";

import { UpcomingTotalFragment } from "@/components/app-ui/upcoming";

import type { SlotProps } from "./placeholder";

export function UpcomingTotal({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <UpcomingTotalFragment fit locale={locale} theme={theme} />;
}
