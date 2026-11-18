import { useLocale } from "react-intlayer";

import { UpcomingListFragment } from "@/components/app-ui/upcoming";

import type { SlotProps } from "./placeholder";

export function UpcomingList({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <UpcomingListFragment fit locale={locale} theme={theme} />;
}
