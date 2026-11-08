import type { MenuAction } from "@expo/ui/community/menu";

import type { TranslateFn } from "@/i18n/context";

const MANAGE_CURRENCIES_ACTION = "log.currency.manage";
const CURRENCY_PREFIX = "currency:";

export interface LogScopeMenuProps {
    currencies: readonly string[];
    currency: string;
    label: string;
    onCurrency: (code: string) => void;
    onManageCurrencies: () => void;
}

// SAFETY: keeps `state` the union rather than one literal.
const checked = (on: boolean) => (on ? "on" : "off") as "on" | "off";

export function logScopeActions(
    { currencies, currency }: Pick<LogScopeMenuProps, "currencies" | "currency">,
    t: TranslateFn
): MenuAction[] {
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

export function pressLogScopeAction(
    { onCurrency, onManageCurrencies }: Pick<LogScopeMenuProps, "onCurrency" | "onManageCurrencies">,
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
