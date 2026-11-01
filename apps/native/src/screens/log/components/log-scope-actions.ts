import type { MenuAction } from "@expo/ui/community/menu";

import type { LogMeasure } from "@/domain/log-measure";
import type { TranslateFn } from "@/i18n/context";

import { MEASURE_WORD_KEY } from "../labels";

const MEASURES: readonly LogMeasure[] = ["net", "in", "out"];
const MANAGE_CURRENCIES_ACTION = "log.currency.manage";
/** Keeps a currency code from ever matching a measure id. */
const CURRENCY_PREFIX = "currency:";

export interface LogScopeMenuProps {
    currencies: readonly string[];
    currency: string;
    label: string;
    measure: LogMeasure;
    onCurrency: (code: string) => void;
    onManageCurrencies: () => void;
    onMeasure: (measure: LogMeasure) => void;
}

// SAFETY: keeps `state` the union rather than one literal.
const checked = (on: boolean) => (on ? "on" : "off") as "on" | "off";

export function logScopeActions(
    { currencies, currency, measure }: Pick<LogScopeMenuProps, "currencies" | "currency" | "measure">,
    t: TranslateFn
): MenuAction[] {
    return [
        {
            displayInline: true,
            id: "log.scope.measure",
            subactions: MEASURES.map((option) => ({
                id: option,
                state: checked(option === measure),
                title: t(MEASURE_WORD_KEY[option]),
            })),
            title: "",
        },
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
    {
        onCurrency,
        onManageCurrencies,
        onMeasure,
    }: Pick<LogScopeMenuProps, "onCurrency" | "onManageCurrencies" | "onMeasure">,
    id: string
): void {
    if (id === MANAGE_CURRENCIES_ACTION) {
        onManageCurrencies();
        return;
    }
    if (id.startsWith(CURRENCY_PREFIX)) {
        onCurrency(id.slice(CURRENCY_PREFIX.length));
        return;
    }
    const measure = MEASURES.find((option) => option === id);
    if (measure !== undefined) {
        onMeasure(measure);
    }
}
