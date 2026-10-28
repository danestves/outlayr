import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import type { SettingsIconName } from "@/components/settings/settings-icons";
import { settingsIcon } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { DataActionsProps } from "./data-actions";

export type { DataActionsProps } from "./data-actions";

export function DataActions({ onExport, onImport, onRestore }: DataActionsProps) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const cells = [
        { icon: "FileInput", label: t("settings.controls.import"), onPress: onImport },
        { icon: "FileExport", label: t("settings.controls.export"), onPress: onExport },
        { icon: "ArchiveRestore", label: t("settings.controls.restore"), onPress: onRestore },
    ] satisfies readonly { icon: SettingsIconName; label: string; onPress: () => void }[];
    return (
        <View className="border-m3-outline-variant flex-row border-b">
            {cells.map((cell, index) => (
                <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
                    className={cn(
                        "border-m3-outline-variant min-h-24 flex-1 items-center gap-2 px-2 py-4",
                        index > 0 && "border-l"
                    )}
                    key={cell.icon}
                    onPress={cell.onPress}
                >
                    <HugeiconsIcon
                        color={m3.onSurfaceVariant}
                        icon={settingsIcon(cell.icon)}
                        size={24}
                        strokeWidth={1.6}
                    />
                    <Text className="text-body font-sans-medium text-m3-on-surface text-center leading-6">
                        {cell.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}
