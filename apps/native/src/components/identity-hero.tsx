import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { LAUNCH_SPRING, useIdentityFlyUp } from "@/contexts/identity-draft-context";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryIconTile } from "./category-icon-tile";
import { IdentityHeroSymbol } from "./identity-hero-symbol";
import { Text } from "./text";

const TILE = 90;
export const HERO_RING = TILE + 12;
const BADGE = 26;
const RADIUS = 20;

export const FLOAT_TILE = 164;
const FLOAT_SCALE = FLOAT_TILE / TILE;

/** Response 0.25, dampingFraction 0.7, converted to stiffness/damping. */
const PRESS_SPRING = { damping: 35, mass: 1, stiffness: 631 } as const;

/**
 * Read by both heroes so exactly one tile is drawn. 0.01 is Reanimated's `restDisplacementThreshold`,
 * so the swap never lands on a frame the spring is about to snap.
 */
const SWAP_EPS = 0.01;
const POP_SCALE = 1.06;
const POP_FADE_MS = 160;

export type HeroVariant = "transaction" | "category";

/** Sparkle offsets from the tile CENTRE, per variant. */
const SPARKLES = {
    category: { large: [-62, -30], small: [60, 8] },
    transaction: { large: [-53, -33], small: [51, 8] },
} as const;

/** The category caption is absolute, so the form's `captionClearance` reserves its room, not this gap. */
const CAPTION_GAP = { category: 8, transaction: 12 } as const;

const A11Y = {
    category: {
        hint: "transaction.identity.hero.iconHint",
        reset: "transaction.identity.hero.removeIcon",
        tile: "transaction.identity.hero.icon",
    },
    transaction: {
        hint: "transaction.identity.hero.logoHint",
        reset: "transaction.identity.hero.removeLogo",
        tile: "transaction.identity.hero.logo",
    },
} satisfies Record<
    HeroVariant,
    {
        readonly tile: TranslationKey;
        readonly hint: TranslationKey;
        readonly reset: TranslationKey;
    }
>;

const EMPTY_CAPTION = {
    category: "transaction.identity.hero.chooseIcon",
    transaction: "transaction.identity.hero.logo",
} satisfies Record<HeroVariant, TranslationKey>;

interface IdentityHeroProps {
    color: string | null;
    emoji: string | null;
    /**
     * A shared value: it is measured after the flight starts, and a prop change would rebuild the style
     * mid-flight and jump the tile.
     */
    floatOffsetY?: SharedValue<number>;
    /** 0 rests in the form, 1 floats over the open picker; past {@link SWAP_EPS} the twin is drawn instead. */
    floatProgress?: SharedValue<number>;
    icon: string | null;
    income: boolean;
    isFloat?: boolean;
    onPress?: () => void;
    onReset?: () => void;
    photoUri: string | null;
    variant?: HeroVariant;
}

