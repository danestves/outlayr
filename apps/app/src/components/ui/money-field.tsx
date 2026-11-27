import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { CurrencyInput } from "panelui-web/currency-input";
import type { CurrencyInputProps, CurrencyOption } from "panelui-web/currency-input";
import { useMemo, useRef } from "react";
import type { ChangeEvent } from "react";

import { useExchangeLocale } from "@/lib/exchange-locale";
import { typedFigure } from "@/lib/typed-figure";

export interface MoneyFieldProps extends Omit<CurrencyInputProps, "currencies" | "labels" | "locale"> {
    codes?: readonly string[];
}

export function MoneyField({ codes = PICKABLE_CURRENCY_CODES, onChangeCapture, ...props }: MoneyFieldProps) {
    const { currencyLabels, locale } = useExchangeLocale();
    const labelled = useRef(false);
    const currencies = useMemo(
        () =>
            codes.map((code): CurrencyOption => {
                const display = currencyDisplayFor(code);
                return { code, decimals: decimalsFor(code), name: display.name, symbol: display.symbol };
            }),
        [codes]
    );
    const dropLabel = (event: ChangeEvent<HTMLDivElement>) => {
        onChangeCapture?.(event);
        const { target } = event;
        if (!(target instanceof HTMLInputElement) || target.dataset.slot !== "currency-input-amount") {
            return;
        }
        const typed = typedFigure(target.value, labelled.current);
        labelled.current = typed.labelled;
        if (typed.figure !== target.value) {
            target.value = typed.figure;
        }
    };
    return (
        <CurrencyInput
            currencies={currencies}
            labels={currencyLabels}
            locale={locale}
            onChangeCapture={dropLabel}
            {...props}
        />
    );
}
