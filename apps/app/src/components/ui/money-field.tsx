import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { CurrencyInput } from "panelui-web/currency-input";
import type { CurrencyInputProps, CurrencyOption } from "panelui-web/currency-input";
import { useMemo } from "react";
import type { ClipboardEvent, FocusEvent } from "react";

import { useExchangeLocale } from "@/lib/exchange-locale";
import { labelledAmount } from "@/lib/labelled-amount";

export interface MoneyFieldProps extends Omit<CurrencyInputProps, "currencies" | "labels" | "locale"> {
    codes?: readonly string[];
}

export function MoneyField({
    codes = PICKABLE_CURRENCY_CODES,
    onBlur,
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
    const blur = (event: FocusEvent<HTMLDivElement>) => {
        onBlur?.(event);
        const { target } = event;
        const amountInput = target instanceof HTMLInputElement && target.dataset.slot === "currency-input-amount";
        if (value === undefined || onValueChange === undefined || !amountInput) {
            return;
        }
        const amount = labelledAmount(target.value, decimalsFor(value.code));
        if (amount !== null && amount !== value.amount) {
            onValueChange({ amount, code: value.code });
        }
    };
    const paste = (event: ClipboardEvent<HTMLDivElement>) => {
        onPaste?.(event);
        if (event.defaultPrevented) {
            return;
        }
        if (value === undefined || onValueChange === undefined) {
            return;
        }
        const amount = labelledAmount(event.clipboardData.getData("text"), decimalsFor(value.code));
        if (amount === null) {
            return;
        }
        event.preventDefault();
        onValueChange({ amount, code: value.code });
    };
    return (
        <CurrencyInput
            currencies={currencies}
            labels={currencyLabels}
            locale={locale}
            onBlur={blur}
            onPaste={paste}
            onValueChange={onValueChange}
            value={value}
            {...props}
        />
    );
}
