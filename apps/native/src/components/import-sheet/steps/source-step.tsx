import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { IMPORT_SOURCES } from "@/domain/import-sources";
import { useTranslation } from "@/i18n/context";
import { importDraftStore } from "@/lib/import-draft-store";
import { useColors } from "@/theme/use-colors";

const ICON_TILE_SIZE = 30;

export function SourceStep() {
    const t = useTranslation();
    const colors = useColors();

    return (
        <View className="flex-1 px-5">
            <View className="gap-1.25">
                <MonoLabel numberOfLines={1}>{t("import.sourceEyebrow")}</MonoLabel>
                <View className="bg-border h-px" />
            </View>
            {IMPORT_SOURCES.map((source) => (
                <Pressable
                    accessibilityRole="button"
                    className="border-border flex-row items-center gap-3 border-b py-3 active:opacity-70"
                    key={source.id}
                    onPress={() => {
                        importDraftStore.dispatch({
                            sourceId: source.id,
                            type: "sourceSelected",
                        });
                        importDraftStore.setStep("file");
                    }}
                    testID={`import-source-${source.id}`}
                >
                    <View
                        className="items-center justify-center"
                        style={{ height: ICON_TILE_SIZE, width: ICON_TILE_SIZE }}
                    >
                        <HugeiconsIcon color={colors.foreground} icon={source.icon} size={20} strokeWidth={1.9} />
                    </View>
                    <View className="flex-1 gap-0.5">
                        <Text className="font-sans-medium text-callout text-foreground" numberOfLines={1}>
                            {t(source.titleKey)}
                        </Text>
                        <Text className="text-muted text-subtitle" numberOfLines={1}>
                            {t(source.subtitleKey)}
                        </Text>
                    </View>
                    <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={16} strokeWidth={2} />
                </Pressable>
            ))}
            <Text className="text-footnote text-muted pt-3 leading-snug">{t("import.sourceLede")}</Text>
        </View>
    );
}
