import { Redirect } from "expo-router";
import { useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { ScreenHeader } from "@/components/screen-header";
import { TransactionForm } from "@/components/transaction-form";
import { useDatabase } from "@/contexts/local-data-context";
import { getTransactionById } from "@/data/transactions-core";
import { logAgainDraft } from "@/domain/transaction-actions";
import type { LogAgainDraft } from "@/domain/transaction-actions";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useTranslation } from "@/i18n/context";
import { entrySeed } from "@/state/entry-params";
import type { EntryParams } from "@/state/entry-params";

export function NewTransaction({ from, ...params }: EntryParams & { from?: string | string[] }) {
    const { leave, setDirty } = useDiscardGuard();
    const db = useDatabase();
    const t = useTranslation();
    // A row that no longer resolves opens an empty form: the menu's row may since be deleted.
    const [copyOf] = useState<LogAgainDraft | undefined>(() => {
        const copied = Array.isArray(from) ? undefined : from;
        const source = copied ? getTransactionById(db, copied) : null;
        return source ? logAgainDraft(source) : undefined;
    });
    const seed = entrySeed(params);

    // Old "buy in installments" links predate the guided order; a plain entry would lose the plan.
    if (seed.installments === true && seed.installmentDraft === undefined) {
        return (
            <Redirect
                href={{
                    params: {
                        accountId: seed.accountId,
                        amount: seed.amount === undefined ? undefined : String(seed.amount),
                    },
                    pathname: "/installments/new",
                }}
            />
        );
    }

    return (
        <>
            <ScreenHeader title={t("transaction.new.title")} />
            <CloseToolbar placement="left" />

            <TransactionForm
                copyOf={copyOf}
                db={db}
                mode="create"
                onDirtyChange={setDirty}
                onDone={leave}
                seed={seed}
            />
        </>
    );
}
