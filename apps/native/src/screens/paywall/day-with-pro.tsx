import FlashIcon from "@hugeicons-pro/core-solid-rounded/FlashIcon";
import Mic01Icon from "@hugeicons-pro/core-solid-rounded/Mic01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { FlowAmount, RowAmount } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Sentence } from "@/components/sentence/sentence";
import { SENTENCE_DRAW } from "@/components/sentence/sentence-motion";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatTime } from "@/domain/dates";
import { currencySymbol, formatAmount, symbolPrefix } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useOnMount, useTimers } from "@/lib/lifecycle";
import { useColors } from "@/theme/use-colors";

const EASE = Easing.bezier(0.645, 0.045, 0.355, 1);
const RISE = 10;
const USD = "USD";
const EUR = "EUR";
const EUR_IN_USD = 1.08;

const CAFE = { amount: 4.5, color: "#AB723A", icon: "Coffee02" } as const;
const MARKET_USD = 23.4;
const METRO_EUR = 2.5;
const RECEIPT_LINES = [2.49, 3.8, 4.2, 8.9, 3.1, 0.91] as const;
const NET = Math.round((CAFE.amount + MARKET_USD + METRO_EUR * EUR_IN_USD) * 100) / 100;
const ENTRIES = 3;

// One scripted pass, then it holds: a loop would repaint the paywall for as long as it stays open.
const BEAT = {
    alert: 150,
    logged: 850,
    receipt: 1600,
    scan: 1900,
    read: 2750,
    voice: 3400,
    sentence: 4250,
    net: 5200,
} as const;

const TIMES = { bank: [8, 12], net: [21, 30], receipt: [12, 40], voice: [15, 5] } as const;

const WAVE = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.45, 0.8, 0.6, 0.95, 0.4, 0.7, 0.55, 0.85, 0.3, 0.65, 0.5, 0.25] as const;
const WAVE_STEP_MS = 40;
const RECEIPT_HEIGHT = 132;
const SCAN_MS = 800;

function useBeat(at: number, duration = 420): SharedValue<number> {
    const reduced = useReducedMotion();
    const progress = useSharedValue(reduced ? 1 : 0);
    useOnMount(() => {
        if (!reduced) {
            progress.set(withDelay(at, withTiming(1, { duration, easing: EASE })));
        }
        return undefined;
    });
    return progress;
}

function useRise(progress: SharedValue<number>) {
    return useAnimatedStyle(() => ({
        opacity: progress.get(),
        transform: [{ translateY: (1 - progress.get()) * RISE }],
    }));
}

/** Holds false until `at`, so a part that animates on mount (a rolling figure, a sentence) starts on its beat. */
function useCue(at: number): boolean {
    const reduced = useReducedMotion();
    const timers = useTimers();
    const [cued, setCued] = useState(reduced);
    useOnMount(() => (reduced ? undefined : timers.after(at, () => setCued(true))));
    return cued;
}

function Stop({ at, children, next, time }: { at: number; children: ReactNode; next?: number; time: string }) {
    const dot = useBeat(at, 260);
    const rail = useBeat(at, next === undefined ? 1 : next - at);
    const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.get() }] }));
    const railStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: rail.get() }] }));
    return (
        <View className="flex-row gap-3">
            <View className="min-w-[76px] pt-0.5">
                <MonoLabel>{time}</MonoLabel>
            </View>
            <View className="w-3 items-center pt-[3px]">
                <View className="border-separator size-3 items-center justify-center rounded-full border-2">
                    <Animated.View className="bg-foreground size-3 rounded-full" style={dotStyle} />
                </View>
                {next === undefined ? null : (
                    <View className="bg-rail-track mt-1 w-[2px] flex-1 overflow-hidden rounded-full">
                        <Animated.View
                            className="bg-foreground flex-1"
                            style={[{ transformOrigin: "top" }, railStyle]}
                        />
                    </View>
                )}
            </View>
            <View className={next === undefined ? "flex-1 gap-2" : "flex-1 gap-2 pb-6"}>{children}</View>
        </View>
    );
}

function StopHead({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row flex-wrap items-center gap-x-1.5">
            <MonoLabel>{label}</MonoLabel>
            <MonoLabel>·</MonoLabel>
            <MonoLabel className="text-income">{value}</MonoLabel>
        </View>
    );
}

