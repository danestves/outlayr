const wholeUnits = (amount: number) =>
    amount !== 0 && Math.abs(amount) < 0.5 ? {} : { maximumFractionDigits: 0, minimumFractionDigits: 0 };

export function money(amount: number, currency: string) {
    // Intl has no symbol for the bolivar in en-US and would spell out its code.
    return new Intl.NumberFormat("en-US", { currency, style: "currency", ...wholeUnits(amount) })
        .format(amount)
        .replace("VES", "Bs");
}
