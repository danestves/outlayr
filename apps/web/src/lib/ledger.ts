const DAY_MS = 86_400_000;

/** Calendar days arrive as `YYYY-MM-DD` on the owner's wall clock; read them at UTC noon so no zone shifts the day. */
const dayMs = (day: string) => Date.parse(`${day}T12:00:00Z`);

export const daysBetween = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / DAY_MS);

export function addDays(day: string, days: number) {
    return new Date(dayMs(day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function todayIn(timeZone?: string) {
    return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone, year: "numeric" }).format(
        new Date()
    );
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

export function clockTime(time: string) {
    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
        Date.UTC(2000, 0, 1, hours, minutes)
    );
}

export function money(amount: number, currency: string, sign: "always" | "auto" = "auto") {
    return new Intl.NumberFormat("en-US", {
        currency,
        signDisplay: sign === "always" ? "exceptZero" : "auto",
        style: "currency",
    }).format(amount);
}

/** Splits a figure so the whole units can be drawn larger than the symbol and the cents. */
export function moneyParts(amount: number, currency: string) {
    const parts = new Intl.NumberFormat("en-US", {
        currency,
        signDisplay: "exceptZero",
        style: "currency",
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

/**
 * Where a budget stands against an even spend across its window, counting today as spent.
 * `underPace` is positive when spending trails that line.
 */
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
