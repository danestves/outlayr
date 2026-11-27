import { parseAmount } from "./account-writes";

const LABELLED_FIGURE = /^[^\d\n\r]*\d[\d .,\u00A0\u202F]*[^\d\n\r]*$/u;
const NOT_A_FIGURE = /[^\d\s.,-]/u;

export const labelledAmount = (text: string, decimals: number): number | null =>
    LABELLED_FIGURE.test(text.trim()) && NOT_A_FIGURE.test(text) ? parseAmount(text, decimals) : null;
