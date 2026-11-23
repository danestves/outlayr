import { usePreventRemove, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useRef, useState } from "react";
import { Alert } from "react-native";

import { useTranslation } from "@/i18n/context";

// Android only: a sheet there cannot refuse the swipe, so the guard lets it go and offers the edits back with Undo.
export interface SwipeDiscardRecovery<Draft> {
    snapshot: () => Draft | null;
    restore: (draft: Draft) => void;
}

// `leave` goes once: a second call returns false, or it would go back again from the screen underneath.
export function useDiscardGuard<Draft>(_recovery?: SwipeDiscardRecovery<Draft>, startDirty = false) {
    const router = useRouter();
    const t = useTranslation();
    const [dirty, setDirty] = useState(startDirty);
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

    const go = (navigate: () => void) => {
        if (leaving.current) {
            return false;
        }
        leaving.current = true;
        setDirty(false);
        disablePrevention();
        navigate();
        return true;
    };

    const leave = () => go(() => router.back());

    // Moves the draft to another screen in this one's place, so there is nothing to discard.
    const handOff = (href: Href) => go(() => router.replace(href));

    return { handOff, leave, setDirty };
}
