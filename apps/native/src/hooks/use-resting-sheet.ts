import { useNavigation } from "expo-router";
import type { NativeStackNavigationProp } from "expo-router";
import type { ParamListBase } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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

    const woke = useRef(false);
    const wake = () => {
        if (woke.current) {
            return;
        }
        woke.current = true;
        setAwake(true);
        AccessibilityInfo.announceForAccessibility(wakeAnnouncement);
    };
    const onDetentChange = useEffectEvent((index: number) => {
        if (index === 1) {
            wake();
        }
    });

    // oxlint-disable-next-line outlayr/react-effect-budget -- listens for the native sheet's detent change for the screen's lifetime
    useEffect(
        () =>
            navigation.addListener("sheetDetentChange", (event) => {
                onDetentChange(event.data.index);
            }),
        [navigation]
    );

    const restDetent = heightDetent(HEADER_HEIGHT + bodyHeight + REST_BOTTOM_ROOM + insets.bottom, windowHeight);
    const sheet = { sheetAllowedDetents: awake ? LARGE_ONLY : [restDetent, 1], sheetGrabberVisible: !awake };
    const rest: SheetRest | undefined = awake ? undefined : { onHeight: setBodyHeight, onWake: wake };

    return { awake, height: undefined, rest, sheet };
}
