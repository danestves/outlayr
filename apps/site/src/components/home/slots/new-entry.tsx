import { useLocale } from "react-intlayer";

import { SentenceCard } from "@/components/app-ui/entry";

import type { SlotProps } from "./placeholder";

export function NewEntryCard({ theme = "light" }: SlotProps) {
    const { locale } = useLocale();
    return <SentenceCard fit locale={locale} theme={theme} />;
}
