import ViewIcon from "@hugeicons-pro/core-stroke-rounded/ViewIcon";
import ViewOffSlashIcon from "@hugeicons-pro/core-stroke-rounded/ViewOffSlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { GlassButton } from "@/components/glass-button";
import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";
import { useColors } from "@/theme/use-colors";

export const LOG_CONTROL_SIZE = "h-9.5 rounded-full";
export const LOG_CONTROL_SHADOW = { borderRadius: 19, boxShadow: "0 3px 10px rgba(23, 21, 15, 0.1)" } as const;

export function AmountsEyeButton() {
    const db = useDatabase();
    const setBoolSetting = useAtomCommand(setBoolSettingCommand);
    const t = useTranslation();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    return (
        <View style={LOG_CONTROL_SHADOW}>
            <GlassButton
                accessibilityLabel={t(hidden ? "log.amounts.show" : "log.amounts.hide")}
                className={`${LOG_CONTROL_SIZE} w-9.5`}
                onPress={() => {
                    setBoolSetting({ db, key: "hideAmounts", value: !hidden });
                }}
            >
                <HugeiconsIcon
                    color={hidden ? colors.tint : colors.foreground}
                    icon={hidden ? ViewOffSlashIcon : ViewIcon}
                    size={19}
                    strokeWidth={1.8}
                />
            </GlassButton>
        </View>
    );
}
