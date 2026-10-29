import { Pressable } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import { Text } from "@/components/text";
import type { AutoLogSource } from "@/hooks/use-auto-log-sources";
import { useTranslation } from "@/i18n/context";

export function AutoLogSourceRow({ source }: { source: AutoLogSource }) {
    const t = useTranslation();
    const { detail, icon, on, onSetUp, title } = source;
    const row = (
        <RowShell detail={detail} icon={icon} title={title}>
            {on ? (
                <Text className="text-income text-body">{t("common.on")}</Text>
            ) : (
                <Text className="text-tint text-body">{t("onboarding.autoLog.setUp")}</Text>
            )}
        </RowShell>
    );

    if (on || !onSetUp) {
        return row;
    }

    return (
        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={onSetUp}>
            {row}
        </Pressable>
    );
}
