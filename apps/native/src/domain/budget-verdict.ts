import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

import type { Burndown } from "./budget-burndown";
import { monthAbbrev } from "./dates";
import { formatAmount } from "./money";

export function burndownVerdict(
    burndown: Burndown,
    currency: string,
    language: Language,
    t: TranslateFn
): string | null {
    const { projectedBalance, runwayDate, runwayDay, totalDays } = burndown;
    if (runwayDate && runwayDay != null) {
        const date = `${runwayDate.getDate()} ${monthAbbrev(runwayDate, language)}`;
        const early = totalDays - runwayDay;
        return early > 0
            ? t("budgets.hero.verdictRanOutEarly", { date, days: t("budgets.days", { count: early }) })
            : t("budgets.hero.verdictRanOutFinal", { date });
    }
    if (projectedBalance != null && projectedBalance < 0) {
        return t("budgets.hero.verdictEndsShort", {
            amount: formatAmount(Math.abs(projectedBalance), currency, false, language),
        });
    }
    return null;
}
