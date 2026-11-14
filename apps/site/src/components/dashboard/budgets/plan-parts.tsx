import { firstShortRun } from "@outlayr/money/year-plan";
import type { MonthKey, YearProjection } from "@outlayr/money/year-plan";
import { useIntlayer } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";

import { useMonthNames } from "./parts";
import { periodKeyOfMonth, UNCATEGORIZED_IN, UNCATEGORIZED_OUT } from "./plan-model";
import type { PlanCategoryMeta } from "./plan-model";

export function usePlanName() {
    const copy = useIntlayer("dashboard-budgets-plan");
    const categoryName = useCategoryName();
    return (meta: Pick<PlanCategoryMeta, "id" | "name"> | undefined) => {
        if (!meta || meta.id === UNCATEGORIZED_OUT) {
            return copy.uncategorizedOut.value;
        }
        if (meta.id === UNCATEGORIZED_IN) {
            return copy.uncategorizedIn.value;
        }
        return categoryName({ id: meta.id, name: meta.name ?? "" });
    };
}

export function usePlanMonths() {
    const names = useMonthNames();
    return {
        long: (key: MonthKey) => names.long(periodKeyOfMonth(key)),
        month: (key: MonthKey) => names.month(periodKeyOfMonth(key)),
        short: (key: MonthKey) => names.short(periodKeyOfMonth(key)),
    };
}

/** "Groceries" bar: the share used in the category's colour, and the overshoot past the plan in red. */
export function PlanUsed({ color, planned, spent }: { color: string; planned: number; spent: number }) {
    const over = spent > planned + 0.5;
    let fill = planned > 0 ? Math.min(1, spent / planned) : 0;
    if (over) {
        fill = planned > 0 ? planned / spent : 0;
    }
    return (
        <div
            aria-hidden
            className="flex h-2 gap-0.5 overflow-hidden rounded-full"
            style={{ background: `color-mix(in oklab, ${color} 22%, transparent)` }}
        >
            <i className="block h-full rounded-full" style={{ background: color, width: `${fill * 100}%` }} />
            {over ? <i className="bg-app-spend block h-full flex-1 rounded-full" /> : null}
        </div>
    );
}

/** "November runs short on Shopping. You're back in December.", or null when no month ahead runs short. */
export function useShortRunSentence() {
    const { chart } = useIntlayer("dashboard-budgets-plan");
    const months = usePlanMonths();
    const planName = usePlanName();
    return (projection: YearProjection, categories: ReadonlyMap<string, PlanCategoryMeta>) => {
        const run = firstShortRun(projection);
        if (!run) {
            return null;
        }
        const driver = run.driver === null ? undefined : categories.get(run.driver);
        const from = months.month(run.from);
        const to = months.month(run.to);
        const category = driver ? planName(driver) : "";
        let line = driver ? chart.runs({ category, month: from }).value : chart.runsPlain({ month: from }).value;
        if (run.from !== run.to) {
            line = driver ? chart.runsRange({ category, from, to }).value : chart.runsRangePlain({ from, to }).value;
        }
        const after =
            run.backIn === null ? chart.yearEnds.value : chart.backIn({ month: months.month(run.backIn) }).value;
        return `${line} ${after}`;
    };
}
