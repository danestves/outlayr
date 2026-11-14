import { useMatch } from "@tanstack/react-router";
import { AlertDialog } from "panelui-web/alert-dialog";
import { useMemo } from "react";
import type { ReactElement } from "react";
import { useIntlayer } from "react-intlayer";

import { Fact } from "@/components/dashboard/accounts/fields";
import { accountRows } from "@/components/dashboard/accounts/model";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { undoRows } from "@/lib/import-writes";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { keptImported } from "@/lib/money-manager/extras";
import { undoMoneyManagerRows } from "@/lib/money-manager/writes";

import { draftStore } from "./draft";
import { importStore } from "./store";
import type { ImportRecord } from "./store";
import { importToasts } from "./toasts";

export function useUserId() {
    return useMatch({ from: "/_account/_app", select: (match) => match.loaderData?.userId });
}

export function useImportStore() {
    const userId = useUserId();
    return useMemo(() => (userId ? importStore(userId) : null), [userId]);
}

export function useDraftStore() {
    const userId = useUserId();
    return useMemo(() => (userId ? draftStore(userId) : null), [userId]);
}

/** The one account an import went into, with its balance now: the undo dialog shows where it lands after. */
export function useImportAccount(record: Pick<ImportRecord, "accountIds"> | null) {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        if (record?.accountIds.length !== 1) {
            return null;
        }
        const [id] = record.accountIds;
        return accountRows(ledger, overview).find((row) => row.id === id) ?? null;
    }, [ledger, overview, record]);
}

export function useUndoImport() {
    const store = useImportStore();
    const committer = useLedgerCommitter();
    const { ledger } = useDashboard();
    const { history } = useIntlayer("dashboard-import");
    return (record: ImportRecord) => {
        if (!store) {
            return;
        }
        const now = Date.now();
        const kept = record.source === "moneyManager" ? keptImported(record.id) : null;
        const { rows } = kept
            ? undoMoneyManagerRows(ledger, kept, now)
            : undoRows(
                  ledger.books,
                  {
                      accountIds: record.createdAccountIds,
                      categoryIds: record.createdCategoryIds,
                      entryIds: record.entryIds,
                  },
                  now
              );
        store.change(record.id, { undoneAt: now });
        const toastId = importToasts.add({
            actionProps: { children: history.dismiss.value, onClick: () => importToasts.close(toastId) },
            title: history.importUndone.value,
        });
        void committer.commit(rows).then((saved) => {
            if (!saved) {
                store.change(record.id, { undoneAt: null });
                importToasts.close(toastId);
                importToasts.add({ title: history.undoFailed.value, type: "destructive" });
            }
        });
    };
}

export function UndoDialog({ record, trigger }: { record: ImportRecord; trigger: ReactElement }) {
    const { cancel, done, undoDialog } = useIntlayer("dashboard-import");
    const undo = useUndoImport();
    const account = useImportAccount(record);
    const { money } = useDisplayFormat();
    const net = record.in - record.out;
    return (
        <AlertDialog>
            <AlertDialog.Trigger render={trigger} />
            <AlertDialog.Content className="app-shell max-w-[422px]" tone="destructive">
                <AlertDialog.Title>{undoDialog.title}</AlertDialog.Title>
                <AlertDialog.Description className="text-[13px] leading-5">
                    {done.changeMindText}
                </AlertDialog.Description>
                <div className="border-t">
                    <Fact label={undoDialog.entriesRemoved}>{record.entryIds.length.toLocaleString()}</Fact>
                    {account ? (
                        <Fact label={undoDialog.balanceAfter({ account: account.name })}>
                            {money(account.balance - net, account.currency)}
                        </Fact>
                    ) : null}
                </div>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>{cancel}</AlertDialog.Cancel>
                    <AlertDialog.Action onClick={() => undo(record)}>{undoDialog.confirm}</AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog>
    );
}
