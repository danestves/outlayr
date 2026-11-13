import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { Exchange } from "panelui-web/exchange";
import type { ExchangeColor, ExchangeCurrency } from "panelui-web/exchange";
import { useIntlayer } from "react-intlayer";

import { useExchangeLocale } from "@/lib/exchange-locale";

import { SettingsCard } from "./parts";

const START_AMOUNT = 100;
const MARK_COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const satisfies readonly ExchangeColor[];

export function CurrencyConverter({
    codes,
    rate,
}: {
    codes: readonly string[];
    rate: (code: string) => number | null;
}) {
    const { currency: text } = useIntlayer("dashboard-settings");
    const { labels, locale } = useExchangeLocale();
    const priced = codes.flatMap((code) => {
        const perUsd = rate(code);
        return perUsd === null ? [] : [{ code, perUsd }];
    });
    const [from, to] = priced;
    if (!from || !to) {
        return null;
    }
    const currencies = priced.map(({ code }, index): ExchangeCurrency => {
        const display = currencyDisplayFor(code);
        return {
            code,
            color: MARK_COLORS[index % MARK_COLORS.length],
            decimals: decimalsFor(code),
            name: display.name,
            symbol: display.symbol,
        };
    });
    const rates = Object.fromEntries(priced.map(({ code, perUsd }) => [code, perUsd]));
    return (
        <SettingsCard title={text.convert}>
            <div className="p-3">
                <Exchange
                    className="mx-auto max-w-sm"
                    currencies={currencies}
                    defaultValue={{ amount: START_AMOUNT, from: from.code, to: to.code }}
                    key={priced.map(({ code }) => code).join(",")}
                    labels={labels}
                    locale={locale}
                    rates={rates}
                >
                    <Exchange.Field label={text.convertFrom.value} side="from" />
                    <Exchange.Swap aria-label={text.convertSwap.value} />
                    <Exchange.Field label={text.convertTo.value} side="to" />
                </Exchange>
            </div>
        </SettingsCard>
    );
}
