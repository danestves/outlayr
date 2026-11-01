import File01Icon from "@hugeicons-pro/core-stroke-rounded/File01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";

import type { TranslationKey } from "@/i18n/catalog";

export type ImportSourceId = "csv" | "notion";

export type ImportSource = {
    readonly subtitleKey: TranslationKey;
    readonly titleKey: TranslationKey;
} & ({ readonly icon: IconSvgElement; readonly id: "csv" } | { readonly id: "notion" });

export const IMPORT_SOURCES: readonly ImportSource[] = [
    {
        icon: File01Icon,
        id: "csv",
        subtitleKey: "settings.import.sourceCsvSubtitle",
        titleKey: "settings.import.sourceCsvTitle",
    },
    {
        id: "notion",
        subtitleKey: "settings.import.sourceNotionSubtitle",
        titleKey: "settings.import.sourceNotionTitle",
    },
];
