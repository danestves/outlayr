import type { TranslateFn } from "@/i18n/context";

import { formatAmount } from "./money";

const TRANSFER_LABEL_KEY = {
    "": "log.row.amountTransfer",
    "+": "log.row.amountTransferIn",
    "-": "log.row.amountTransferOut",
} as const;

export interface RowAmountLabelInput {
    amount: number;
    code: string;
    income: boolean | null;
    showCents?: boolean;
    transferSign?: "+" | "-";
}

export function rowAmountLabel(
    { amount, income, code, showCents = true, transferSign }: RowAmountLabelInput,
    t: TranslateFn
): string {
    const amountText = formatAmount(amount, code, showCents);
    // Null is a transfer: neither wording fits money that only moved.
    if (income === null) {
        return t(TRANSFER_LABEL_KEY[transferSign ?? ""], { amount: amountText });
    }
    return t(income ? "log.row.amountIncome" : "log.row.amountExpense", {
        amount: amountText,
    });
}