function BankStop({ time }: { time: string }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const alert = useRise(useBeat(BEAT.alert, 520));
    const logged = useRise(useBeat(BEAT.logged));
    const cafe = t("pro.hero.cafe");
    return (
        <Stop at={BEAT.alert} next={BEAT.receipt} time={time}>
            <StopHead label={t("pro.day.bank")} value={t("pro.value.unlimited")} />
            <Animated.View
                className="bg-surface border-border flex-row items-center gap-3 rounded-[22px] border px-3.5 py-3"
                style={alert}
            >
                <CategoryIconTile color={colors.foreground} icon="Bank" size={36} />
                <View className="flex-1">
                    <View className="flex-row items-baseline justify-between gap-2">
                        <Text className="text-foreground text-body font-sans-semibold">{t("pro.hero.bank")}</Text>
                        <Text className="text-muted text-footnote">{t("pro.hero.now")}</Text>
                    </View>
                    <Text className="text-foreground text-body">
                        {t("pro.hero.alert", {
                            amount: formatAmount(CAFE.amount, USD, true, language),
                            merchant: cafe,
                        })}
                    </Text>
                </View>
            </Animated.View>
            <Animated.View className="flex-row items-center gap-3" style={logged}>
                <CategoryIconTile color={CAFE.color} icon={CAFE.icon} size={36} />
                <View className="flex-1">
                    <Text className="text-foreground text-body" numberOfLines={1}>
                        {cafe}
                    </Text>
                    <View className="flex-row items-center gap-1">
                        <HugeiconsIcon color={colors.income} icon={FlashIcon} size={11} />
                        <Text className="text-income text-footnote">{t("pro.hero.logged")}</Text>
                    </View>
                </View>
                <RowAmount amount={CAFE.amount} code={USD} income={false} isFuture={false} />
            </Animated.View>
        </Stop>
    );
}

function Corner({ className }: { className: string }) {
    return <View className={`border-expense absolute size-3 ${className}`} />;
}

function Receipt() {
    const t = useTranslation();
    const { language } = useLanguage();
    const scan = useBeat(BEAT.scan, SCAN_MS);
    const scanStyle = useAnimatedStyle(() => ({
        opacity: scan.get() > 0 && scan.get() < 1 ? 1 : 0,
        transform: [{ translateY: scan.get() * (RECEIPT_HEIGHT - 8) }],
    }));
    return (
        <View
            className="bg-surface border-border w-[96px] rounded-md border px-2.5 pt-2.5"
            style={{ height: RECEIPT_HEIGHT }}
        >
            <Text className="text-foreground font-mono text-[8px] tracking-wider uppercase" numberOfLines={1}>
                {t("pro.hero.market")}
            </Text>
            <View className="gap-[3px] pt-1.5">
                {RECEIPT_LINES.map((price) => (
                    <View className="flex-row items-center justify-between gap-1.5" key={price}>
                        <View className="bg-separator h-[3px] flex-1 rounded-full" />
                        <Text className="text-muted font-mono text-[7px]">
                            {formatAmount(price, USD, true, language)}
                        </Text>
                    </View>
                ))}
            </View>
            <View className="border-separator mt-1.5 flex-row justify-between border-t border-dashed pt-1">
                <Text className="text-foreground font-mono text-[8px] uppercase">{t("pro.day.total")}</Text>
                <Text className="text-foreground font-mono text-[8px]">
                    {formatAmount(MARKET_USD, USD, true, language)}
                </Text>
            </View>
            <Corner className="top-1 left-1 rounded-tl-[3px] border-t-2 border-l-2" />
            <Corner className="top-1 right-1 rounded-tr-[3px] border-t-2 border-r-2" />
            <Corner className="bottom-1 left-1 rounded-bl-[3px] border-b-2 border-l-2" />
            <Corner className="right-1 bottom-1 rounded-br-[3px] border-r-2 border-b-2" />
            <Animated.View className="bg-expense absolute inset-x-1 top-1 h-[2px] rounded-full" style={scanStyle} />
        </View>
    );
}

function ReceiptStop({ time }: { time: string }) {
    const t = useTranslation();
    const shown = useRise(useBeat(BEAT.receipt));
    const read = useRise(useBeat(BEAT.read));
    return (
        <Stop at={BEAT.receipt} next={BEAT.voice} time={time}>
            <StopHead label={t("pro.day.receipt")} value={t("pro.feature.captures")} />
            <View className="flex-row items-center gap-3.5">
                <Animated.View style={shown}>
                    <Receipt />
                </Animated.View>
                <Animated.View className="flex-1 gap-1" style={read}>
                    <Text className="text-foreground text-headline font-sans-semibold" numberOfLines={2}>
                        {t("pro.hero.market")}
                    </Text>
                    <MonoLabel>{t("pro.day.items", { count: RECEIPT_LINES.length })}</MonoLabel>
                    <View className="flex-row">
                        <RowAmount amount={MARKET_USD} code={USD} income={false} isFuture={false} />
                    </View>
                </Animated.View>
            </View>
        </Stop>
    );
}

function WaveBar({ height, index }: { height: number; index: number }) {
    const grow = useBeat(BEAT.voice + 250 + index * WAVE_STEP_MS, 180);
    const style = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.15 + grow.get() * (height - 0.15) }] }));
    return <Animated.View className="bg-foreground h-7 w-[3px] rounded-full" style={style} />;
}

