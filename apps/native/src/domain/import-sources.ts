import File01Icon from "@hugeicons-pro/core-stroke-rounded/File01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";

import type { TranslationKey } from "@/i18n/catalog";

export type ImportSourceId = "csv";

export interface ImportSource {
    readonly icon: IconSvgElement;
    readonly id: ImportSourceId;
    readonly subtitleKey: TranslationKey;
    readonly titleKey: TranslationKey;
}

export const IMPORT_SOURCES: readonly ImportSource[] = [
    {
        icon: File01Icon,
        id: "csv",
        subtitleKey: "settings.import.sourceCsvSubtitle",
        titleKey: "settings.import.sourceCsvTitle",
    },
];
