import type { MenuAction, NativeActionEvent } from "@expo/ui/community/menu";
import StarSolidIcon from "@hugeicons-pro/core-solid-rounded/StarIcon";
import StarIcon from "@hugeicons-pro/core-stroke-rounded/StarIcon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { CURRENCY_META } from "@outlayr/money/catalog";
import { useRef } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
    Easing,
    ReduceMotion,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    ZoomIn,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { CurrencyCode } from "@/domain/currency-picker-rows";
import { FAVOURITE_CURRENCY_LIMIT } from "@/domain/favourite-currencies";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

import { StretchedMenuView } from "./action-menu";
import { MonoLabel } from "./mono-label";
import { Text } from "./text";
import { cn } from "./tw";

const EASE = Easing.bezier(0.645, 0.045, 0.355, 1);

export function CurrencySectionHeader({ section }: { section: "favourites" | "all" }) {
    const t = useTranslation();
    return (
        <MonoLabel className="pt-4 pb-1">
            {t(section === "favourites" ? "settings.currency.favourites" : "settings.currency.all")}
        </MonoLabel>
    );
}

export function CurrencyHint() {
    const t = useTranslation();
    return <Text className="text-footnote text-muted pb-3">{t("settings.currency.favouritesHint")}</Text>;
}

// Only the tick animates on entry: an entering animation on the rows would fire on every row scrolling into view.
const TICK_ARRIVES = ZoomIn.duration(240).easing(EASE.factory()).reduceMotion(ReduceMotion.System);

// `bg-background` is required: UIKit snapshots the context-menu trigger for its platter, and a transparent one
// composites the preview over the row beneath.
const ROW_SURFACE = "flex-row items-center gap-3 bg-background py-3";

const ROW_RULE = "border-border border-b";

const HELD_BACK = { opacity: 0 } as const;

const LANE_WIDTH = 96;

/** `ReanimatedSwipeable` has no `allowsFullSwipe`, so it is rebuilt here. */
const FULL_SWIPE_FRACTION = 0.45;

function SwipeAction({
    accessibilityHint,
    accessibilityLabel,
    fillClassName,
    icon,
    iconColor,
    label,
    labelClassName,
    onArm,
    onPress,
    translation,
}: {
    accessibilityHint?: string;
    accessibilityLabel: string;
    fillClassName: string;
    icon: IconSvgElement;
    iconColor: string;
    label: string;
    labelClassName: string;
    onArm: (armed: boolean) => void;
    onPress: () => void;
    translation: SharedValue<number>;
}) {
    const { width } = useWindowDimensions();
    const threshold = width * FULL_SWIPE_FRACTION;
    const armed = useSharedValue(false);

    // Reports crossings only. Acting mid-drag freezes the row: the close is undone
    // when the gesture settles the lane open, and it can only close again after.
    useAnimatedReaction(
        () => translation.get() <= -threshold,
        (next) => {
            if (next !== armed.get()) {
                armed.set(next);
                scheduleOnRN(onArm, next);
            }
        }
    );

    const style = useAnimatedStyle(() => ({
        width: Math.max(LANE_WIDTH, -translation.get() - 12),
    }));

    // The lane follows the finger, but only this says when the threshold has been passed.
    const glyph = useAnimatedStyle(() => ({
        transform: [
            {
                scale: withTiming(translation.get() <= -threshold ? 1.35 : 1, {
                    duration: 160,
                    easing: EASE,
                }),
            },
        ],
    }));

    return (
        <Animated.View className="my-1 ml-3" style={style}>
            <Pressable
                accessibilityHint={accessibilityHint}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                className={cn("flex-1 items-center justify-center gap-1 rounded-xl", fillClassName)}
                onPress={onPress}
            >
                <Animated.View style={glyph}>
                    <HugeiconsIcon color={iconColor} icon={icon} size={18} strokeWidth={2} />
                </Animated.View>
                <Text className={cn("font-sans-semibold text-footnote", labelClassName)}>{label}</Text>
            </Pressable>
        </Animated.View>
    );
}

function CurrencyRowFace({
    code,
    selected,
    tickEnters,
}: {
    code: CurrencyCode;
    selected: boolean;
    tickEnters: boolean;
}) {
    const colors = useColors();
    const meta = CURRENCY_META[code];

    return (
        <>
            <View className="w-9 items-center">
                <Text className="text-body text-muted tabular-nums">{meta.symbol}</Text>
            </View>
            <View className="flex-1">
                <Text className="text-body text-foreground">{code}</Text>
                <Text className="text-footnote text-muted" numberOfLines={1}>
                    {meta.name}
                </Text>
            </View>
            <View className="w-5 items-center">
                {selected ? (
                    <Animated.View entering={tickEnters ? TICK_ARRIVES : undefined}>
                        <HugeiconsIcon color={colors.tint} icon={Tick02Icon} size={20} strokeWidth={2.4} />
                    </Animated.View>
                ) : null}
            </View>
        </>
    );
}

