import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { use, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { AmountNumpad } from "@/components/amount-numpad";
import { AmountsHiddenContext, HeroNumber } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { Sentence } from "@/components/sentence/sentence";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useNow } from "@/data/use-now";
import { formatSentenceDate, formatTargetMonth } from "@/domain/dates";
import { addLocalMonths, daysBetween, startOfLocalDay, tomorrowLocal } from "@/domain/local-day";
import { formatAmount, maskedAmount, minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { goalProgress } from "@/domain/savings-goal";
import type { GoalProgress } from "@/domain/savings-goal";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";

import { CompactDatePicker } from "./compact-date-picker";
import { SheetCommitButton } from "./sheet-commit-button";

export interface GoalTarget {
    accountId: string;
    /** Null when it cannot be stated in `currency`; the sheet then drops the figures that depend on it. */
    balance: number | null;
    currency: string;
    existing?: { targetAmount: number; targetDate: Date } | null;
    name: string;
    /** A sentence with `{account}` and `{date}` slots; the amount is fixed at zero. */
    payoff?: string;
}

export interface GoalCommit {
    startAmount: number;
    targetAmount: number;
    /**
     * True only when the keypad was used: the screen shows a converted target, and `numberToNumpad` rounds,
     * so comparing figures would read every commit as an edit and restate the stored target.
     */
    targetChanged: boolean;
    /** False keeps the deadline out of the patch: a peer can move it while the sheet is up. */
    dateChanged: boolean;
    targetDate: Date;
}

interface GoalTargetSheetProps {
    onCommit: (commit: GoalCommit) => Promise<void> | void;
    onRemove?: () => void;
    ref?: Ref<BottomSheetModal>;
    target: GoalTarget | null;
}

const DEFAULT_HORIZON_MONTHS = 6;
const PAYOFF_HORIZON_MONTHS = 3;

const STATED = "font-sans-medium text-[19px] leading-[28px] tracking-tight text-grammar";

export function GoalTargetSheet({ target, onCommit, onRemove, ref }: GoalTargetSheetProps) {
    const sheetSurface = useSheetSurface();
    const [presentation, setPresentation] = useState(0);

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => setPresentation((count) => count + 1)}
            ref={ref}
        >
            {/* Sized to its content: a root that doesn't flex (chrome contract 1b). */}
            <SheetGestureRoot style={{}}>
                <BottomSheetView style={{ paddingBottom: 28, paddingTop: 14 }}>
                    {target ? (
                        <GoalTargetBody
                            // A dismissed draft must not be what the next presentation opens on.
                            key={`${target.accountId}:${target.existing?.targetAmount ?? "new"}:${presentation}`}
                            onCommit={onCommit}
                            onRemove={onRemove}
                            target={target}
                        />
                    ) : null}
                </BottomSheetView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

function notBefore(picked: Date, floor: Date): Date {
    return picked < floor ? floor : picked;
}

function GoalTargetBody({
    target,
    onCommit,
    onRemove,
}: Pick<GoalTargetSheetProps, "onCommit" | "onRemove"> & { target: GoalTarget }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const nowMs = useNow();
    const hidden = use(AmountsHiddenContext);
    const minorUnits = minorUnitsFor(target.currency);
    const payoff = target.payoff !== undefined;
    const money = (value: number) =>
        payoff && hidden ? maskedAmount(target.currency) : formatAmount(value, target.currency, false, language);

    const [mode, setMode] = useState<"amount" | "date">(payoff ? "date" : "amount");
    const [entry, setEntry] = useState(() => numberToNumpad(target.existing?.targetAmount ?? 0, minorUnits));
    const [edited, setEdited] = useState(target.existing == null);
    const [dateEdited, setDateEdited] = useState(target.existing == null);
    const [date, setDate] = useState(() => {
        if (target.existing) {
            return target.existing.targetDate;
        }
        return addLocalMonths(Date.now(), payoff ? PAYOFF_HORIZON_MONTHS : DEFAULT_HORIZON_MONTHS);
    });

    const amount = numpadToNumber(entry);
    // Minor units show whenever present: in pre-dotted entry `123` would otherwise read as "$1" and commit 1.23.
    const scale = 10 ** minorUnits;
    const hasMinorUnits = minorUnits > 0 && Math.round(amount * scale) % scale !== 0;
    const typed = (value: number) => formatAmount(value, target.currency, hasMinorUnits, language);

    const range = useMemo(() => {
        const start = tomorrowLocal(nowMs);
        // A past existing date stays selectable, so re-setting the amount does not move an untouched deadline.
        return { start: target.existing && target.existing.targetDate < start ? target.existing.targetDate : start };
    }, [target.existing, nowMs]);

    const inFlight = useRef(false);

    const commit = async () => {
        if (amount <= 0 && !payoff) {
            setMode("amount");
            return;
        }
        if (inFlight.current) {
            return;
        }
        inFlight.current = true;
        const write = async () => {
            // Re-clamped because the sheet can sit open across midnight. Only a chosen date, though: an overdue
            // goal opened to change its amount must keep its old deadline.
            await onCommit({
                dateChanged: dateEdited,
                startAmount: target.balance ?? 0,
                targetAmount: amount,
                targetChanged: edited,
                targetDate: dateEdited ? notBefore(date, tomorrowLocal(nowMs)) : date,
            });
        };
        await write().finally(() => {
            inFlight.current = false;
        });
    };

    const { pace } = goalProgress(
        target.balance ?? 0,
        amount,
        {
            startAmount: target.balance ?? 0,
            startDate: new Date(),
            targetDate: date,
        },
        minorUnits
    );

    const demand = (() => {
        if (payoff) {
            return payoffDemand(pace, date, nowMs, money, t);
        }
        if (target.balance === null || pace == null || amount <= 0) {
            return t("goals.empty.body");
        }
        if (pace.monthsLeft === 0) {
            return t("goals.sheet.demandsNow", { amount: money(pace.perMonth) });
        }
        return t("goals.sheet.demands", { amount: money(pace.perMonth), months: pace.monthsLeft });
    })();

    return (
        <View>
            <View className="px-5">
                <Sentence
                    slots={{
                        account: <Text className={cn(STATED, "text-foreground")}>{target.name}</Text>,
                        amount: (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ selected: mode === "amount" }}
                                onPress={() => setMode("amount")}
                            >
                                <Text
                                    className={cn(
                                        STATED,
                                        mode === "amount" ? "text-tint border-tint border-b-[1.5px]" : "text-foreground"
                                    )}
                                >
                                    {amount > 0 ? typed(amount) : t("goals.sheet.amountBlank")}
                                </Text>
                            </Pressable>
                        ),
                        date: (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ selected: mode === "date" }}
                                onPress={() => {
                                    haptics("selection");
                                    setMode("date");
                                }}
                            >
                                <Text
                                    className={cn(
                                        STATED,
                                        mode === "date" ? "text-tint border-tint border-b-[1.5px]" : "text-tint"
                                    )}
                                >
                                    {payoff ? formatSentenceDate(date, language) : formatTargetMonth(date, language)}
                                </Text>
                            </Pressable>
                        ),
                    }}
                    template={target.payoff ?? t("goals.sheet.stated")}
                    textClassName={STATED}
                />

                {payoff ? null : (
                    <View className="flex-row items-baseline justify-between pt-3">
                        <Pressable
                            accessibilityLabel={t("goals.sheet.editTargetA11y")}
                            accessibilityRole="button"
                            onPress={() => setMode("amount")}
                        >
                            <HeroNumber
                                amount={amount}
                                code={target.currency}
                                showCents={hasMinorUnits}
                                sign=""
                                size={40}
                                still
                            />
                        </Pressable>
                        {target.balance === null ? null : (
                            <MonoLabel>
                                {t("goals.sheet.holds", { amount: money(target.balance) }).toUpperCase()}
                            </MonoLabel>
                        )}
                    </View>
                )}
            </View>

            {mode === "amount" ? (
                // Keyed per branch: both are an `Animated.View` in one slot, so without a key the entrance never runs.
                <Animated.View className="px-5 pt-4" entering={revealEntering()} key="pad">
                    <AmountNumpad
                        code={target.currency}
                        minorUnits={minorUnits}
                        onChange={(next) => {
                            setEdited(true);
                            setEntry(next);
                        }}
                        showDisplay={false}
                        value={entry}
                    />
                </Animated.View>
            ) : (
                <Animated.View className="px-5 pt-2" entering={revealEntering()} key="date">
                    <CompactDatePicker
                        height={44}
                        label={t("goals.editor.by")}
                        // Clamped, not merely bounded: a past deadline lowers the range's floor so it can render.
                        onChange={(next) => {
                            setDateEdited(true);
                            setDate(notBefore(next, tomorrowLocal(nowMs)));
                        }}
                        range={range}
                        value={date}
                    />
                </Animated.View>
            )}

            <View className="px-5 pt-5">
                <Text className="text-footnote text-muted border-border border-t pt-2.5 leading-snug">{demand}</Text>
                {/* Never inert: a zero target opens the numpad instead. */}
                <View className="mt-3">
                    <SheetCommitButton label={commitLabel(payoff, target.existing != null, t)} onPress={commit} />
                </View>
                {onRemove ? (
                    <Pressable
                        accessibilityRole="button"
                        className="items-center pt-3.5 active:opacity-60"
                        onPress={onRemove}
                    >
                        <Text className="text-body text-over-budget">{t("debts.plan.remove")}</Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

function commitLabel(payoff: boolean, existing: boolean, t: TranslateFn): string {
    if (payoff) {
        return t(existing ? "debts.plan.save" : "debts.plan.commit");
    }
    return t(existing ? "goals.sheet.save" : "goals.sheet.commit");
}

function payoffDemand(
    pace: GoalProgress["pace"],
    date: Date,
    nowMs: number,
    money: (value: number) => string,
    t: TranslateFn
): string | null {
    if (pace === null) {
        return null;
    }
    if (pace.monthsLeft > 0) {
        return t("debts.plan.demandMonth", { amount: money(pace.perMonth) });
    }
    const count = daysBetween(startOfLocalDay(nowMs), startOfLocalDay(date.getTime()));
    return t("debts.plan.demandDays", { amount: money(pace.perMonth), count });
}
