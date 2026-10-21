import { usePreventRemove, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert } from "react-native";

import { useTranslation } from "@/i18n/context";

// Android only: a sheet there cannot refuse the swipe, so the guard lets it go and offers the edits back with Undo.
export interface SwipeDiscardRecovery<Draft> {
    snapshot: () => Draft | null;
    restore: (draft: Draft) => void;
}

// `leave` goes once: a second call returns false, or it would go back again from the screen underneath.
export function useDiscardGuard<Draft>(_recovery?: SwipeDiscardRecovery<Draft>) {
    const router = useRouter();
    const t = useTranslation();
    const [dirty, setDirty] = useState(false);
    const leaving = useRef(false);

    const disablePrevention = usePreventRemove(dirty, ({ repeat }) => {
        Alert.alert(t("common.discard.title"), undefined, [
            { style: "cancel", text: t("common.discard.keep") },
            {
                onPress: () => {
                    setDirty(false);
                    repeat();
                },
                style: "destructive",
                text: t("common.discard.confirm"),
            },
        ]);
    });

    const leave = () => {
        if (leaving.current) {
            return false;
        }
        leaving.current = true;
        setDirty(false);
        disablePrevention();
        router.back();
        return true;
    };

    return { leave, setDirty };
}
