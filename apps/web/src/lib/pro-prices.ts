import { localProPriceRow, proPrice } from "@outlayr/money/pro-prices";

const MONTHS_PER_YEAR = 12;

export function proPrices(country: string | null, language: string) {
    const local = localProPriceRow(country);
    const { amount: monthly, currency } = proPrice(country, "monthly");
    const { amount: yearly } = proPrice(country, "annual");
    const { amount: once } = proPrice(country, "lifetime");
    const format = new Intl.NumberFormat(local ? `${language}-${country}` : language, {
        currency,
        style: "currency",
        trailingZeroDisplay: "stripIfInteger",
    });
    const parts = format.formatToParts(monthly);
    const decimal = parts.findIndex((part) => part.type === "decimal");
    const split = decimal === -1 ? parts.length : decimal;
    return {
        country: local ? country : null,
        monthly: {
            fraction: parts
                .slice(split)
                .map((part) => part.value)
                .join(""),
            whole: parts
                .slice(0, split)
                .map((part) => part.value)
                .join(""),
        },
        once: format.format(once),
        zero: format.format(0),
        yearly: format.format(yearly),
    };
}

export function paywallPrices(country: string | null, language: string) {
    const { amount: monthly, currency } = proPrice(country, "monthly");
    const { amount: annual } = proPrice(country, "annual");
    const { amount: lifetime } = proPrice(country, "lifetime");
    const format = new Intl.NumberFormat(localProPriceRow(country) ? `${language}-${country}` : language, {
        currency,
        style: "currency",
        trailingZeroDisplay: "stripIfInteger",
    });
    return {
        annual: format.format(annual),
        annualPerMonth: format.format(annual / MONTHS_PER_YEAR),
        lifetime: format.format(lifetime),
        monthly: format.format(monthly),
        monthlyPerYear: format.format(monthly * MONTHS_PER_YEAR),
        saving: Math.round((1 - annual / (monthly * MONTHS_PER_YEAR)) * 100),
    };
}
