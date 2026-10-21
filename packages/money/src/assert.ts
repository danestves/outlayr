import { MoneyValidationError } from "./errors";

const MAX_EPOCH_MS = 8.64e15;

// Convex's float64 accepts non-finite values, so every user-supplied number passes this before storage or math.
export function assertFiniteNumber(value: number, label: string): void {
    if (!Number.isFinite(value)) {
        throw new MoneyValidationError(`${label} must be a finite number, got: ${value}`);
    }
}

export function assertOptionalFiniteNumber(value: number | undefined, label: string): void {
    if (value !== undefined) {
        assertFiniteNumber(value, label);
    }
}

// Epoch ms beyond |8.64e15| are finite but make `utcDateString` throw a raw RangeError.
export function assertValidEpochMs(value: number, label: string): void {
    assertFiniteNumber(value, label);
    if (Math.abs(value) > MAX_EPOCH_MS) {
        throw new MoneyValidationError(`${label} must be a valid epoch-milliseconds timestamp, got: ${value}`);
    }
}

export function assertOptionalValidEpochMs(value: number | undefined, label: string): void {
    if (value !== undefined) {
        assertValidEpochMs(value, label);
    }
}
