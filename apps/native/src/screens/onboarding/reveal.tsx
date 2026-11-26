import { overallBudgetFigures } from "@outlayr/money/budget-figures";
import type { StoredBudget } from "@outlayr/money/budget-figures";
import { BUDGET_TYPE, startOfPeriod } from "@outlayr/money/budget-window";
import { addDays, startOfLocalDay } from "@outlayr/money/calendar";
import { utcDateString } from "@outlayr/money/dates";
import * as Cause from "effect/Cause";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useExpenseContributions } from "@/data/budgets";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { leftPerDay } from "@/domain/budget-math";
import { daysInMonthPeriod } from "@/domain/daily-allowance";
import { formatAmount } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { useLanguage, useTranslation } from "@/i18n/context";
import { trackOnboarding } from "@/lib/onboarding-events";
import { SILENT } from "@/state/atom-command";
import { createMainBudgetCommand } from "@/state/planning-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { useFinishOnboarding } from "./finish";
import { STEP_PROGRESS } from "./progress";

function DailyHero({ amount, perDay }: { amount: string; perDay: string }) {
    return (
        <View className="max-w-full flex-row items-baseline gap-2 px-6">
            <Text
                adjustsFontSizeToFit
                className="font-sans-semibold text-fr-ink text-[76px] leading-[80px] tracking-[-2.5px] tabular-nums"
                numberOfLines={1}
            >
                {amount}
            </Text>
            <Text className="text-fr-muted text-subtitle">{perDay}</Text>
        </View>
    );
}

const TODAY_LABEL_WIDTH = 64;

function MonthStrip({ days, firstDay, today }: { days: number; firstDay: Date; today: Date }) {
    const t = useTranslation();
    const todayStart = startOfLocalDay(today.getTime());
    const ticks = Array.from({ length: days }, (_, index) => addDays(firstDay, index));
    const todayIndex = ticks.findIndex((day) => startOfLocalDay(day.getTime()) === todayStart);
    return (
        <View className="pb-5">
            <View className="flex-row items-start">
                {ticks.map((day, index) => (
                    <View className="flex-1 items-center" key={day.toISOString()}>
                        <View
                            className={cn(
                                "w-[2px] rounded-full",
                                index === todayIndex
                                    ? "bg-fr-ink h-5"
                                    : cn("h-3", index < todayIndex ? "bg-fr-muted" : "bg-fr-rule")
                            )}
                        />
                    </View>
                ))}
            </View>
            {todayIndex === -1 ? null : (
                <View
                    className="absolute bottom-0 items-center"
                    style={{
                        left: `${((todayIndex + 0.5) / days) * 100}%`,
                        marginLeft: -TODAY_LABEL_WIDTH / 2,
                        width: TODAY_LABEL_WIDTH,
                    }}
                >
                    <MonoLabel className="text-fr-ink text-[8px]">{t("common.today")}</MonoLabel>
                </View>
            )}
        </View>
    );
}

export function OnboardingReveal() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const nowMs = useNow();
    const amount = numpadToNumber(useLocalSearchParams<{ amount?: string }>().amount ?? "");
    const currency = useGlobalCurrency(db);
    const firstDayOfMonth = useSetting("firstDayOfMonth");
    const firstWeekday = useSetting("firstWeekday");
    const now = new Date(nowMs);
    const days = daysInMonthPeriod(now, firstDayOfMonth);
    const periodStart = startOfPeriod(now, BUDGET_TYPE.month, { firstDayOfMonth, firstWeekday });
    const sinceMs = Date.parse(utcDateString(periodStart.getTime()));
    const contributions = useExpenseContributions(db, nowMs, sinceMs);
    const { displayCurrency, rates } = useValuation(db);
    const draft: StoredBudget = {
        amount: Math.abs(amount),
        amountUsd: null,
        currency,
        dateCreated: now,
        rollover: false,
        startDate: periodStart,
        type: BUDGET_TYPE.month,
    };
    const figures = overallBudgetFigures(draft, contributions, { displayCurrency, now, rates });
    const perDay = figures.leftover < 0 ? 0 : leftPerDay(figures.leftover, figures.window, now);
    const { clearFailed, failed, finish } = useFinishOnboarding();
    const [creating, setCreating] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const saving = useRef(false);

    const kept = () => {
        trackOnboarding("onboarding_budget", { outcome: "kept" });
        finish();
    };

    const createMain = useAtomAction(
        createMainBudgetCommand,
        {
            onFailure: (cause) => {
                console.error("Creating the onboarding budget failed", Cause.squash(cause));
                saving.current = false;
                setCreating(false);
                setSaveFailed(true);
            },
            onSuccess: () => {
                saving.current = false;
                setCreating(false);
                kept();
            },
        },
        SILENT
    );

    const keep = () => {
        if (saving.current) {
            return;
        }
        clearFailed();
        setSaveFailed(false);
        saving.current = true;
        setCreating(true);
        createMain({ db, input: { amount, type: BUDGET_TYPE.month } });
    };

    return (
        <FirstRun
            action={{ disabled: creating, label: t("onboarding.reveal.keep"), onPress: keep }}
            error={saveFailed ? t("onboarding.reveal.saveFailed") : failed}
            object={
                <DailyHero
                    amount={formatAmount(perDay, currency, perDay < 10, language)}
                    perDay={t("onboarding.reveal.perDay")}
                />
            }
            progress={STEP_PROGRESS.reveal}
            skip={{
                label: t("onboarding.reveal.skip"),
                onPress: () => {
                    if (!saving.current) {
                        router.back();
                    }
                },
            }}
            title={t("onboarding.reveal.title", { amount: formatAmount(amount, currency, false, language) })}
        >
            <MonthStrip days={days} firstDay={periodStart} today={now} />
        </FirstRun>
    );
}
