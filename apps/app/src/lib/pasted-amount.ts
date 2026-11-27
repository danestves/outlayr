import { parseAmount } from "./account-writes";

const DIGIT = /\d/u;
const NOT_A_FIGURE = /[^\d\s.,-]/u;

export const pastedAmount = (text: string, decimals: number): number | null =>
    DIGIT.test(text) && NOT_A_FIGURE.test(text) ? parseAmount(text, decimals) : null;
