import { useLocalSearchParams } from "expo-router";

import { NewTransaction } from "@/screens/transaction/new";

export default function NewTransactionScreen() {
    // Only `income`/`amount`/`note` may arrive from outside the bundle (quick action, Siri). The rest come from the
    // voice screen, which resolved them on this ledger, or `from`, a ledger row being logged again.
    const {
        income,
        amount,
        note,
        from,
        categoryId,
        accountId,
        accountUnresolved,
        currency,
        date,
        details,
        installmentDraft,
        installments,
        recurringCoefficient,
        recurringType,
    } = useLocalSearchParams<{
        accountId?: string;
        /** "1" when the voice draft named an account the ledger could not place. */
        accountUnresolved?: string;
        amount?: string;
        categoryId?: string;
        currency?: string;
        /** Epoch milliseconds. */
        date?: string;
        details?: string;
        from?: string;
        income?: string;
        installmentDraft?: string;
        installments?: "1";
        note?: string;
        recurringCoefficient?: string;
        recurringType?: string;
    }>();

    return (
        <NewTransaction
            accountId={accountId}
            accountUnresolved={accountUnresolved}
            amount={amount}
            categoryId={categoryId}
            currency={currency}
            date={date}
            details={details}
            from={from}
            income={income}
            installmentDraft={installmentDraft}
            installments={installments}
            note={note}
            recurringCoefficient={recurringCoefficient}
            recurringType={recurringType}
        />
    );
}
