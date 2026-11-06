import File01Icon from "@hugeicons-pro/core-stroke-rounded/File01Icon";
import Pdf01Icon from "@hugeicons-pro/core-stroke-rounded/Pdf01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";

import type { TranslationKey } from "@/i18n/catalog";

export type ImportSourceId = "csv" | "notion" | "pdf";

export type ImportSource = {
    readonly subtitleKey: TranslationKey;
    readonly titleKey: TranslationKey;
} & ({ readonly icon: IconSvgElement; readonly id: "csv" | "pdf" } | { readonly id: "notion" });

export const IMPORT_SOURCES: readonly ImportSource[] = [
    {
        icon: File01Icon,
        id: "csv",
        subtitleKey: "settings.import.sourceCsvSubtitle",
        titleKey: "settings.import.sourceCsvTitle",
    },
    {
        icon: Pdf01Icon,
        id: "pdf",
        subtitleKey: "settings.import.sourcePdfSubtitle",
        titleKey: "settings.import.sourcePdfTitle",
    },
    {
        id: "notion",
        subtitleKey: "settings.import.sourceNotionSubtitle",
        titleKey: "settings.import.sourceNotionTitle",
    },
];
