// Cents stay exact while `amount * 100` is under 2^53 and `amount` is a SQLite `real`: thirteen digits stays two
// orders of magnitude clear, about where the hero's type stops shrinking (`amount-hero-size.ts`).
const MAX_INTEGER_DIGITS = 13;

export const AMOUNT_CEILING = 10 ** MAX_INTEGER_DIGITS;

const LEADING_ZEROS = /^0+/;
const ZERO_FRACTION = /\.0+$/;

export type NumpadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back" | "clear";

export type NumpadTileKey = Exclude<NumpadKey, "clear">;

// `preDotted` shifts every digit through the minor units (1234 reads as 12.34); `explicitSeparator` takes the "." key.
export type NumpadMode = "preDotted" | "explicitSeparator";

/** Reads Swift's `numberEntryType`: 1 is the pre-dotted keypad, 2 the separator one. */
export function numpadMode(numberEntryType: number): NumpadMode {
    return numberEntryType === 1 ? "preDotted" : "explicitSeparator";
}

function toMinorDigits(current: string, minorUnits: number): string {
    const [integer = "", fraction = ""] = current.split(".");
    return `${integer}${fraction.slice(0, minorUnits).padEnd(minorUnits, "0")}`;
}

function fromMinorDigits(digits: string, minorUnits: number): string {
    const trimmed = digits.replace(LEADING_ZEROS, "");
    if (trimmed === "") {
        return "";
    }
    if (minorUnits === 0) {
        return trimmed;
    }
    const padded = trimmed.padStart(minorUnits + 1, "0");
    const cut = padded.length - minorUnits;
    return `${padded.slice(0, cut)}.${padded.slice(cut)}`;
}

function applyPreDottedKey(current: string, key: Exclude<NumpadTileKey, ".">, minorUnits: number): string {
    const digits = toMinorDigits(current, minorUnits);
    const next = key === "back" ? digits.slice(0, -1) : `${digits}${key}`;
    const entry = fromMinorDigits(next, minorUnits);
    const [integer = ""] = entry.split(".");
    return integer.length > MAX_INTEGER_DIGITS ? current : entry;
}

export function applyNumpadKey(current: string, key: NumpadKey, minorUnits: number, mode: NumpadMode): string {
    if (key === "clear") {
        return "";
    }
    if (mode === "preDotted") {
        return key === "." ? current : applyPreDottedKey(current, key, minorUnits);
    }
    if (key === "back") {
        return current.slice(0, -1);
    }
    if (key === ".") {
        if (minorUnits === 0 || current.includes(".")) {
            return current;
        }
        return current === "" ? "0." : `${current}.`;
    }
    const [integer = "", fraction = ""] = current.split(".");
    const hasDot = current.includes(".");
    if (hasDot) {
        if (fraction.length >= minorUnits) {
            return current;
        }
        return `${current}${key}`;
    }
    const nextInteger = integer === "0" ? key : `${integer}${key}`;
    if (nextInteger.length > MAX_INTEGER_DIGITS) {
        return current;
    }
    return nextInteger;
}

export function numpadToNumber(value: string): number {
    if (value === "" || value === ".") {
        return 0;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function numberToNumpad(amount: number, minorUnits: number): string {
    if (amount <= 0) {
        return "";
    }
    const fixed = amount.toFixed(minorUnits);
    return fixed.replace(ZERO_FRACTION, "");
}

export function wholeUnitsToNumpad(amount: number): string {
    return numberToNumpad(Math.round(amount), 0);
}

const NOT_AMOUNT_CHARACTER = /[^\d.]/g;
const NOT_DIGIT = /\D/g;

export function decimalPadEntry(text: string, minorUnits: number, mode: NumpadMode): string {
    if (mode === "preDotted") {
        const digits = text.replaceAll(NOT_DIGIT, "").replace(LEADING_ZEROS, "");
        return fromMinorDigits(digits.slice(0, MAX_INTEGER_DIGITS + minorUnits), minorUnits);
    }
    const [typedInteger = "", ...fractions] = text.replaceAll(",", ".").replaceAll(NOT_AMOUNT_CHARACTER, "").split(".");
    const integer = typedInteger.replace(LEADING_ZEROS, "").slice(0, MAX_INTEGER_DIGITS);
    if (fractions.length === 0 || minorUnits === 0) {
        return integer === "" && typedInteger !== "" ? "0" : integer;
    }
    return `${integer === "" ? "0" : integer}.${fractions.join("").slice(0, minorUnits)}`;
}

export function decimalPadSeed(amount: number, minorUnits: number, mode: NumpadMode): string {
    if (mode === "preDotted" && amount > 0) {
        return amount.toFixed(minorUnits);
    }
    return numberToNumpad(amount, minorUnits);
}
