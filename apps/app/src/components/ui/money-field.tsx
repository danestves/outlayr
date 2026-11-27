import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { CurrencyInput } from "panelui-web/currency-input";
import type { CurrencyInputProps, CurrencyOption } from "panelui-web/currency-input";
import { useMemo } from "react";
import type { ClipboardEvent } from "react";

import { useExchangeLocale } from "@/lib/exchange-locale";
import { pastedAmount } from "@/lib/pasted-amount";

export interface MoneyFieldProps extends Omit<CurrencyInputProps, "currencies" | "labels" | "locale"> {
    codes?: readonly string[];
}

export function MoneyField({
    codes = PICKABLE_CURRENCY_CODES,
    defaultValue,
    onPaste,
    onValueChange,
    value,
    ...props
}: MoneyFieldProps) {
    const { currencyLabels, locale } = useExchangeLocale();
    const currencies = useMemo(
        () =>
            codes.map((code): CurrencyOption => {
                const display = currencyDisplayFor(code);
                return { code, decimals: decimalsFor(code), name: display.name, symbol: display.symbol };
            }),
        [codes]
    );
    const paste = (event: ClipboardEvent<HTMLDivElement>) => {
        onPaste?.(event);
        if (event.defaultPrevented) {
            return;
        }
        const code = value?.code ?? defaultValue?.code;
        if (code === undefined) {
            return;
        }
        const amount = pastedAmount(event.clipboardData.getData("text"), decimalsFor(code));
        if (amount === null || onValueChange === undefined) {
            return;
        }
        event.preventDefault();
        onValueChange({ amount, code });
    };
    return (
        <CurrencyInput
            currencies={currencies}
            defaultValue={defaultValue}
            labels={currencyLabels}
            locale={locale}
            onPaste={paste}
            onValueChange={onValueChange}
            value={value}
            {...props}
        />
    );
}
