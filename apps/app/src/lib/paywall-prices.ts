import { localProPriceRow, proPrice } from "@outlayr/money/pro-prices";

const MONTHS_PER_YEAR = 12;

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
