import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import SafeIcon from "@hugeicons/core-free-icons/SafeIcon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { archivedAccount, deletedAccount } from "@/lib/account-writes";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { Fact, FlowDialog } from "./fields";
import { UNDO_HOLD_MS, useLedgerDb, useAccountFlows } from "./flows";
import { Glyph } from "./glyph";
import { accountFacts, netAfterDelete } from "./model";

type Account = LedgerBooks["accounts"][number];

export function ArchiveDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { toast } = useAccountFlows();
    const navigate = useNavigate();
    const [failed, setFailed] = useState(false);
    const facts = accountFacts(ledger, account.localId);
    const archive = async () => {
        const at = Date.now();
        const outcome = await committer.commit([archivedAccount(account, at, at)]).settled;
        if (outcome.status === "failed") {
            setFailed(true);
            return;
        }
        onClose();
        await navigate({ to: "/app/accounts" });
        toast({
            onUndo: () => {
                const fresh = ledgerBooks(db).accounts.find((row) => row.localId === account.localId);
                if (fresh) {
                    void committer.commit([archivedAccount(fresh, null, Date.now())]).settled.then((undone) => {
                        if (undone.status === "failed") {
                            toast({ failed: true, text: flows.restoreFailed({ name: account.name }).value });
                        }
                    });
                }
            },
            text: flows.archivedToast({ name: account.name }).value,
        });
    };
    return (
        <FlowDialog label={flows.archiveTitle({ name: account.name })}>
            <Dialog.Body className="gap-3">
                <Dialog.Description className="text-wrap">{flows.archiveBody}</Dialog.Description>
                <div>
                    <Fact label={flows.balance}>{money(facts.balance, account.currency)}</Fact>
                    <Fact label={flows.transactionsKept}>{facts.transactions}</Fact>
                    <Fact label={flows.netWorthAfter}>{money(facts.netAfter, ledger.currency)}</Fact>
                </div>
                {failed ? (
                    <p className="text-destructive text-xs" role="alert">
                        {flows.saveFailed}
                    </p>
                ) : null}
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button onClick={archive}>{flows.archive}</Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function DeleteDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { actions, flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { toast } = useAccountFlows();
    const navigate = useNavigate();
    const facts = accountFacts(ledger, account.localId);
    const nothing = facts.transactions + facts.adjustments + facts.transfers + facts.plans === 0;
    const remove = async () => {
        const held = committer.commit(deletedAccount(ledgerBooks(db), account, Date.now()), { holdMs: UNDO_HOLD_MS });
        void held.settled.then((outcome) => {
            if (outcome.status === "failed") {
                toast({ text: flows.deleteFailed({ name: account.name }).value });
            }
        });
        onClose();
        await navigate({ to: "/app/accounts" });
        toast({
            onExpire: () => {
                void held.flush();
            },
            onUndo: () => {
                held.undo();
            },
            detail: nothing ? undefined : flows.deleteBody.value,
            text: flows.deletedToast.value,
        });
    };
    return (
        <FlowDialog label={flows.deleteTitle({ name: account.name })}>
            <Dialog.Body className={nothing ? "gap-3" : "gap-2.5"}>
                <Dialog.Description className="text-wrap">
                    {nothing ? flows.deleteEmptyBody : flows.deleteBody}
                </Dialog.Description>
                <div>
                    {nothing ? (
                        <Fact label={flows.balance}>{money(facts.balance, account.currency)}</Fact>
                    ) : (
                        <>
                            <Fact
                                label={
                                    <>
                                        <Glyph
                                            className="text-muted-foreground"
                                            icon={TransactionHistoryIcon}
                                            size={15}
                                        />
                                        <span className="text-foreground">{flows.transactionsKeptRow}</span>
                                    </>
                                }
                            >
                                {facts.transactions}
                            </Fact>
                            <Fact
                                label={
                                    <>
                                        <Glyph
                                            className="text-muted-foreground"
                                            icon={ArrowDataTransferHorizontalIcon}
                                            size={15}
                                        />
                                        <span className="text-foreground">{flows.transfersDeleted}</span>
                                    </>
                                }
                            >
                                {facts.transfers}
                            </Fact>
                            <Fact
                                label={
                                    <>
                                        <Glyph
                                            className="text-muted-foreground"
                                            icon={CalendarCheckIn01Icon}
                                            size={15}
                                        />
                                        <span className="text-foreground">{flows.plansDeleted}</span>
                                    </>
                                }
                            >
                                {facts.plans}
                            </Fact>
                        </>
                    )}
                    <Fact
                        label={
                            nothing ? (
                                flows.netWorthAfter
                            ) : (
                                <>
                                    <Glyph className="text-muted-foreground" icon={SafeIcon} size={15} />
                                    <span className="text-foreground">{flows.netWorthAfter}</span>
                                </>
                            )
                        }
                    >
                        {money(netAfterDelete(ledger, account), ledger.currency)}
                    </Fact>
                </div>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button onClick={remove} variant="destructive">
                    {nothing ? actions.delete : flows.deleteAccount}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
