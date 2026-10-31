import { useRouter } from "expo-router";
import { View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { MeasureStrip } from "@/components/import-sheet/measure-strip";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useYearPlan } from "@/data/budget-plans";
import type { Database } from "@/db/client";
import { formatAmount } from "@/domain/money";
import { isShort, monthDriver } from "@/domain/year-plan";
import type { MonthProjection } from "@/domain/year-plan";
import { useLanguage, useTranslation } from "@/i18n/context";

import { MonthBars } from "./components/month-bars";
import { PlanCell } from "./components/plan-cell";
import { PlanGrid } from "./components/plan-grid";
import { categoryName, monthName, yearVerdict } from "./plan-copy";

export function YearView({ db, nowMs }: { db: Database; nowMs: number }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const { showCents } = useDisplaySettings().state;
    const year = new Date(nowMs).getFullYear();
    const { categories, currency, projection } = useYearPlan(db, nowMs, year);
    const money = (value: number) => formatAmount(value, currency, false, language);
    const ahead = projection.months.filter((month) => month.status !== "closed");
    const shortCount = ahead.filter(isShort).length;
    const over = projection.unassigned < 0;

    const caption = (month: MonthProjection) => {
        const parts = [t("budgets.ofLimit", { limit: money(month.in) })];
        if (month.status === "closed") {
            parts.push(t("budgets.plan.closed"));
        } else {
            const driver = monthDriver(projection, month);
            const entry = month.categories.find((candidate) => candidate.categoryId === driver);
            if (driver !== null && entry) {
                parts.push(`${categoryName(categories.get(driver), t)} ${money(entry.projected)}`);
            }
        }
        return parts.join(" · ");
    };

    return (
        <View>
            <View className="flex-row items-baseline justify-between">
                <MonoLabel>{t("budgets.plan.everything", { year })}</MonoLabel>
                <MonoLabel>{t("budgets.plan.monthsAhead", { count: projection.monthsAhead })}</MonoLabel>
            </View>
            <View className="pt-2">
                <HeroNumber
                    amount={Math.abs(projection.unassigned)}
                    code={currency}
                    showCents={showCents}
                    sign=""
                    size={48}
                    toneClass={over ? "text-over-budget" : "text-foreground"}
                />
            </View>
            <Text className="text-footnote text-muted pt-0.5">
                {over ? t("budgets.plan.overAssigned", { year }) : t("budgets.plan.unassigned", { year })}
            </Text>
            <Text className="text-footnote text-foreground pt-2.5 leading-snug">
                {yearVerdict(projection, categories, language, t)}
            </Text>

            <View className="flex-row items-baseline justify-between pt-6 pb-2.5">
                <MonoLabel>{t("budgets.plan.leftEachMonth")}</MonoLabel>
                <MonoLabel>{t("budgets.plan.outlinesArePlan")}</MonoLabel>
            </View>
            <MonthBars currency={currency} months={projection.months} />

            <View className="pt-5">
                <MeasureStrip
                    cells={[
                        { figure: money(projection.totals.in), key: "in", label: t("budgets.plan.measure.in") },
                        {
                            figure: money(projection.totals.setAside),
                            key: "setAside",
                            label: t("budgets.plan.measure.setAside"),
                        },
                        { figure: money(projection.totals.out), key: "out", label: t("budgets.plan.measure.out") },
                    ]}
                />
            </View>

            <View className="flex-row items-baseline justify-between pt-6 pb-2">
                <MonoLabel>{t("budgets.plan.months")}</MonoLabel>
                {shortCount > 0 ? (
                    <MonoLabel>{t("budgets.plan.shortCount", { short: shortCount, total: ahead.length })}</MonoLabel>
                ) : null}
            </View>
            <PlanGrid
                items={projection.months}
                keyOf={(month) => String(month.key)}
                renderCell={(month, right, width) => {
                    const short = month.left < 0;
                    return (
                        <PlanCell
                            amount={Math.abs(month.left)}
                            caption={caption(month)}
                            currency={currency}
                            fill={month.in > 0 ? (month.out + month.setAside) / month.in : 1}
                            key={month.key}
                            label={monthName(month.key, language)}
                            onPress={() => router.push(`/budgets/plan/${month.key}`)}
                            right={right}
                            suffix={short ? t("budgets.plan.suffix.short") : t("budgets.suffix.left")}
                            tone={short ? "short" : "plain"}
                            width={width}
                        />
                    );
                }}
            />
        </View>
    );
}
