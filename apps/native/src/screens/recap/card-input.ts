import { addMonths } from "@outlayr/money/calendar";

import { monthLongTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import type { MonthRecap } from "@/domain/month-recap";
import type { RecapCardInput } from "@/domain/recap-card";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

const APP_URL = "TRYOUTLAYR.COM";

interface CardInputOptions {
    code: string;
    language: Language;
    recap: MonthRecap;
    showAmounts: boolean;
    showCents: boolean;
    t: TranslateFn;
}

function headlineFor({ recap, language, t }: CardInputOptions): string {
    const month = monthLongTitle(recap.start, language);
    const percent = recap.spentChange === null ? 0 : Math.round(Math.abs(recap.spentChange) * 100);
    if (recap.spentChange === null || percent === 0) {
        return t("insights.recap.card.first", { month });
    }
    return t(recap.spentChange > 0 ? "insights.recap.card.more" : "insights.recap.card.less", {
        month: monthLongTitle(addMonths(recap.start, -1), language),
        percent: `${percent}%`,
    });
}

export function recapCardInput(options: CardInputOptions): RecapCardInput {
    const { code, language, recap, showAmounts, showCents, t } = options;
    const money = (amount: number) => formatAmount(amount, code, showCents, language);
    return {
        categories: recap.topCategories.map((entry) => ({
            amount: showAmounts ? money(entry.amount) : null,
            color: entry.color,
            fraction: entry.fraction,
            name: entry.name,
            percent: `${Math.round(entry.fraction * 100)}%`,
        })),
        daysLine: t("insights.recap.card.days", { logged: recap.daysLogged, total: recap.daysInMonth }),
        headline: headlineFor(options),
        monthLabel: `${monthLongTitle(recap.start, language)} ${recap.start.getFullYear()}`.toUpperCase(),
        total: showAmounts ? money(recap.spent) : null,
        url: APP_URL,
    };
}
