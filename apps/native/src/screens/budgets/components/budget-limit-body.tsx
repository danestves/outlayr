import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { lastMsBefore, spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE, periodEnd, startOfPeriod } from "@outlayr/money/budget-window";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { AmountNumpad } from "@/components/amount-numpad";
import { HeroNumber } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Sentence } from "@/components/sentence/sentence";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { earliestDate } from "@/data/budgets";
import { buildBurndown } from "@/domain/budget-burndown";
import { suggestedLimit } from "@/domain/budget-limit-step";
import { budgetPeriodCadence, budgetPeriodName, budgetWindowLabel } from "@/domain/budget-math";
import { typicalSpend } from "@/domain/budget-typical";
import { monthLongTitle } from "@/domain/dates";
import { formatAmount, minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";

import { BudgetLimitPicker } from "./budget-limit-picker";
import { SheetCommitButton } from "./sheet-commit-button";

/** A null `categoryId` is the whole ledger. */
export interface LimitTarget {
    categoryId: string | null;
    color?: string | null;
    emoji?: string | null;
    icon?: string | null;
    limit: number | null;
    name: string;
    replacesExisting?: boolean;
    type: number;
    window?: BudgetWindow | null;
}

export interface LimitCommit {
    limit: number;
    /**
     * False when untouched: an existing limit must stand as stored, because the screen shows it converted into
     * the ledger's currency and writing that back would restate a EUR 100 budget as USD 111.
     */
    limitChanged: boolean;
    type: number;
}

interface BudgetLimitBodyProps {
    calendar: { firstDayOfMonth: number; firstWeekday: number };
    contributions: readonly ExpenseContribution[];
    currency: string;
    nowMs: number;
    onCommit: (commit: LimitCommit) => Promise<void> | void;
    periodChoice?: boolean;
    target: LimitTarget;
}

const PERIODS = [BUDGET_TYPE.day, BUDGET_TYPE.week, BUDGET_TYPE.month, BUDGET_TYPE.year] as const;

const STATED = "font-sans-medium text-[19px] leading-[28px] tracking-tight text-grammar";

export function BudgetLimitBody({
    target,
    contributions,
    currency,
    nowMs,
    calendar,
    periodChoice = true,
    onCommit,
}: BudgetLimitBodyProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const money = (value: number) => formatAmount(value, currency, false, language);
    const [type, setType] = useState(target.type);
    const [pickingPeriod, setPickingPeriod] = useState(false);
    const [typing, setTyping] = useState(false);
    const minorUnits = minorUnitsFor(currency);

    const window = useMemo(() => {
        if (type === target.type && target.window) {
            return target.window;
        }
        const start = startOfPeriod(new Date(nowMs), type, calendar);
        return { end: periodEnd(start, type), start };
    }, [type, target.type, target.window, nowMs, calendar]);

    const spentIn = useMemo(() => {
        const { categoryId } = target;
        return categoryId
            ? (start: Date, end: Date) => spentForCategory(contributions, categoryId, start, lastMsBefore(end))
            : (start: Date, end: Date) => spentForMain(contributions, start, lastMsBefore(end));
    }, [contributions, target]);

    const since = useMemo(() => earliestDate(contributions), [contributions]);
    const evidence = useMemo(
        () => typicalSpend({ current: window, since, spentIn, type }),
        [window, since, spentIn, type]
    );

    const burndown = useMemo(
        () =>
            buildBurndown(contributions, {
                categoryId: target.categoryId,
                limit: 0,
                now: new Date(nowMs),
                window,
            }),
        [contributions, target.categoryId, nowMs, window]
    );

    const sampleSize = useMemo(
        () =>
            contributions.filter(
                (row) =>
                    row.date.getTime() >= window.start.getTime() &&
                    row.date.getTime() <= nowMs &&
                    (target.categoryId === null ||
                        row.categoryId === target.categoryId ||
                        row.parentId === target.categoryId)
            ).length,
        [contributions, window, nowMs, target.categoryId]
    );

    const [opening] = useState(
        () => target.limit ?? evidence.typical ?? suggestedLimit(burndown.points.at(-1)?.spent ?? 0)
    );
    const [limit, setLimit] = useState(opening);
    const [entry, setEntry] = useState(() => numberToNumpad(opening, minorUnits));

    /**
     * Guards a write in flight: `mainBudget` has no singleton constraint, so a double tap would insert two.
     * Released on settle rather than latched, so the inline first-run takeover can retry after a failed write.
     */
    const inFlight = useRef(false);

    const commit = async () => {
        if (limit <= 0) {
            setTyping(true);
            return;
        }
        if (inFlight.current) {
            return;
        }
        inFlight.current = true;
        const write = async () => onCommit({ limit, limitChanged: limit !== target.limit, type });
        await write().finally(() => {
            inFlight.current = false;
        });
    };

    const typeLimit = (next: string) => {
        setEntry(next);
        setLimit(numpadToNumber(next));
    };

    const dragLimit = (next: number) => {
        setLimit(next);
        setEntry(numberToNumpad(next, minorUnits));
    };

    const periodPhrase = t(budgetPeriodCadence(type));
    // An anchor on the 15th makes "August" a lie about a window that ends in September.
    const windowLabel =
        type === BUDGET_TYPE.month && window.start.getDate() === 1
            ? monthLongTitle(window.start, language)
            : budgetWindowLabel(window, type, language);

    return (
        <View>
            <View className="px-5">
                <Sentence
                    slots={{
                        period: (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ expanded: pickingPeriod }}
                                disabled={!periodChoice}
                                onPress={() => setPickingPeriod((open) => !open)}
                            >
                                <Text
                                    className={cn(
                                        STATED,
                                        periodChoice ? "text-tint" : "text-foreground",
                                        periodChoice && "border-tint border-b-[1.5px]"
                                    )}
                                >
                                    {periodPhrase}
                                </Text>
                            </Pressable>
                        ),
                        scope: (
                            <View className="flex-row items-center gap-1.5">
                                {target.categoryId ? (
                                    <CategoryIconTile
                                        color={target.color ?? "#767676"}
                                        emoji={target.emoji ?? null}
                                        icon={target.icon ?? null}
                                        size={22}
                                    />
                                ) : null}
                                <Text className={cn(STATED, "text-foreground")}>{target.name}</Text>
                            </View>
                        ),
                    }}
                    template={t("budgets.sheet.stated")}
                    textClassName={STATED}
                />

                {pickingPeriod ? (
                    <Animated.View className="flex-row flex-wrap gap-2 pt-3.5" entering={revealEntering()}>
                        {PERIODS.map((period) => (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ selected: period === type }}
                                className={cn(
                                    "h-[38px] items-center justify-center rounded-[19px] border px-3.5",
                                    period === type ? "border-tint bg-tint/10" : "border-border"
                                )}
                                key={period}
                                onPress={() => {
                                    haptics("selection");
                                    setType(period);
                                    setPickingPeriod(false);
                                }}
                            >
                                <Text
                                    className={cn("text-subtitle", period === type ? "text-tint" : "text-foreground")}
                                >
                                    {t(budgetPeriodName(period))}
                                </Text>
                            </Pressable>
                        ))}
                    </Animated.View>
                ) : null}

                <View className="flex-row items-baseline justify-between pt-3">
                    <Pressable
                        accessibilityLabel={t("budgets.sheet.editLimitA11y")}
                        accessibilityRole="button"
                        onPress={() => setTyping((open) => !open)}
                    >
                        <HeroNumber amount={limit} code={currency} showCents={false} sign="" size={40} still />
                    </Pressable>
                    <MonoLabel>
                        {evidence.typical === null
                            ? t("budgets.sheet.tapToType").toUpperCase()
                            : t("budgets.sheet.typical", {
                                  amount: money(evidence.typical),
                              }).toUpperCase()}
                    </MonoLabel>
                </View>
            </View>

            {typing ? (
                // Keyed per branch: both are an `Animated.View` in one slot, so without a key the entrance never runs.
                <Animated.View className="px-5 pt-4" entering={revealEntering()} key="pad">
                    <AmountNumpad
                        code={currency}
                        minorUnits={minorUnits}
                        onChange={typeLimit}
                        showDisplay={false}
                        value={entry}
                    />
                </Animated.View>
            ) : (
                <Animated.View className="pt-4" entering={revealEntering()} key="plot">
                    {/* Remounted per cadence: the plot freezes its axis at mount. */}
                    <BudgetLimitPicker
                        burndown={burndown}
                        currency={currency}
                        history={evidence.history}
                        key={type}
                        limit={limit}
                        nowMs={nowMs}
                        onLimit={dragLimit}
                        periodPhrase={periodPhrase}
                        sampleSize={sampleSize}
                        window={window}
                        windowLabel={windowLabel}
                    />
                </Animated.View>
            )}

            <View className="px-5 pt-5">
                {target.replacesExisting ? (
                    <Text className="text-footnote text-muted pb-3">{t("budgets.sheet.singleton")}</Text>
                ) : null}
                {/* Never inert: a zero limit opens the numpad instead. */}
                <SheetCommitButton label={t("budgets.picker.commit", { amount: money(limit) })} onPress={commit} />
            </View>
        </View>
    );
}
