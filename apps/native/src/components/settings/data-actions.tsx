import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import type { SettingsIconName } from "@/components/settings/settings-icons";
import { settingsIcon } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export interface DataActionsProps {
    onExport: () => void;
    onImport: () => void;
    onRestore: () => void;
}

export function DataActions({ onExport, onImport, onRestore }: DataActionsProps) {
    const t = useTranslation();
    const colors = useColors();
    const cells = [
        { icon: "FileInput", label: t("settings.controls.import"), onPress: onImport },
        { icon: "FileExport", label: t("settings.controls.export"), onPress: onExport },
        { icon: "ArchiveRestore", label: t("settings.controls.restore"), onPress: onRestore },
    ] satisfies readonly { icon: SettingsIconName; label: string; onPress: () => void }[];
    return (
        <View className="border-border flex-row border-b">
            {cells.map((cell, index) => (
                <Pressable
                    accessibilityRole="button"
                    className={cn(
                        "border-border min-h-24 flex-1 items-center gap-2 px-2 py-4 active:opacity-60",
                        index > 0 && "border-l"
                    )}
                    key={cell.icon}
                    onPress={cell.onPress}
                >
                    <HugeiconsIcon
                        color={colors.foreground}
                        icon={settingsIcon(cell.icon)}
                        size={22}
                        strokeWidth={1.9}
                    />
                    <Text className="text-subtitle font-sans-medium text-foreground text-center">{cell.label}</Text>
                </Pressable>
            ))}
        </View>
    );
}
