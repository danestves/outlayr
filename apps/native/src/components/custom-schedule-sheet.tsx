import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import CheckIcon from "@hugeicons-pro/core-stroke-rounded/CheckIcon";
import MinusSignIcon from "@hugeicons-pro/core-stroke-rounded/MinusSignIcon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { MAX_INTERVAL, RECURRING_TYPE, SELECTABLE_RECURRING_TYPES, schedulePreview } from "@outlayr/money/recurrence";
import type { ScheduledCharge } from "@outlayr/money/recurrence";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Button } from "panelui-native/components/button";
import { Tabs } from "panelui-native/components/tabs";
import { cn } from "panelui-native/utils/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, withTiming } from "react-native-reanimated";

import { formatChargeDate } from "@/domain/dates";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { SANS_BY_WEIGHT } from "@/theme/body-fonts";
import { useColors } from "@/theme/use-colors";

import { MonoLabel } from "./mono-label";
import { Text } from "./text";

const PREVIEW_COUNT = 3;

const SWAP = {
    duration: 80,
    easing: Easing.bezier(0.2, 0.9, 0.25, 1),
} as const;
// One row's full out-and-back, so rows never overlap their dim windows: on device 55ms emptied all three rows at
// once and 90ms still emptied two.
const RIPPLE_STAGGER_MS = SWAP.duration * 2;

const SENTENCE = "font-sans-medium text-[30px] text-foreground leading-9";
const SENTENCE_SIZE = 30;
const UNIT_FADE_MS = 170;

// Keyed by a stored `recurringType`, as in `domain/recurrence.ts`.
const UNIT_TITLE_KEY = new Map<number, TranslationKey>([
    [RECURRING_TYPE.daily, "transaction.cadence.days"],
    [RECURRING_TYPE.weekly, "transaction.cadence.weeks"],
    [RECURRING_TYPE.monthly, "transaction.cadence.months"],
    [RECURRING_TYPE.yearly, "transaction.cadence.years"],
]);

interface PluralKeys {
    readonly many: TranslationKey;
    readonly one: TranslationKey;
}

const MONTHLY_UNIT: PluralKeys = { many: "transaction.unit.months", one: "transaction.unit.month" };

const UNIT_NOUN_KEY = new Map<number, PluralKeys>([
    [RECURRING_TYPE.daily, { many: "transaction.unit.days", one: "transaction.unit.day" }],
    [RECURRING_TYPE.weekly, { many: "transaction.unit.weeks", one: "transaction.unit.week" }],
    [RECURRING_TYPE.monthly, MONTHLY_UNIT],
    [RECURRING_TYPE.yearly, { many: "transaction.unit.years", one: "transaction.unit.year" }],
]);

const MONTHLY_INTERVAL: PluralKeys = { many: "transaction.interval.months", one: "transaction.interval.month" };

const INTERVAL_KEY = new Map<number, PluralKeys>([
    [RECURRING_TYPE.daily, { many: "transaction.interval.days", one: "transaction.interval.day" }],
    [RECURRING_TYPE.weekly, { many: "transaction.interval.weeks", one: "transaction.interval.week" }],
    [RECURRING_TYPE.monthly, MONTHLY_INTERVAL],
    [RECURRING_TYPE.yearly, { many: "transaction.interval.years", one: "transaction.interval.year" }],
]);

// Composed, not written per cadence: English and Spanish take the same shape, and the count needs no locale format.
export function intervalPhrase(t: TranslateFn, type: number, coefficient: number): string {
    const n = Math.max(1, Math.round(coefficient));
    const keys = INTERVAL_KEY.get(type) ?? MONTHLY_INTERVAL;
    return n <= 1 ? t(keys.one) : t(keys.many, { count: n });
}

function unitNoun(t: TranslateFn, type: number, coefficient: number): string {
    const keys = UNIT_NOUN_KEY.get(type) ?? MONTHLY_UNIT;
    return coefficient <= 1 ? t(keys.one) : t(keys.many);
}

function normalizeSchedule(type: number, coefficient: number) {
    return {
        coefficient: Math.min(MAX_INTERVAL, Math.max(1, Math.round(coefficient))),
        type: type === RECURRING_TYPE.none ? RECURRING_TYPE.monthly : type,
    };
}

