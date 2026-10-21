import { dinero, halfEven, toDecimal, transformScale, USD } from "dinero.js/bigint";

import { assertFiniteNumber } from "./assert";
import { DEFAULT_MONEY_DECIMALS, decimalsFor } from "./currency";
import { toScaledInt } from "./scaled-int";

// Half-even on the exact decimal, not the binary double (`2.675 -> 2.68`). Display only: canonical USD is stored
// unrounded, so sum at full precision and round once.
export function roundMoney(value: number, decimals: number = DEFAULT_MONEY_DECIMALS): number {
    if (!Number.isFinite(value)) {
        throw new TypeError(`roundMoney received a non-finite value: ${value}`);
    }
    const { amount, scale } = toScaledInt(value);
    const money = dinero({ amount, currency: USD, scale });
    const rounded = transformScale(money, BigInt(decimals), halfEven);
    return Number(toDecimal(rounded));
}

// USD returns unrounded, keeping sub-cent precision. Keyed on the code, not `rate === 1`: pegs like BSD, PAB and
// BMD quote at 1.0 and still owe their own exponent.
export function convertFromUsd(amountUsd: number, rate: number, code: string): number {
    assertFiniteNumber(amountUsd, "amountUsd");
    assertFiniteNumber(rate, "rate");
    if (rate === 1 && code === "USD") {
        return amountUsd;
    }
    const amount = toScaledInt(amountUsd);
    const scaledRate = toScaledInt(rate);
    const product = dinero({
        amount: amount.amount * scaledRate.amount,
        currency: USD,
        scale: amount.scale + scaledRate.scale,
    });
    const rounded = transformScale(product, BigInt(decimalsFor(code)), halfEven);
    return Number(toDecimal(rounded));
}
