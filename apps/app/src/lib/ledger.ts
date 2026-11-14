import { DAY_MS, wallNoon } from "@outlayr/money/ledger-zone";

export const daysBetween = (from: string, to: string) => Math.round((wallNoon(to) - wallNoon(from)) / DAY_MS);

export function addDays(day: string, days: number) {
    return new Date(wallNoon(day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function shortDay(day: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(wallNoon(day));
}

const pad = (value: number) => String(value).padStart(2, "0");

/** A minute of the day as the "HH:MM" a time input reads and writes. */
export const clockOf = (minute: number) => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

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
    // Intl has no symbol for the bolivar in en-US and would spell out its code.
    return new Intl.NumberFormat("en-US", {
        currency,
        signDisplay: sign === "always" ? "exceptZero" : "auto",
        style: "currency",
        ...wholeUnits(amount, showCents),
    })
        .format(amount)
        .replace("VES", "Bs");
}
