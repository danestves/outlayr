import { calculator, halfEven } from "dinero.js/bigint";

import { MoneyValidationError } from "./errors";

export const DECIMAL_RADIX = 10n;

// Micro-dollars, returned to JS as a `number`: exact only up to 2^53 - 1 of them (about $9.007B). Past that,
// precision is lost without going non-finite, so the overflow guard does not reject it.
export const USD_SCALE = 6n;

export interface ScaledInt {
    amount: bigint;
    scale: bigint;
}

// Reads the shortest round-trip decimal string, which is spec-defined and so identical on V8 and Hermes.
export function toScaledInt(value: number): ScaledInt {
    if (!Number.isFinite(value)) {
        throw new MoneyValidationError(`Cannot represent a non-finite number as a scaled integer: ${value}`);
    }
    // `Number.prototype.toString` only ever emits a lowercase `e` exponent.
    const [mantissa = "0", exponentPart] = value.toString().split("e");
    const exponent = exponentPart ? Number.parseInt(exponentPart, 10) : 0;
    const negative = mantissa.startsWith("-");
    const unsigned = negative ? mantissa.slice(1) : mantissa;
    const [integerDigits = "", fractionDigits = ""] = unsigned.split(".");
    const digits = `${integerDigits}${fractionDigits}`;
    let amount = BigInt(digits === "" ? "0" : digits);
    let scale = fractionDigits.length - exponent;
    if (scale < 0) {
        amount *= DECIMAL_RADIX ** BigInt(-scale);
        scale = 0;
    }
    return { amount: negative ? -amount : amount, scale: BigInt(scale) };
}

// Dinero cannot divide by an arbitrary rate, so a conversion is one exact rational rounded once here.
export function divideHalfEven(numerator: bigint, denominator: bigint): bigint {
    return halfEven(numerator, denominator, calculator);
}