function chargeKey(charges: readonly ScheduledCharge[]): string {
    return charges.map((c) => `${c.date.getTime()}:${c.clamped}`).join("|");
}

// Each row's new date lands at the midpoint of its own fade, so no frame shows a date the sheet will not keep.
function useRippledCharges(charges: readonly ScheduledCharge[], ready: boolean) {
    const [shown, setShown] = useState<readonly ScheduledCharge[]>(charges);
    const [swapping, setSwapping] = useState<readonly boolean[]>([]);
    // Committed once every row has landed: a half-updated set with no clamped row would hide the note, shrink the
    // sheet, then grow it again a beat later.
    const [noteVisible, setNoteVisible] = useState(() => charges.some((charge) => charge.clamped));
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const next = chargeKey(charges);
    const current = chargeKey(shown);

    if (!ready && next !== current) {
        setShown(charges);
        setSwapping([]);
        setNoteVisible(charges.some((charge) => charge.clamped));
    }

    useEffect(() => {
        if (ready) {
            return;
        }
        for (const timer of timers.current) {
            clearTimeout(timer);
        }
        timers.current = [];
    }, [ready]);

    useEffect(() => {
        if (!ready || next === current) {
            return;
        }
        for (const timer of timers.current) {
            clearTimeout(timer);
        }
        timers.current = [];

        const clamped = charges.some((charge) => charge.clamped);
        for (const index of charges.keys()) {
            timers.current.push(
                setTimeout(() => {
                    setSwapping((prev) => withAt(prev, index, true));
                    timers.current.push(
                        setTimeout(() => {
                            setShown((prev) => withAt(prev, index, charges[index]));
                            setSwapping((prev) => withAt(prev, index, false));
                        }, SWAP.duration)
                    );
                }, index * RIPPLE_STAGGER_MS)
            );
        }
        timers.current.push(
            setTimeout(() => setNoteVisible(clamped), (charges.length - 1) * RIPPLE_STAGGER_MS + SWAP.duration * 2)
        );
    }, [next, current, charges, ready]);

    useEffect(
        () => () => {
            for (const timer of timers.current) {
                clearTimeout(timer);
            }
        },
        []
    );

    return { noteVisible, shown, swapping };
}

function withAt<T>(list: readonly T[], index: number, value: T): T[] {
    const copy = [...list];
    copy[index] = value;
    return copy;
}

interface CustomScheduleSheetProps {
    firstPayment: Date;
    onDone: (recurringType: number, recurringCoefficient: number) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    recurringCoefficient: number;
    recurringType: number;
}

