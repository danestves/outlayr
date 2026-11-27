import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { CurrencyInput } from "panelui-web/currency-input";
import type { CurrencyInputProps, CurrencyOption } from "panelui-web/currency-input";
import { useMemo } from "react";
import type { ClipboardEvent, InputEvent } from "react";

import { useExchangeLocale } from "@/lib/exchange-locale";
import { pastedAmount } from "@/lib/pasted-amount";
import { acceptsTypedAmountCharacter, amountSeparators } from "@/lib/typed-amount";

export interface MoneyFieldProps extends Omit<CurrencyInputProps, "currencies" | "labels" | "locale"> {
    codes?: readonly string[];
}

export function MoneyField({
    codes = PICKABLE_CURRENCY_CODES,
    onBeforeInput,
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
    const separators = useMemo(() => amountSeparators(locale), [locale]);
    const beforeInput = (event: InputEvent<HTMLDivElement>) => {
        onBeforeInput?.(event);
        const character = event.data;
        if (event.defaultPrevented || !character || event.nativeEvent.isComposing) {
            return;
        }
        if (event.nativeEvent.inputType !== "insertText") {
            return;
        }
        const text = event.target instanceof HTMLInputElement ? event.target.value : "";
        if (!acceptsTypedAmountCharacter(character, text, separators)) {
            event.preventDefault();
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
        const amount = pastedAmount(event.clipboardData.getData("text"), decimalsFor(value.code));
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
            onBeforeInput={beforeInput}
            onPaste={paste}
            onValueChange={onValueChange}
            value={value}
            {...props}
        />
    );
}
