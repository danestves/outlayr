import { LANGUAGES } from "@outlayr/shared/i18n";
import type { Locale } from "@outlayr/shared/i18n";

import { formatMoney as format } from "@/lib/money";

export type Currency = "BRL" | "COP" | "EUR" | "MXN" | "USD";

export function formatMoney(amount: number, currency: Currency, locale: Locale): string {
    return format(Math.abs(amount), currency, LANGUAGES[locale].date, 2);
}

export function signedMoney(amount: number, currency: Currency, income: boolean, locale: Locale): string {
    return `${income ? "+" : "-"}${formatMoney(amount, currency, locale)}`;
}
