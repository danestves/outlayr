import { roundMoney } from "@outlayr/money/round";

export type FeeSide = "source" | "destination";
export type TransferField = "arrived" | "fee" | "rate" | "sent";

export interface TransferValues {
    arrived: number;
    fee: number;
    feeSide: FeeSide;
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

function convertedPortion(values: TransferValues): number {
    return values.feeSide === "source" ? values.sent - values.fee : values.sent;
}

function preFeeArrival(values: TransferValues): number {
    return values.feeSide === "source" ? values.arrived : values.arrived + values.fee;
}

function expectedArrival(values: TransferValues): number {
    const gross = convertedPortion(values) * values.rate;
    return values.feeSide === "source" ? gross : gross - values.fee;
}

function solveArrived(values: TransferValues, decimals: number): number | null {
    return Number.isFinite(values.rate) ? money(expectedArrival(values), decimals) : null;
}

function solveSent(values: TransferValues, decimals: number): number | null {
    if (!finitePositive(values.rate)) {
        return null;
    }
    const converted = preFeeArrival(values) / values.rate;
    return money(values.feeSide === "source" ? converted + values.fee : converted, decimals);
}

function neededFee(values: TransferValues): number | null {
    if (!finitePositive(values.rate)) {
        return null;
    }
    return values.feeSide === "source"
        ? values.sent - values.arrived / values.rate
        : values.sent * values.rate - values.arrived;
}

function solveFee(values: TransferValues, decimals: number): number | null {
    const fee = neededFee(values);
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
        case "fee": {
            return solveFee(values, decimals);
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

export function transferGap(values: TransferValues, feeDecimals: number, arrivalDecimals: number): number {
    const needed = neededFee(values);
    if (needed === null || solveArrived(values, arrivalDecimals) === values.arrived) {
        return 0;
    }
    return roundMoney(roundMoney(needed, feeDecimals) - values.fee, feeDecimals) || 0;
}
