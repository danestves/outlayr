import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRef } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useMaterialColors } from "@/theme/use-material-colors";

// The swipe closes before `onDelete` runs, so a row that comes back from an undo is not left open.
export function SwipeToDelete({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const swipe = useRef<SwipeableMethods>(null);

    const renderRightActions = () => (
        <Pressable
            accessibilityLabel={t("common.delete")}
            accessibilityRole="button"
            className="bg-m3-error flex-row items-center justify-center gap-2 px-6"
            onPress={() => {
                swipe.current?.close();
                onDelete();
            }}
        >
            <HugeiconsIcon color={m3.onError} icon={Delete02Icon} size={20} />
            <Text className="font-sans-medium text-subtitle text-m3-on-error">{t("common.delete")}</Text>
        </Pressable>
    );

    return (
        <ReanimatedSwipeable
            friction={2}
            overshootRight={false}
            ref={swipe}
            renderRightActions={renderRightActions}
            rightThreshold={40}
        >
            {children}
        </ReanimatedSwipeable>
    );
}
