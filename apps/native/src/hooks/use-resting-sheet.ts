import { useNavigation } from "expo-router";
import type { NativeStackNavigationProp } from "expo-router";
import type { ParamListBase } from "expo-router/react-navigation";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HEADER_HEIGHT } from "@/components/editor-style";
import { heightDetent, LARGE_ONLY } from "@/lib/sheet-detents";

const REST_BODY_ESTIMATE = 170;
const REST_BOTTOM_ROOM = 8;

export interface SheetRest {
    onHeight: (height: number) => void;
    onWake: () => void;
}

export function useRestingSheet(wakeAnnouncement: string) {
    const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [awake, setAwake] = useState(false);
    const [bodyHeight, setBodyHeight] = useState(REST_BODY_ESTIMATE);

    useEffect(
        () =>
            navigation.addListener("sheetDetentChange", (event) => {
                if (event.data.index === 1) {
                    setAwake(true);
                }
            }),
        [navigation]
    );

    useEffect(() => {
        if (awake) {
            AccessibilityInfo.announceForAccessibility(wakeAnnouncement);
        }
    }, [awake, wakeAnnouncement]);

    const restDetent = heightDetent(HEADER_HEIGHT + bodyHeight + REST_BOTTOM_ROOM + insets.bottom, windowHeight);
    const sheet = useMemo(
        () => ({ sheetAllowedDetents: awake ? LARGE_ONLY : [restDetent, 1], sheetGrabberVisible: !awake }),
        [awake, restDetent]
    );
    const rest: SheetRest | undefined = awake ? undefined : { onHeight: setBodyHeight, onWake: () => setAwake(true) };

    return { awake, height: undefined, rest, sheet };
}
