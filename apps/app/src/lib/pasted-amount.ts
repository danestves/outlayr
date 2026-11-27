import { parseAmount } from "./account-writes";

export const pastedAmount = (text: string, decimals: number): number | null =>
    /\d/u.test(text) ? parseAmount(text, decimals) : null;