export function IdentityHero({
    emoji,
    icon,
    photoUri,
    color,
    income,
    floatProgress,
    floatOffsetY,
    isFloat = false,
    variant = "transaction",
    onPress,
    onReset,
}: IdentityHeroProps) {
    const colors = useColors();
    const t = useTranslation();
    const { pickerOpen } = useIdentityFlyUp();
    const tint = color ?? (income ? colors.income : colors.foreground);
    const isEmpty = !(emoji || icon || photoUri);

    const pressScale = useSharedValue(1);
    const pressOpacity = useSharedValue(1);
    const popScale = useSharedValue(1);
    const contentOpacity = useSharedValue(1);
    const float = floatProgress;

    const wasEmpty = useRef(isEmpty);
    const identity = `${emoji}|${icon}|${photoUri}|${color}`;
    // `pickerOpen` gates the pop because both forms seed the draft in a mount effect, which looks like a pick.
    // Reads `isEmpty` and `pickerOpen` at change time; depending on them would re-pop when the picker toggles.
    const onIdentityChange = useEffectEvent((_identity: string) => {
        const becameEmpty = isEmpty && !wasEmpty.current;
        wasEmpty.current = isEmpty;
        if (becameEmpty) {
            contentOpacity.set(0);
            contentOpacity.set(withSpring(1, LAUNCH_SPRING));
            return;
        }
        if (isEmpty || !pickerOpen) {
            return;
        }
        popScale.set(withSequence(withSpring(POP_SCALE, PRESS_SPRING), withSpring(1, PRESS_SPRING)));
        contentOpacity.set(0);
        contentOpacity.set(withTiming(1, { duration: POP_FADE_MS }));
    });
    useEffect(() => {
        onIdentityChange(identity);
    }, [identity]);

    const rootStyle = useAnimatedStyle(() => {
        const floated = (float?.value ?? 0) > SWAP_EPS;
        return { opacity: (isFloat ? floated : !floated) ? 1 : 0 };
    });

    const tileStyle = useAnimatedStyle(() => {
        if (isFloat) {
            const p = float?.value ?? 0;
            const grown = 1 + p * (FLOAT_SCALE - 1);
            return {
                opacity: contentOpacity.get(),
                transform: [{ translateY: p * (floatOffsetY?.value ?? 0) }, { scale: grown * popScale.get() }],
            };
        }
        return {
            opacity: pressOpacity.get() * contentOpacity.get(),
            transform: [{ scale: pressScale.get() * popScale.get() }],
        };
    });

    const tile = (
        <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
            <HeroGlyph
                colors={colors}
                emoji={emoji}
                icon={icon}
                isEmpty={isEmpty}
                photoUri={photoUri}
                tint={tint}
                variant={variant}
            />
        </View>
    );

    const plusBadge = (
        <View
            style={{
                alignItems: "center",
                backgroundColor: colors.foreground,
                borderRadius: BADGE / 2,
                bottom: -1,
                height: BADGE,
                justifyContent: "center",
                position: "absolute",
                right: -1,
                width: BADGE,
            }}
        >
            <HugeiconsIcon color={colors.background} icon={PlusSignIcon} size={14} strokeWidth={2.4} />
        </View>
    );

    return (
        <Animated.View
            pointerEvents={isFloat ? "none" : "auto"}
            style={[
                {
                    alignItems: "center",
                    gap: variant === "category" ? 0 : CAPTION_GAP.transaction,
                },
                rootStyle,
            ]}
        >
            <Animated.View style={tileStyle}>
                {isFloat ? (
                    <View style={{ height: HERO_RING, width: HERO_RING }}>
                        {tile}
                        {isEmpty ? plusBadge : null}
                    </View>
                ) : (
                    <View style={{ height: HERO_RING, width: HERO_RING }}>
                        <Pressable
                            accessibilityHint={t(A11Y[variant].hint)}
                            accessibilityLabel={t(A11Y[variant].tile)}
                            accessibilityRole="button"
                            onPress={onPress}
                            onPressIn={() => {
                                pressScale.set(withSpring(0.96, PRESS_SPRING));
                                pressOpacity.set(withSpring(0.85, PRESS_SPRING));
                            }}
                            onPressOut={() => {
                                pressScale.set(withSpring(1, PRESS_SPRING));
                                pressOpacity.set(withSpring(1, PRESS_SPRING));
                            }}
                            style={{ height: HERO_RING, width: HERO_RING }}
                        >
                            {tile}
                            {isEmpty ? plusBadge : null}
                        </Pressable>
                        {isEmpty ? null : (
                            <Pressable
                                accessibilityLabel={t(A11Y[variant].reset)}
                                accessibilityRole="button"
                                hitSlop={8}
                                onPress={onReset}
                                style={{
                                    alignItems: "center",
                                    backgroundColor: colors.danger,
                                    borderRadius: BADGE / 2,
                                    height: BADGE,
                                    justifyContent: "center",
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    width: BADGE,
                                }}
                            >
                                <HugeiconsIcon color="#FFFFFF" icon={Cancel01Icon} size={13} strokeWidth={2.4} />
                            </Pressable>
                        )}
                    </View>
                )}
            </Animated.View>

            {/* A filled category hero has no caption; the transaction one switches copy. */}
            {isFloat || (variant === "category" && !isEmpty) ? null : (
                <Text
                    className="font-sans-medium text-footnote text-muted"
                    style={
                        variant === "category" && {
                            alignSelf: "center",
                            position: "absolute",
                            top: HERO_RING + CAPTION_GAP.category,
                        }
                    }
                >
                    {t(isEmpty ? EMPTY_CAPTION[variant] : "transaction.identity.hero.tapToChange")}
                </Text>
            )}
        </Animated.View>
    );
}