export function CurrencyRowCopy({ code, selected }: { code: CurrencyCode; selected: boolean }) {
    return (
        <View className={ROW_SURFACE}>
            <CurrencyRowFace code={code} selected={selected} tickEnters={false} />
        </View>
    );
}

function swipeLaneFill(refuses: boolean, favourite: boolean): string {
    if (refuses) {
        return "bg-surface-secondary";
    }
    return favourite ? "bg-danger-fill" : "bg-gold-fill";
}

interface CurrencyRowProps {
    code: CurrencyCode;
    favourite: boolean;
    full: boolean;
    /** Last of its section, so it draws no separator beneath itself. */
    last: boolean;
    onPress: () => void;
    /** `null` while no database is open, so favouriting is absent rather than dead. */
    onToggleFavourite: (() => void) | null;
    selected: boolean;
    /** Held back while the list flies a copy of this row to its new section. */
    travelling: boolean;
}

export function CurrencyRow({
    code,
    favourite,
    last,
    selected,
    full,
    travelling,
    onPress,
    onToggleFavourite,
}: CurrencyRowProps) {
    const colors = useColors();
    const haptics = useHaptics();
    const t = useTranslation();
    const swipeRef = useRef<SwipeableMethods>(null);
    const armedFullSwipe = useRef(false);
    const { name, symbol } = CURRENCY_META[code];

    const refuses = !favourite && full;
    const fullLabel = t("settings.currency.favouritesFull", {
        limit: FAVOURITE_CURRENCY_LIMIT,
    });
    const laneFill = swipeLaneFill(refuses, favourite);

    // Answers only the refusal this row can already see. `full` comes from a live
    // query, so two rows pressed a tick apart at seven favourites both render as
    // not-full; the caller owns the outcome haptic because only the write knows.
    const commit = () => {
        swipeRef.current?.close();
        if (refuses) {
            haptics("warning");
            return;
        }
        onToggleFavourite?.();
    };

    const renderRightActions = (_progress: SharedValue<number>, translation: SharedValue<number>) => (
        <SwipeAction
            accessibilityHint={refuses ? t("settings.currency.favouritesFullBody") : undefined}
            accessibilityLabel={
                refuses
                    ? fullLabel
                    : t(favourite ? "settings.currency.unfavourite" : "settings.currency.favourite", { code })
            }
            fillClassName={laneFill}
            icon={favourite || refuses ? StarIcon : StarSolidIcon}
            iconColor={refuses ? colors.muted : "#ffffff"}
            label={
                refuses
                    ? t("settings.currency.favouritesFullShort", {
                          limit: FAVOURITE_CURRENCY_LIMIT,
                      })
                    : t(favourite ? "settings.currency.unfavouriteAction" : "settings.currency.favouriteAction")
            }
            labelClassName={refuses ? "text-muted" : "text-white"}
            onArm={(armed) => {
                armedFullSwipe.current = armed;
            }}
            onPress={commit}
            translation={translation}
        />
    );

    const actions: MenuAction[] = [];
    if (onToggleFavourite !== null) {
        actions.push({
            attributes: refuses ? { disabled: true } : undefined,
            id: "favourite",
            image: favourite ? "star.slash" : "star",
            title: refuses
                ? fullLabel
                : t(favourite ? "settings.currency.unfavourite" : "settings.currency.favourite", { code }),
        });
    }
    actions.push({
        id: "use",
        state: selected ? "on" : "off",
        title: t("settings.currency.use", { code }),
    });

    const onPressAction = ({ nativeEvent }: NativeActionEvent) => {
        if (nativeEvent.event === "use") {
            onPress();
            return;
        }
        commit();
    };

    return (
        <ReanimatedSwipeable
            containerStyle={travelling ? HELD_BACK : undefined}
            friction={1}
            // On release rather than mid-drag: see `SwipeAction`.
            onSwipeableWillOpen={() => {
                if (!armedFullSwipe.current) {
                    return;
                }
                armedFullSwipe.current = false;
                commit();
            }}
            // Without overshoot `translation` clamps at the lane's width and can
            // never reach the full-swipe threshold.
            overshootFriction={1}
            ref={swipeRef}
            renderRightActions={onToggleFavourite === null ? undefined : renderRightActions}
            rightThreshold={40}
        >
            {/* Not swift-ui's ContextMenu: its per-row `Host` cannot fill the parent's width, so each row sat as its
                own inset card. */}
            <StretchedMenuView
                actions={actions}
                onPressAction={onPressAction}
                shouldOpenOnLongPress
                title={refuses ? t("settings.currency.favouritesFullBody") : undefined}
            >
                <Pressable
                    accessibilityLabel={[...new Set([symbol, code, name])].join(", ")}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={cn(ROW_SURFACE, last ? undefined : ROW_RULE, "active:opacity-60")}
                    onPress={onPress}
                >
                    <CurrencyRowFace code={code} selected={selected} tickEnters />
                </Pressable>
            </StretchedMenuView>
        </ReanimatedSwipeable>
    );
}
