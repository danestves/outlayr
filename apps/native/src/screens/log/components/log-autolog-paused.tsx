import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Alert } from "panelui-native/components/alert";
import { Pressable } from "react-native";

import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export function LogAutologPaused({ onPress, waiting }: { onPress: () => void; waiting: number }) {
    const t = useTranslation();
    const colors = useColors();
    const title = `${t("log.autolog.paused")} · ${t("log.autolog.waiting", { count: waiting })}`;
    return (
        <Pressable
            accessibilityLabel={title}
            accessibilityRole="button"
            className="my-2 active:opacity-60"
            onPress={onPress}
        >
            <Alert className="items-center" variant="destructive">
                <Alert.Indicator />
                <Alert.Content>
                    <Alert.Title>{title}</Alert.Title>
                </Alert.Content>
                <HugeiconsIcon color={colors.danger} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
            </Alert>
        </Pressable>
    );
}
