import type { MenuAction } from "@expo/ui/community/menu";

import type { LogPeriod } from "@/data/log-totals";
import { LOG_PERIOD_ORDER } from "@/data/log-totals";
import type { TranslateFn } from "@/i18n/context";

import { HEAD_PERIOD_KEY } from "../labels";

const MANAGE_CURRENCIES_ACTION = "log.currency.manage";
const CURRENCY_PREFIX = "currency:";
const PERIOD_PREFIX = "period:";

export interface LogHeadMenuProps {
    actions: MenuAction[];
    label: string;
    onPressAction: (id: string) => void;
}

// SAFETY: keeps `state` the union rather than one literal.
const checked = (on: boolean) => (on ? "on" : "off") as "on" | "off";

export function logPeriodActions(period: LogPeriod, t: TranslateFn): MenuAction[] {
    return [
        {
            displayInline: true,
            id: "log.scope.period",
            subactions: LOG_PERIOD_ORDER.map((option) => ({
                id: `${PERIOD_PREFIX}${option}`,
                state: checked(option === period),
                title: t(HEAD_PERIOD_KEY[option]),
            })),
            title: t("log.toolbar.period"),
        },
    ];
}

export function pressLogPeriodAction(onPeriod: (period: LogPeriod) => void, id: string): void {
    const period = LOG_PERIOD_ORDER.find((option) => id === `${PERIOD_PREFIX}${option}`);
    if (period) {
        onPeriod(period);
    }
}

export function logCurrencyActions(currencies: readonly string[], currency: string, t: TranslateFn): MenuAction[] {
    return [
        {
            displayInline: true,
            id: "log.scope.currency",
            subactions: [
                ...currencies.map((code) => ({
                    id: `${CURRENCY_PREFIX}${code}`,
                    state: checked(code === currency),
                    title: code,
                })),
                { id: MANAGE_CURRENCIES_ACTION, title: t("log.insights.currencyManage") },
            ],
            title: t("log.insights.currency"),
        },
    ];
}

export function pressLogCurrencyAction(
    { onCurrency, onManageCurrencies }: { onCurrency: (code: string) => void; onManageCurrencies: () => void },
    id: string
): void {
    if (id === MANAGE_CURRENCIES_ACTION) {
        onManageCurrencies();
        return;
    }
    if (id.startsWith(CURRENCY_PREFIX)) {
        onCurrency(id.slice(CURRENCY_PREFIX.length));
    }
}
