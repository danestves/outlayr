import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { CurrencyInput } from "panelui-web/currency-input";
import type { CurrencyInputProps, CurrencyOption } from "panelui-web/currency-input";
import { useMemo, useRef } from "react";
import type { ChangeEvent, ClipboardEvent, FocusEvent } from "react";

import { useExchangeLocale } from "@/lib/exchange-locale";
import { carriesLabel, labelledAmount } from "@/lib/labelled-amount";
import { typedFigure } from "@/lib/typed-figure";

export interface MoneyFieldProps extends Omit<CurrencyInputProps, "currencies" | "labels" | "locale"> {
    codes?: readonly string[];
}

const amountInputOf = (target: EventTarget) =>
    target instanceof HTMLInputElement && target.dataset.slot === "currency-input-amount" ? target : null;

export function MoneyField({
    codes = PICKABLE_CURRENCY_CODES,
    onBlurCapture,
    onChangeCapture,
    onPaste,
    onValueChange,
    value,
    ...props
}: MoneyFieldProps) {
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
        const input = amountInputOf(event.target);
        if (input === null) {
            return;
        }
        const typed = typedFigure(input.value, labelled.current);
        labelled.current = typed.labelled;
        if (typed.figure !== input.value) {
            input.value = typed.figure;
        }
    };
    const forgetLabel = (event: FocusEvent<HTMLDivElement>) => {
        onBlurCapture?.(event);
        if (amountInputOf(event.target) !== null) {
            labelled.current = false;
        }
    };
    const paste = (event: ClipboardEvent<HTMLDivElement>) => {
        onPaste?.(event);
        const text = event.clipboardData.getData("text");
        if (event.defaultPrevented || amountInputOf(event.target) === null || !carriesLabel(text)) {
            return;
        }
        event.preventDefault();
        if (value === undefined || onValueChange === undefined) {
            return;
        }
        const amount = labelledAmount(text, decimalsFor(value.code));
        if (amount !== null) {
            onValueChange({ amount, code: value.code });
        }
    };
    return (
        <CurrencyInput
            currencies={currencies}
            labels={currencyLabels}
            locale={locale}
            onBlurCapture={forgetLabel}
            onChangeCapture={dropLabel}
            onPaste={paste}
            onValueChange={onValueChange}
            value={value}
            {...props}
        />
    );
}