// Edits stay local until Done, so Cancel leaves the form's schedule untouched.
export function CustomScheduleSheet({
    open,
    recurringType,
    recurringCoefficient,
    firstPayment,
    onOpenChange,
    onDone,
}: CustomScheduleSheetProps) {
    const t = useTranslation();
    const colors = useColors();
    const seeded = normalizeSchedule(recurringType, recurringCoefficient);
    const [type, setType] = useState(seeded.type);
    const [coefficient, setCoefficient] = useState(seeded.coefficient);
    const [wasOpen, setWasOpen] = useState(open);
    // Armed a tick after the sheet is up: rippling the open-edge re-seed would play under the platform presentation.
    const [rippleReady, setRippleReady] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        const armed = setTimeout(() => {
            setRippleReady(true);
        }, 0);
        return () => clearTimeout(armed);
    }, [open]);

    // Re-seeded during render on the closed-to-open edge: the sheet stays mounted, so a form edit made while closed
    // must land, and an effect would draw the previous schedule for a frame. Re-seeding on every prop change would
    // fight the user mid-edit.
    if (open !== wasOpen) {
        setWasOpen(open);
        setRippleReady(false);
        if (open) {
            const next = normalizeSchedule(recurringType, recurringCoefficient);
            setType(next.type);
            setCoefficient(next.coefficient);
        }
    }

    const unitWord = unitNoun(t, type, coefficient);

    const charges = useMemo(
        () => schedulePreview(firstPayment, type, coefficient, PREVIEW_COUNT),
        [firstPayment, type, coefficient]
    );
    const { shown, swapping, noteVisible } = useRippledCharges(charges, rippleReady);

    const close = useCallback(() => onOpenChange(false), [onOpenChange]);

    const done = useCallback(() => {
        onDone(type, coefficient);
        onOpenChange(false);
    }, [onDone, onOpenChange, type, coefficient]);

    const pickType = useCallback((next: string) => setType(Number(next)), []);
    const stepUp = useCallback(() => setCoefficient((c) => Math.min(MAX_INTERVAL, c + 1)), []);
    const stepDown = useCallback(() => setCoefficient((c) => Math.max(1, c - 1)), []);

    return (
        <BottomSheet native onOpenChange={onOpenChange} open={open}>
            <BottomSheet.Content className="pt-0" size="auto">
                <View className="flex-row items-center justify-between py-1">
                    <Button
                        accessibilityLabel={t("common.cancel")}
                        className="rounded-full"
                        onPress={close}
                        size="icon"
                        variant="secondary"
                    >
                        <HugeiconsIcon color={colors.foreground} icon={Cancel01Icon} size={22} />
                    </Button>

                    <Text accessibilityRole="header" className="text-foreground text-lg font-medium">
                        {t("transaction.schedule.customTitle")}
                    </Text>

                    <Button accessibilityLabel={t("common.done")} className="rounded-full" onPress={done} size="icon">
                        <HugeiconsIcon color={colors.accentForeground} icon={CheckIcon} size={22} />
                    </Button>
                </View>

                {/* A row, not nested Text spans: the step buttons are views, and the unit needs its own node to
                    cross-fade. */}
                <View
                    className="h-9 flex-row items-center gap-2"
                    style={{ marginBottom: 16, marginTop: 12 }}
                    testID="schedule-sentence"
                >
                    <Text className={SENTENCE}>{t("transaction.schedule.everyLabel")}</Text>
                    <StepButton
                        accessibilityLabel={t("transaction.schedule.fewer")}
                        disabled={coefficient <= 1}
                        icon={MinusSignIcon}
                        onStep={stepDown}
                    />
                    <Text
                        style={{
                            color: colors.foreground,
                            fontFamily: SANS_BY_WEIGHT[700],
                            fontSize: SENTENCE_SIZE,
                            fontWeight: "700",
                        }}
                    >
                        {coefficient}
                    </Text>
                    <StepButton
                        accessibilityLabel={t("transaction.schedule.more")}
                        disabled={coefficient >= MAX_INTERVAL}
                        icon={PlusSignIcon}
                        onStep={stepUp}
                    />
                    {/* Pinned height with the words stacked absolutely: Reanimated keeps the exiting word mounted, so
                        two words in flow would double this box, re-measure RNHostView and re-settle the sheet. */}
                    <View className="h-9 flex-1">
                        <Animated.View
                            className="absolute top-0 left-0"
                            entering={FadeIn.duration(UNIT_FADE_MS)}
                            exiting={FadeOut.duration(UNIT_FADE_MS)}
                            key={unitWord}
                        >
                            <Text className={SENTENCE}>{unitWord}</Text>
                        </Animated.View>
                    </View>
                </View>

                {/* `pill`, never `segmented`: PanelUI's segmented track paints `bg-muted`, which is a text colour in
                    our theme, so it comes out a dark slab. */}
                <Tabs
                    defaultValue={String(RECURRING_TYPE.monthly)}
                    onValueChange={pickType}
                    value={String(type)}
                    variant="pill"
                >
                    <Tabs.List>
                        {SELECTABLE_RECURRING_TYPES.map((option) => (
                            <Tabs.Trigger key={option} value={String(option)}>
                                {t(UNIT_TITLE_KEY.get(option) ?? "transaction.cadence.months")}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </Tabs>

                <View className="bg-background mt-5 rounded-2xl p-4">
                    <MonoLabel className="pb-2">{t("transaction.schedule.nextCharges")}</MonoLabel>
                    <ChargeRow date={firstPayment} first tag={t("transaction.schedule.firstPaymentTag")} />
                    {shown.map((charge, index) => (
                        <ChargeRow
                            date={charge.date}
                            key={index}
                            last={index === shown.length - 1}
                            swapping={swapping[index] === true}
                            tag={charge.clamped ? t("transaction.schedule.shortMonthTag") : undefined}
                            tinted={charge.clamped}
                        />
                    ))}
                    {noteVisible ? (
                        <Text className="border-separator text-footnote text-muted mt-2 border-t pt-3">
                            {t("transaction.schedule.shortMonthNote")}
                        </Text>
                    ) : null}
                </View>
            </BottomSheet.Content>
        </BottomSheet>
    );
}

const STEP_ICON_SIZE = 18;

const HOLD_DELAY_MS = 350;
const HOLD_REPEAT_MS = 70;

interface StepButtonProps {
    accessibilityLabel: string;
    disabled: boolean;
    icon: typeof PlusSignIcon;
    onStep: () => void;
}

function StepButton({ icon, onStep, disabled, accessibilityLabel }: StepButtonProps) {
    const colors = useColors();
    const held = useRef<{
        delay?: ReturnType<typeof setTimeout>;
        repeat?: ReturnType<typeof setInterval>;
    }>({});

    const release = useCallback(() => {
        if (held.current.delay) {
            clearTimeout(held.current.delay);
        }
        if (held.current.repeat) {
            clearInterval(held.current.repeat);
        }
        held.current = {};
    }, []);

    useEffect(() => release, [release]);

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            className={
                disabled
                    ? "bg-background h-9 w-9 items-center justify-center rounded-full opacity-40"
                    : "bg-background h-9 w-9 items-center justify-center rounded-full active:opacity-60"
            }
            disabled={disabled}
            hitSlop={6}
            // On press-in: a stepper that waits for the lift feels a beat behind, and the hold starts from that moment.
            onPressIn={() => {
                onStep();
                held.current.delay = setTimeout(() => {
                    held.current.repeat = setInterval(onStep, HOLD_REPEAT_MS);
                }, HOLD_DELAY_MS);
            }}
            onPressOut={release}
        >
            <HugeiconsIcon color={colors.foreground} icon={icon} size={STEP_ICON_SIZE} strokeWidth={2.4} />
        </Pressable>
    );
}

interface ChargeRowProps {
    date: Date;
    first?: boolean;
    last?: boolean;
    swapping?: boolean;
    tag?: string;
    tinted?: boolean;
}

function ChargeRow({ date, tag, first = false, last = false, tinted = false, swapping = false }: ChargeRowProps) {
    const { language } = useLanguage();
    // Transform and opacity only, so the row never re-measures and the platform sheet never re-settles.
    const dateStyle = useAnimatedStyle(() => ({
        opacity: withTiming(swapping ? 0 : 1, SWAP),
        transform: [{ translateY: withTiming(swapping ? 5 : 0, SWAP) }],
    }));
    const dotStyle = useAnimatedStyle(() => ({
        opacity: withTiming(swapping ? 0.35 : 1, SWAP),
    }));

    return (
        <View className="min-h-9.5 flex-row items-center gap-3">
            {/* The rule comes before the dot, so the dot's ring covers it instead of reading as a strikethrough. */}
            <View className="w-5.5 items-center justify-center self-stretch">
                {last ? null : <View className="bg-separator absolute top-1/2 bottom-0 w-[1.5px]" />}
                {first ? null : <View className="bg-separator absolute top-0 bottom-1/2 w-[1.5px]" />}
                <Animated.View
                    className={cn(
                        "size-2.25 rounded-full",
                        first ? "bg-foreground" : "border-muted bg-background border-[1.5px]"
                    )}
                    style={first ? undefined : dotStyle}
                />
            </View>
            <Animated.View className="flex-1 flex-row items-center gap-3" style={first ? undefined : dateStyle}>
                <Text
                    className={
                        tinted ? "font-sans-semibold text-foreground text-subtitle" : "text-foreground text-subtitle"
                    }
                >
                    {formatChargeDate(date, undefined, language)}
                </Text>
                {tag == null ? null : <Text className="text-label text-muted">{tag}</Text>}
            </Animated.View>
        </View>
    );
}