function HeroGlyph({
    isEmpty,
    photoUri,
    icon,
    emoji,
    tint,
    colors,
    variant,
}: {
    isEmpty: boolean;
    photoUri: string | null;
    icon: string | null;
    emoji: string | null;
    tint: string;
    colors: ReturnType<typeof useColors>;
    variant: HeroVariant;
}) {
    if (isEmpty) {
        return <EmptyTile colors={colors} variant={variant} />;
    }
    if (photoUri) {
        return <PhotoTile border={withAlpha(colors.foreground, 0.14)} uri={photoUri} />;
    }
    if (icon) {
        return <CategoryIconTile color={tint} icon={icon} size={TILE} />;
    }
    return <EmojiTile emoji={emoji ?? ""} tint={tint} />;
}

function PhotoTile({ uri, border }: { uri: string; border: string }) {
    return (
        <View style={{ height: TILE, width: TILE }}>
            <Image contentFit="cover" source={{ uri }} style={{ borderRadius: RADIUS, height: TILE, width: TILE }} />
            <View
                style={{
                    borderColor: border,
                    borderRadius: RADIUS,
                    borderWidth: 1.5,
                    height: TILE,
                    position: "absolute",
                    width: TILE,
                }}
            />
        </View>
    );
}

function EmojiTile({ emoji, tint }: { emoji: string; tint: string }) {
    return (
        <View
            style={{
                alignItems: "center",
                backgroundColor: withAlpha(tint, 0.22),
                borderRadius: RADIUS,
                height: TILE,
                justifyContent: "center",
                width: TILE,
            }}
        >
            {/* Sized off `CategoryIconTile`'s large icon size, not off the tile. */}
            <Text className="text-[42px]">{emoji}</Text>
        </View>
    );
}

function EmptyTile({ colors, variant }: { colors: ReturnType<typeof useColors>; variant: HeroVariant }) {
    const fillId = useId();
    const isCategory = variant === "category";
    const [sparkleLarge, sparkleSmall] = [SPARKLES[variant].large, SPARKLES[variant].small];
    return (
        <View
            style={{
                alignItems: "center",
                height: HERO_RING,
                justifyContent: "center",
                width: HERO_RING,
            }}
        >
            <Svg height={TILE} style={{ position: "absolute" }} width={TILE}>
                <Defs>
                    <RadialGradient
                        cx={TILE * 0.35}
                        cy={TILE * 0.28}
                        gradientUnits="userSpaceOnUse"
                        id={fillId}
                        r={TILE * 0.7}
                    >
                        <Stop offset="0" stopColor={colors.muted} stopOpacity={0.1} />
                        <Stop offset="1" stopColor={colors.muted} stopOpacity={0.04} />
                    </RadialGradient>
                </Defs>
                <Rect
                    fill={isCategory ? colors.muted : `url(#${fillId})`}
                    fillOpacity={isCategory ? 0.05 : 1}
                    height={TILE}
                    rx={RADIUS}
                    ry={RADIUS}
                    width={TILE}
                    x={0}
                    y={0}
                />
                {/* Ink rather than muted: at 0.32 grey the well read as a disabled box. */}
                <Rect
                    fill="none"
                    height={TILE - 1.8}
                    rx={RADIUS - 0.9}
                    ry={RADIUS - 0.9}
                    stroke={withAlpha(colors.foreground, 0.85)}
                    strokeDasharray="5 5"
                    strokeWidth={1.8}
                    width={TILE - 1.8}
                    x={0.9}
                    y={0.9}
                />
            </Svg>

            {/* A category is an icon or an emoji, never a photo. */}
            {isCategory ? null : (
                <IdentityHeroSymbol
                    name="photo"
                    size={30}
                    tintColor={colors.muted}
                    type="monochrome"
                    weight="regular"
                />
            )}

            <IdentityHeroSymbol
                name="sparkle"
                size={12}
                style={{
                    height: 12,
                    left: HERO_RING / 2 + sparkleLarge[0] - 6,
                    position: "absolute",
                    top: HERO_RING / 2 + sparkleLarge[1] - 6,
                    width: 12,
                }}
                tintColor={colors.muted}
                type="monochrome"
            />
            <IdentityHeroSymbol
                name="sparkle"
                size={9}
                style={{
                    height: 9,
                    left: HERO_RING / 2 + sparkleSmall[0] - 4.5,
                    position: "absolute",
                    top: HERO_RING / 2 + sparkleSmall[1] - 4.5,
                    width: 9,
                }}
                tintColor={colors.muted}
                type="monochrome"
            />
        </View>
    );
}
