export const CURRENCIES = {
    CAD: { symbol: "$" },
    EUR: { symbol: "€" },
    MXN: { symbol: "MX$" },
    USD: { symbol: "$" },
    VES: { symbol: "Bs." },
} as const;

export type Currency = keyof typeof CURRENCIES;

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

export function formatMoney(amount: number, currency: Currency): string {
    const [integer = "0", fraction = "00"] = Math.abs(amount).toFixed(2).split(".");
    return `${CURRENCIES[currency].symbol}${integer.replaceAll(THOUSANDS, ",")}.${fraction}`;
}

export function signedMoney(amount: number, currency: Currency, income: boolean): string {
    return `${income ? "+" : "-"}${formatMoney(amount, currency)}`;
}
