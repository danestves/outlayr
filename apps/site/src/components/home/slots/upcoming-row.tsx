import { useLocale } from "react-intlayer";

import { UpcomingRowFragment } from "@/components/app-ui/upcoming";

import type { SlotProps } from "./placeholder";

export function UpcomingRow({ entry = "Verizon", theme = "dark" }: SlotProps & { entry?: string }) {
    const { locale } = useLocale();
    return <UpcomingRowFragment entry={entry} fit locale={locale} theme={theme} />;
}
