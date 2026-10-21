import { useNavigation } from "expo-router";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
    useAnimatedReaction,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { useIdentityFlyUp } from "@/contexts/identity-draft-context";
import { floatTargetY } from "@/domain/identity-flyup-geometry";

import { FLOAT_TILE, HERO_RING, IdentityHero } from "./identity-hero";
import type { HeroVariant } from "./identity-hero";

export { HERO_RING } from "./identity-hero";

const HERO_HALF = FLOAT_TILE / 2;
// Before the sheet first reports a height. Mirrors `sheetAllowedDetents: [0.5, 1]` in `app/_layout.tsx`.
const FIRST_OPEN_DETENT_FRACTION = 0.5;

// Derived, not computed in render: both inputs land late and out of order, and a plain number would rebuild the
// animated style mid-flight and jump the tile.
function useFloatOffset({
    containerHeight,
    restCenterY,
}: {
    containerHeight: SharedValue<number>;
    restCenterY: SharedValue<number>;
}): SharedValue<number> {
    const { sheetHeight } = useIdentityFlyUp();
    // The window is the floor: `containerHeight` comes from one `onLayout`, so a reset without a relayout leaves 0,
    // which zeroes the travel and kills the animation.
    const { height: windowHeight } = useWindowDimensions();
    return useDerivedValue(() => {
        // NaN, never <= 0, means unmeasured: a scrolled hero's form-local centre is legitimately negative.
        if (Number.isNaN(restCenterY.get())) {
            return 0;
        }
        const container = containerHeight.get() > 0 ? containerHeight.get() : windowHeight;
        const sheet = sheetHeight.value > 0 ? sheetHeight.value : container * FIRST_OPEN_DETENT_FRACTION;
        return (
            floatTargetY({
                containerHeight: container,
                heroHalf: HERO_HALF,
                sheetHeight: sheet,
            }) - restCenterY.get()
        );
    });
}

interface IdentityFlyUpLayerProps {
    color: string | null;
    containerHeight: SharedValue<number>;
    emoji: string | null;
    icon: string | null;
    income: boolean;
    /** Called after the return spring has already been started. */
    onDismiss: () => void;
    photoUri: string | null;
    /**
     * Where the hero's ring rests now, in form-local points. Live as the form scrolls and read on the UI thread;
     * the layer latches it for the flight.
     */
    restTop: SharedValue<number>;
    variant?: HeroVariant;
}

export function IdentityFlyUpLayer({
    restTop,
    containerHeight,
    emoji,
    icon,
    photoUri,
    color,
    income,
    variant = "transaction",
    onDismiss,
}: IdentityFlyUpLayerProps) {
    const { pickerOpen, setPickerOpen, floatProgress } = useIdentityFlyUp();

    // Latched for the flight: `restTop` is live, and a mid-flight reading would move the launch point and jerk the
    // tile. Keyed on `floatProgress`, not `pickerOpen`, so it stays on the UI thread and outlives the state flip.
    const restLaunchTop = useSharedValue(Number.NaN);
    useAnimatedReaction(
        () => (floatProgress.value === 0 ? restTop.get() : null),
        (resting) => {
            if (resting !== null) {
                restLaunchTop.set(resting);
            }
        }
    );
    // The reaction only fires once the prepared value changes, so the first reading is taken here.
    useEffect(() => {
        if (Number.isNaN(restLaunchTop.get())) {
            restLaunchTop.set(restTop.get());
        }
    }, [restLaunchTop, restTop]);

    const restCenterY = useDerivedValue(() => restLaunchTop.get() + HERO_RING / 2);
    const floatOffsetY = useFloatOffset({ containerHeight, restCenterY });

    // `pickerOpen` lives in the app-level provider and outlives every screen: left true, it strands an invisible
    // scrim on the next screen that swallows every tap.
    useEffect(() => {
        setPickerOpen(false);
    }, [setPickerOpen]);

    // `translateY`, not `top`: this tracks the hero every scroll frame. The hero's fly-up transform lives on a
    // descendant inside `IdentityHero`, so the two stack instead of colliding.
    const twinStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: restLaunchTop.get() }],
    }));

    return (
        <>
            {/* Transparent: the blur is SwiftUI's own inside each `Host`, so this only dismisses and shields. */}
            {pickerOpen ? (
                <Pressable
                    // A childless full-screen `Pressable` would be an empty element parked over the form; screen
                    // readers dismiss through the sheet's own close.
                    accessible={false}
                    className="absolute inset-0"
                    onPress={() => {
                        setPickerOpen(false);
                        onDismiss();
                    }}
                />
            ) : null}

            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        alignItems: "center",
                        left: 0,
                        position: "absolute",
                        right: 0,
                        top: 0,
                    },
                    twinStyle,
                ]}
            >
                <IdentityHero
                    color={color}
                    emoji={emoji}
                    floatOffsetY={floatOffsetY}
                    floatProgress={floatProgress}
                    icon={icon}
                    income={income}
                    isFloat
                    photoUri={photoUri}
                    variant={variant}
                />
            </Animated.View>
        </>
    );
}

interface DismissalEvent {
    data?: { closing?: boolean };
}
interface DismissalNavigation {
    addListener: (type: string, listener: (event: DismissalEvent) => void) => () => void;
}

const NOOP = () => {
    // An unsupported listener name leaves nothing to unsubscribe from.
};

function listen(navigation: DismissalNavigation, type: string, listener: (event: DismissalEvent) => void): () => void {
    try {
        return navigation.addListener(type, listener) ?? NOOP;
    } catch {
        return NOOP;
    }
}

// Needs fractional `sheetAllowedDetents`, screens' `synchronousScreenUpdatesEnabled` and a plain `View`, or the height
// silently stops arriving. `transitionStart` (not contractual in expo-router's fork) closes the picker at a dismissal's
// start, both ways since a cancelled drag puts the sheet back; the unmount cleanup is the backstop.
export function IdentityFlyUpSheetHost({ children }: { children: ReactNode }) {
    const navigation = useNavigation<DismissalNavigation>();
    const { setPickerOpen, setSheetHeight } = useIdentityFlyUp();

    useEffect(() => {
        setPickerOpen(true);
        const unsubscribe = listen(navigation, "transitionStart", (event) => {
            const closing = event.data?.closing;
            if (closing !== undefined) {
                setPickerOpen(!closing);
            }
        });
        return () => {
            unsubscribe();
            setPickerOpen(false);
        };
    }, [navigation, setPickerOpen]);

    return (
        <View onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)} style={{ flex: 1 }}>
            {children}
        </View>
    );
}
