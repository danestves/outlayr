import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { EntryDialog } from "@/components/dashboard/transactions/entry-form";
import { ReceiptDialog } from "@/components/dashboard/transactions/receipt-dialog";
import { TransferDialog, TransferNoAccounts } from "@/components/dashboard/transactions/transfer-dialog";
import { transferAccounts } from "@/lib/transfer-create";

import { AccountForm } from "./account-form";
import { CheckDialog } from "./check-dialog";
import { ArchiveDialog, DeleteDialog } from "./confirm-dialogs";
import type { AccountFlow } from "./flows";
import { PurchaseForm } from "./purchase-form";
import { ScanDialog } from "./scan-dialog";

/** The dialog for one flow; an account gone from under it, deleted on another device, closes it. */
export default function FlowDialogs({
    flow,
    onClose,
    onSwitch,
}: {
    flow: AccountFlow;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const { ledger } = useDashboard();
    if (flow.kind === "entry") {
        return <EntryDialog flow={flow} onClose={onClose} onSwitch={onSwitch} />;
    }
    if (flow.kind === "receipt") {
        return <ReceiptDialog flow={flow} onClose={onClose} onSwitch={onSwitch} />;
    }
    if (flow.kind === "transfer") {
        const choices = new Set(transferAccounts(ledger.books).map((row) => row.localId));
        const from = flow.seed?.fromId ?? flow.accountId ?? [...choices][0];
        if (from === undefined || new Set([...choices, from]).size < 2) {
            return <TransferNoAccounts onClose={onClose} onCreate={() => onSwitch({ kind: "create", type: "bank" })} />;
        }
        return <TransferDialog accountId={from} onClose={onClose} seed={flow.seed && { ...flow.seed, fromId: from }} />;
    }
    if (flow.kind === "create") {
        return <AccountForm account={null} draft={flow.draft} onClose={onClose} onSwitch={onSwitch} type={flow.type} />;
    }
    if (flow.kind === "purchase") {
        return (
            <PurchaseForm
                accountId={flow.accountId}
                draft={flow.draft}
                onClose={onClose}
                onSwitch={onSwitch}
                seed={flow.seed}
            />
        );
    }
    if (flow.kind === "scan") {
        return <ScanDialog accountId={flow.accountId} onClose={onClose} onSwitch={onSwitch} />;
    }
    const account = ledger.books.accounts.find((row) => row.localId === flow.accountId && row.deletedAt === null);
    if (!account) {
        return null;
    }
    switch (flow.kind) {
        case "edit": {
            return (
                <AccountForm account={account} draft={flow.draft} onClose={onClose} onSwitch={onSwitch} type="bank" />
            );
        }
        case "check": {
            return <CheckDialog account={account} onClose={onClose} />;
        }
        case "archive": {
            return <ArchiveDialog account={account} onClose={onClose} />;
        }
        default: {
            return <DeleteDialog account={account} onClose={onClose} />;
        }
    }
}
