import ViewIcon from "@hugeicons-pro/core-stroke-rounded/ViewIcon";
import ViewOffSlashIcon from "@hugeicons-pro/core-stroke-rounded/ViewOffSlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { use } from "react";
import { Pressable, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { useDatabase } from "@/contexts/local-data-context";
import { setBoolSetting } from "@/data/settings-core";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { AmountsEyeButton as AmountsEyeButtonBase } from "./amounts-eye-button";

/** Parity with iOS; Android draws no glass. */
export const LOG_CONTROL_SIZE = "h-10 rounded-full";
export const LOG_CONTROL_SHADOW = {} as const;

const PRESSED_ALPHA = 0.1;

/** 40dp inside a 48dp touch frame, given back as negative margin. */
export const AmountsEyeButton: typeof AmountsEyeButtonBase = () => {
    const db = useDatabase();
    const t = useTranslation();
    const m3 = useMaterialColors();
    const hidden = use(AmountsHiddenContext);
    return (
        <Pressable
            accessibilityLabel={t(hidden ? "log.amounts.show" : "log.amounts.hide")}
            accessibilityRole="button"
            android_ripple={{ borderless: true, color: withAlpha(m3.onSecondaryContainer, PRESSED_ALPHA), radius: 20 }}
            className="-m-1 size-12 items-center justify-center"
            onPress={() => {
                setBoolSetting(db, "hideAmounts", !hidden);
            }}
        >
            <View className="bg-m3-secondary-container size-10 items-center justify-center rounded-full">
                <HugeiconsIcon
                    color={hidden ? m3.primary : m3.onSecondaryContainer}
                    icon={hidden ? ViewOffSlashIcon : ViewIcon}
                    size={22}
                    strokeWidth={1.8}
                />
            </View>
        </Pressable>
    );
};
