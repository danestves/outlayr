import { useLocale } from "react-intlayer";

import { TodayCard as TodayReplica } from "@/components/app-ui/entry";

import type { SlotProps } from "./placeholder";

export function TodayCard({ theme = "light" }: SlotProps) {
    const { locale } = useLocale();
    return <TodayReplica fit locale={locale} theme={theme} />;
}
