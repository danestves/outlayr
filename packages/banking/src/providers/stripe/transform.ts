import type { BankAccount, BankAccountStatus, BankTransaction } from "../../provider";
import type { StripeAccount, StripeTransaction } from "./api";

const statusOf = (status: StripeAccount["status"]): BankAccountStatus => {
    if (status === "active") {
        return "active";
    }
    return status === "inactive" ? "relink" : "disconnected";
};

export const toBankAccount = (raw: StripeAccount): BankAccount => ({
    id: raw.id,
    institution: raw.institution_name,
    kind: raw.category,
    last4: raw.last4,
    name: raw.display_name ?? raw.institution_name,
    status: statusOf(raw.status),
});

export const toBankTransaction = (raw: StripeTransaction): BankTransaction => ({
    accountId: raw.account,
    amountMinor: raw.amount,
    currency: raw.currency.toUpperCase(),
    description: raw.description,
    id: raw.id,
    status: raw.status,
    transactedAt: raw.transacted_at * 1000,
});
