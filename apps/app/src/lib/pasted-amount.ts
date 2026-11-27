import { parseAmount } from "./account-writes";

const LABELLED_FIGURE = /^[^\d]*\d[\d\s.,]*[^\d]*$/u;
const NOT_A_FIGURE = /[^\d\s.,-]/u;

export const pastedAmount = (text: string, decimals: number): number | null =>
    LABELLED_FIGURE.test(text.trim()) && NOT_A_FIGURE.test(text) ? parseAmount(text, decimals) : null;
