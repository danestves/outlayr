import ViewIcon from "@hugeicons-pro/core-stroke-rounded/ViewIcon";
import ViewOffSlashIcon from "@hugeicons-pro/core-stroke-rounded/ViewOffSlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { use } from "react";
import { Pressable } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";
import { useColors } from "@/theme/use-colors";

export function AmountsEyeButton() {
    const db = useDatabase();
    const setBoolSetting = useAtomCommand(setBoolSettingCommand);
    const t = useTranslation();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    return (
        <Pressable
            accessibilityLabel={t(hidden ? "log.amounts.show" : "log.amounts.hide")}
            accessibilityRole="button"
            android_ripple={{ borderless: true, radius: 20 }}
            className="h-9 w-11 items-center justify-center active:opacity-60"
            onPress={() => {
                setBoolSetting({ db, key: "hideAmounts", value: !hidden });
            }}
        >
            <HugeiconsIcon
                color={hidden ? colors.tint : colors.muted}
                icon={hidden ? ViewOffSlashIcon : ViewIcon}
                size={18}
                strokeWidth={1.8}
            />
        </Pressable>
    );
}
