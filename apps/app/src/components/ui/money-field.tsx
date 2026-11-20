import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { CurrencyInput } from "panelui-web/currency-input";
import type { CurrencyInputProps, CurrencyOption } from "panelui-web/currency-input";
import { useMemo } from "react";

import { useExchangeLocale } from "@/lib/exchange-locale";

export interface MoneyFieldProps extends Omit<CurrencyInputProps, "currencies" | "labels" | "locale"> {
    codes?: readonly string[];
}

export function MoneyField({ codes = PICKABLE_CURRENCY_CODES, ...props }: MoneyFieldProps) {
    const { currencyLabels, locale } = useExchangeLocale();
    const currencies = useMemo(
        () =>
            codes.map((code): CurrencyOption => {
                const display = currencyDisplayFor(code);
                return { code, decimals: decimalsFor(code), name: display.name, symbol: display.symbol };
            }),
        [codes]
    );
    return <CurrencyInput currencies={currencies} labels={currencyLabels} locale={locale} {...props} />;
}
