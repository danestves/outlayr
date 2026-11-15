import { LANGUAGES } from "@outlayr/shared/i18n";
import { useLocale } from "react-intlayer";

import { formatMoney, moneyParts } from "./money";

const MINUS = "−";

function useTag() {
    const { locale } = useLocale();
    return LANGUAGES[locale].date;
}

export function useMoney() {
    const tag = useTag();
    return (value: number, { code = "USD", plus = false, whole = false } = {}) => {
        const negative = value < 0 && Math.round(Math.abs(value) * 100) > 0;
        const positive = plus && value > 0 ? "+" : "";
        const sign = negative ? MINUS : positive;
        return `${sign}${formatMoney(Math.abs(value), code, tag, whole ? 0 : 2)}`;
    };
}

export function useCurrencyMarks() {
    const tag = useTag();
    const parts = moneyParts(1.5, "USD", tag, 2);
    const at = (type: Intl.NumberFormatPartTypes) => parts.findIndex((part) => part.type === type);
    const join = (list: typeof parts) =>
        list
            .map((part) => part.value)
            .join("")
            .trim();
    return {
        decimal: parts[at("decimal")]?.value ?? ".",
        prefix: join(parts.slice(0, at("integer"))),
        suffix: join(parts.slice(at("fraction") + 1)),
        tag,
    };
}