function Spoken({ value }: { value: string }) {
    const colors = useColors();
    const reduced = useReducedMotion();
    const draw = useSharedValue(reduced ? 1 : 0);
    useOnMount(() => {
        if (!reduced) {
            draw.set(withDelay(SENTENCE_DRAW.duration, withTiming(1, SENTENCE_DRAW)));
        }
        return undefined;
    });
    const ruleStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: draw.get() }] }));
    return (
        <View>
            <Text className="text-foreground font-sans-semibold text-[19px] leading-[28px] tracking-tight">
                {value}
            </Text>
            <Animated.View
                className="absolute right-0 bottom-[3px] left-0 h-[2px] rounded-full"
                style={[{ backgroundColor: colors.tint, transformOrigin: "left" }, ruleStyle]}
            />
        </View>
    );
}

function VoiceStop({ time }: { time: string }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const mic = useRise(useBeat(BEAT.voice));
    const spoken = useCue(BEAT.sentence);
    return (
        <Stop at={BEAT.voice} next={BEAT.net} time={time}>
            <StopHead label={t("pro.day.voice")} value={t("pro.feature.captures")} />
            <Animated.View className="flex-row items-center gap-3" style={mic}>
                <View className="bg-foreground size-11 items-center justify-center rounded-full">
                    <HugeiconsIcon color={colors.background} icon={Mic01Icon} size={20} />
                </View>
                <View className="h-7 flex-1 flex-row items-center gap-[3px]">
                    {WAVE.map((height, index) => (
                        <WaveBar height={height} index={index} key={index} />
                    ))}
                </View>
            </Animated.View>
            <View className="min-h-[56px]">
                {spoken ? (
                    <Sentence
                        gapClassName="gap-x-1.5"
                        slots={{
                            amount: <Spoken value={formatAmount(METRO_EUR, EUR, true, language)} />,
                            merchant: <Spoken value={t("pro.hero.transit")} />,
                        }}
                        template={t("pro.day.sentence")}
                        textClassName="text-muted font-sans-medium text-[19px] leading-[28px] tracking-tight"
                    />
                ) : null}
            </View>
        </Stop>
    );
}

function NetStop({ time }: { time: string }) {
    const t = useTranslation();
    const shown = useRise(useBeat(BEAT.net));
    const counted = useCue(BEAT.net + 150);
    return (
        <Stop at={BEAT.net} time={time}>
            <StopHead label={t("pro.day.net")} value={t("pro.day.everyCurrency")} />
            <Animated.View className="gap-1" style={shown}>
                <View className="flex-row items-baseline gap-2">
                    <FlowAmount
                        amount={counted ? NET : 0}
                        className="text-foreground font-sans-bold text-[40px] leading-[46px] tracking-tight"
                        code={USD}
                        prefix={`-${symbolPrefix(currencySymbol(USD))}`}
                        showCents
                    />
                    <MonoLabel>{t("pro.day.entries", { count: ENTRIES })}</MonoLabel>
                </View>
                <MonoLabel>{t("pro.day.rate", { codes: `${USD} + ${EUR}` })}</MonoLabel>
            </Animated.View>
        </Stop>
    );
}

// The voice stop grows when its sentence writes in, so it is followed again once that has laid out.
const FOLLOW = [
    [0, BEAT.alert],
    [1, BEAT.receipt],
    [2, BEAT.voice],
    [2, BEAT.sentence + 400],
    [3, BEAT.net],
] as const;

/** `onFollow` gets the bottom of each stop as it starts playing, so the screen can scroll it into view. */
export function DayWithPro({ onFollow }: { onFollow?: (bottom: number) => void }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const reduced = useReducedMotion();
    const timers = useTimers();
    const bottoms = useRef<number[]>([]);
    useOnMount(() => {
        if (reduced || onFollow === undefined) {
            return undefined;
        }
        for (const [index, at] of FOLLOW) {
            timers.after(at, () => onFollow(bottoms.current[index] ?? 0));
        }
        return undefined;
    });
    const measure = (index: number) => (event: LayoutChangeEvent) => {
        const { height, y } = event.nativeEvent.layout;
        bottoms.current[index] = y + height;
    };
    const time = ([hours, minutes]: readonly [number, number]) =>
        formatTime(new Date(2026, 0, 1, hours, minutes), use24Hour, language);
    const label = t("pro.day.a11y", {
        cafe: formatAmount(CAFE.amount, USD, true, language),
        market: formatAmount(MARKET_USD, USD, true, language),
        metro: formatAmount(METRO_EUR, EUR, true, language),
        net: `-${formatAmount(NET, USD, true, language)}`,
    });
    return (
        <View accessibilityLabel={label} accessible className="pt-5">
            <View onLayout={measure(0)}>
                <BankStop time={time(TIMES.bank)} />
            </View>
            <View onLayout={measure(1)}>
                <ReceiptStop time={time(TIMES.receipt)} />
            </View>
            <View onLayout={measure(2)}>
                <VoiceStop time={time(TIMES.voice)} />
            </View>
            <View onLayout={measure(3)}>
                <NetStop time={time(TIMES.net)} />
            </View>
        </View>
    );
}
