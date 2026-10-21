import { useNavigation, usePreventRemove, useRouter } from "expo-router";
import type { NativeStackNavigationProp } from "expo-router";
import type { ParamListBase } from "expo-router/react-navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { notifyEditsDiscarded } from "@/components/edits-discarded-snackbar";
import { useTranslation } from "@/i18n/context";

import type { useDiscardGuard as useDiscardGuardBase, SwipeDiscardRecovery } from "./use-discard-guard";

// react-native-screens ignores `preventNativeDismiss` on Android, so the guard stands down while a sheet drags. The
// screen leaves a commit after the guard lowers: in the same commit the derived `headerBackButtonMenuEnabled` update
// throws "ScreenStackFragment added into a non-stack container".
export const useDiscardGuard: typeof useDiscardGuardBase = <Draft>(recovery?: SwipeDiscardRecovery<Draft>) => {
    const router = useRouter();
    const t = useTranslation();
    const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
    const [dirty, setDirty] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [exit, setExit] = useState<(() => void) | null>(null);
    const latest = useRef({ dirty, recovery });
    useLayoutEffect(() => {
        latest.current = { dirty, recovery };
    });
    const hidden = useRef(false);
    const leaving = useRef(false);

    useEffect(
        () =>
            navigation.addListener("sheetDetentChange", ({ data: { index, stable } }) => {
                if (!stable) {
                    setDragging(true);
                    return;
                }
                if (index < 0) {
                    hidden.current = true;
                    const { dirty: unsaved, recovery: recover } = latest.current;
                    const draft = unsaved ? (recover?.snapshot() ?? null) : null;
                    if (draft !== null && recover !== undefined) {
                        notifyEditsDiscarded(() => recover.restore(draft));
                    }
                    return;
                }
                hidden.current = false;
                setDragging(false);
            }),
        [navigation]
    );

    const disablePrevention = usePreventRemove(dirty && !dragging, ({ repeat }) => {
        // A swiped sheet whose guard could not stand down in time is already hidden, so asking would strand it.
        if (hidden.current) {
            repeat();
            return;
        }
        // Unlike iOS a message is required: the Material dialog leaves an empty band without one.
        Alert.alert(
            t("common.discard.title"),
            t("common.discard.body"),
            [
                { style: "cancel", text: t("common.discard.keep") },
                {
                    onPress: () => {
                        setDirty(false);
                        setExit(() => repeat);
                    },
                    style: "destructive",
                    text: t("common.discard.confirm"),
                },
            ],
            { cancelable: true }
        );
    });

    useEffect(() => {
        exit?.();
    }, [exit]);

    const leave = () => {
        if (leaving.current) {
            return false;
        }
        leaving.current = true;
        setDirty(false);
        disablePrevention();
        setExit(() => () => router.back());
        return true;
    };

    return { leave, setDirty };
};
