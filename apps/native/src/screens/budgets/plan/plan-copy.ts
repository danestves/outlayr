import type { PlanCategoryMeta } from "@/data/budget-plans";
import { monthAbbrevTitle, monthLongTitle } from "@/domain/dates";
import { firstShortRun, monthKeyParts } from "@/domain/year-plan";
import type { MonthKey, YearProjection } from "@/domain/year-plan";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

const firstOf = (key: MonthKey) => {
    const { monthIndex, year } = monthKeyParts(key);
    return new Date(year, monthIndex, 1);
};

export const monthName = (key: MonthKey, language: Language): string => monthLongTitle(firstOf(key), language);

export const monthShort = (key: MonthKey, language: Language): string => monthAbbrevTitle(firstOf(key), language);

export function monthRange(from: MonthKey, to: MonthKey, language: Language, t: TranslateFn): string {
    if (from === to) {
        return monthName(from, language);
    }
    return t("budgets.plan.range", { from: monthName(from, language), to: monthName(to, language) });
}

export function categoryName(meta: PlanCategoryMeta | undefined, t: TranslateFn): string {
    return meta?.name ?? t("budgets.plan.uncategorized");
}

export function yearVerdict(
    projection: YearProjection,
    categories: ReadonlyMap<string, PlanCategoryMeta>,
    language: Language,
    t: TranslateFn
): string {
    const run = firstShortRun(projection);
    if (!run) {
        return t("budgets.plan.verdict.clear");
    }
    const single = run.from === run.to;
    const category = run.driver === null ? null : categoryName(categories.get(run.driver), t);
    let opening: string;
    if (single) {
        const month = monthName(run.from, language);
        opening = category
            ? t("budgets.plan.verdict.runOneOn", { category, month })
            : t("budgets.plan.verdict.runOne", { month });
    } else {
        const range = monthRange(run.from, run.to, language, t);
        opening = category
            ? t("budgets.plan.verdict.runRangeOn", { category, range })
            : t("budgets.plan.verdict.runRange", { range });
    }
    const closing =
        run.backIn === null
            ? t("budgets.plan.verdict.through", { month: monthName(run.to, language) })
            : t("budgets.plan.verdict.back", { month: monthName(run.backIn, language) });
    return `${opening} ${closing}`;
}
