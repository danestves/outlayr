const DAY_MS = 86_400_000;

const dayMs = (day: string) => Date.parse(`${day}T12:00:00Z`);

export const daysBetween = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / DAY_MS);

export function addDays(day: string, days: number) {
    return new Date(dayMs(day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayLabel(day: string, today: string) {
    const gap = daysBetween(day, today);
    if (gap === 0) {
        return "Today";
    }
    if (gap === 1) {
        return "Yesterday";
    }
    return longDay(day);
}

export function longDay(day: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" })
        .format(dayMs(day))
        .replace(/^(\w+)/, "$1,");
}

export function shortDay(day: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(dayMs(day));
}

export function clockTime(time: string, use24HourClock = false) {
    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    return new Intl.DateTimeFormat("en-US", {
        hour: use24HourClock ? "2-digit" : "numeric",
        hourCycle: use24HourClock ? "h23" : "h12",
        minute: "2-digit",
        timeZone: "UTC",
    }).format(Date.UTC(2000, 0, 1, hours, minutes));
}

const wholeUnits = (amount: number, showCents: boolean) =>
    showCents || (amount !== 0 && Math.abs(amount) < 0.5) ? {} : { maximumFractionDigits: 0, minimumFractionDigits: 0 };

export function money(amount: number, currency: string, sign: "always" | "auto" = "auto", showCents = true) {
    return new Intl.NumberFormat("en-US", {
        currency,
        signDisplay: sign === "always" ? "exceptZero" : "auto",
        style: "currency",
        ...wholeUnits(amount, showCents),
    }).format(amount);
}

export function moneyParts(amount: number, currency: string, showCents = true) {
    const parts = new Intl.NumberFormat("en-US", {
        currency,
        signDisplay: "exceptZero",
        style: "currency",
        ...wholeUnits(amount, showCents),
    }).formatToParts(amount);
    const pick = (types: Intl.NumberFormatPartTypes[]) =>
        parts
            .filter((part) => types.includes(part.type))
            .map((part) => part.value)
            .join("");
    return {
        fraction: pick(["decimal", "fraction"]),
        lead: pick(["minusSign", "plusSign", "currency", "literal"]),
        whole: pick(["integer", "group"]),
    };
}

export function budgetPace(
    budget: { readonly effectiveLimit: number; readonly from: string; readonly spent: number; readonly to: string },
    today: string
) {
    const length = daysBetween(budget.from, budget.to) + 1;
    const elapsed = Math.min(Math.max(daysBetween(budget.from, today) + 1, 0), length);
    const expected = (budget.effectiveLimit * elapsed) / length;
    return {
        daysLeft: Math.max(daysBetween(today, budget.to), 0),
        elapsedShare: elapsed / length,
        spentShare: budget.effectiveLimit > 0 ? Math.min(budget.spent / budget.effectiveLimit, 1) : 1,
        underPace: expected - budget.spent,
    };
}
