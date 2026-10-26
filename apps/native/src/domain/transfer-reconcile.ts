import { roundMoney } from "@outlayr/money/round";

export type FeeSide = "source" | "destination";
export type TransferField = "arrived" | "rate" | "sent" | FeeSide;

/** A fee per side, each in its own account's currency and zero when that side charged nothing. */
export type TransferFees = Readonly<Record<FeeSide, number>>;

export interface TransferValues {
    arrived: number;
    fees: TransferFees;
    rate: number;
    sent: number;
}

export interface TransferLegs {
    fromAmount: number;
    toAmount: number;
}

// Enough for any real per-USD rate, few enough that `97.3 + 2.7` stops being `100.00000000000001`.
const NOISE_DECIMALS = 10;

function finitePositive(value: number): boolean {
    return Number.isFinite(value) && value > 0;
}

function money(value: number, decimals: number): number | null {
    if (!Number.isFinite(value) || value < 0) {
        return null;
    }
    return roundMoney(value, decimals);
}

export const NO_FEES: TransferFees = { destination: 0, source: 0 };

function convertedPortion(values: TransferValues): number {
    return values.sent - values.fees.source;
}

function preFeeArrival(values: TransferValues): number {
    return values.arrived + values.fees.destination;
}

function expectedArrival(values: TransferValues): number {
    return convertedPortion(values) * values.rate - values.fees.destination;
}

function solveArrived(values: TransferValues, decimals: number): number | null {
    return Number.isFinite(values.rate) ? money(expectedArrival(values), decimals) : null;
}

function solveSent(values: TransferValues, decimals: number): number | null {
    if (!finitePositive(values.rate)) {
        return null;
    }
    return money(preFeeArrival(values) / values.rate + values.fees.source, decimals);
}

/** The whole fee `side` would need to charge, the other side's fee held, for the arrival to reconcile. */
function neededFee(values: TransferValues, side: FeeSide): number | null {
    if (!finitePositive(values.rate)) {
        return null;
    }
    return side === "source"
        ? values.sent - preFeeArrival(values) / values.rate
        : convertedPortion(values) * values.rate - values.arrived;
}

function solveFee(values: TransferValues, side: FeeSide, decimals: number): number | null {
    const fee = neededFee(values, side);
    return fee === null ? null : money(fee, decimals);
}

function solveRate(values: TransferValues, decimals: number): number | null {
    const divisor = convertedPortion(values);
    if (!finitePositive(divisor)) {
        return null;
    }
    const rate = preFeeArrival(values) / divisor;
    if (!finitePositive(rate)) {
        return null;
    }
    const rounded = roundMoney(rate, decimals);
    return finitePositive(rounded) ? rounded : null;
}

export function solveTransfer(values: TransferValues, solveFor: TransferField, decimals: number): number | null {
    switch (solveFor) {
        case "arrived": {
            return solveArrived(values, decimals);
        }
        case "sent": {
            return solveSent(values, decimals);
        }
        case "source":
        case "destination": {
            return solveFee(values, solveFor, decimals);
        }
        default: {
            return solveRate(values, decimals);
        }
    }
}

export function transferLegs(
    values: TransferValues,
    sourceDecimals: number,
    destinationDecimals: number
): TransferLegs | null {
    const fromAmount = money(convertedPortion(values), sourceDecimals);
    const toAmount = money(preFeeArrival(values), destinationDecimals);
    if (fromAmount === null || toAmount === null || !finitePositive(fromAmount) || !finitePositive(toAmount)) {
        return null;
    }
    return { fromAmount, toAmount };
}

export function savedRate(fromAmount: number, toAmount: number, stored: number | null): number | null {
    if (stored === null || !finitePositive(fromAmount)) {
        return stored;
    }
    const blended = toAmount / fromAmount;
    return roundMoney(blended, NOISE_DECIMALS) === stored ? blended : stored;
}

/** Always in the sender's currency: a loss is read in the money that left, whichever side ends up charging it. */
export function transferGap(values: TransferValues, sourceDecimals: number, arrivalDecimals: number): number {
    const needed = neededFee(values, "source");
    if (needed === null || solveArrived(values, arrivalDecimals) === values.arrived) {
        return 0;
    }
    return roundMoney(roundMoney(needed, sourceDecimals) - values.fees.source, sourceDecimals) || 0;
}
