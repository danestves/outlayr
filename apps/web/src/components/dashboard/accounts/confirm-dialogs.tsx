import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import HistoryIcon from "@hugeicons/core-free-icons/HistoryIcon";
import SafeIcon from "@hugeicons/core-free-icons/SafeIcon";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { archivedAccount, deletedAccount } from "@/lib/account-writes";
import { commitRows, stageRows } from "@/lib/ledger-commit";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { Fact, FlowDialog } from "./fields";
import { useLedgerDb, useAccountFlows } from "./flows";
import { Glyph } from "./glyph";
import { accountFacts, netAfterDelete } from "./model";

type Account = LedgerBooks["accounts"][number];

export function ArchiveDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { toast } = useAccountFlows();
    const navigate = useNavigate();
    const [failed, setFailed] = useState(false);
    const facts = accountFacts(ledger, account.localId);
    const archive = async () => {
        const at = Date.now();
        try {
            await commitRows(db, [archivedAccount(account, at, at)]);
        } catch {
            setFailed(true);
            return;
        }
        onClose();
        await navigate({ to: "/app/accounts" });
        toast({
            onUndo: () => {
                const fresh = ledgerBooks(db).accounts.find((row) => row.localId === account.localId);
                if (fresh) {
                    void commitRows(db, [archivedAccount(fresh, null, Date.now())]);
                }
            },
            text: flows.archivedToast({ name: account.name }).value,
        });
    };
    return (
        <FlowDialog label={flows.archiveTitle({ name: account.name })} onClose={onClose} size="sm">
            <Dialog.Body>
                <p className="text-muted-foreground text-[13px]">{flows.archiveBody}</p>
                <div>
                    <Fact label={flows.balance}>{money(facts.balance, account.currency)}</Fact>
                    <Fact label={flows.transactionsKept}>{facts.transactions}</Fact>
                    <Fact label={flows.netWorthAfter}>{money(facts.netAfter, ledger.currency)}</Fact>
                </div>
            </Dialog.Body>
            <Dialog.Footer>
                {failed ? <span className="text-destructive mr-auto text-[13px]">{flows.saveFailed}</span> : null}
                <Button onClick={onClose} variant="outline">
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
    const { actions, flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { toast } = useAccountFlows();
    const navigate = useNavigate();
    const facts = accountFacts(ledger, account.localId);
    const nothing = facts.transactions + facts.adjustments + facts.transfers + facts.plans === 0;
    const remove = async () => {
        const staged = stageRows(db, deletedAccount(ledgerBooks(db), account, Date.now()));
        onClose();
        await navigate({ to: "/app/accounts" });
        toast({
            onExpire: () => {
                staged.commit().catch(() => {
                    toast({ text: flows.deleteFailed({ name: account.name }).value });
                });
            },
            onUndo: () => staged.rollback(),
            text: flows.deletedToast({ name: account.name }).value,
        });
    };
    return (
        <FlowDialog label={flows.deleteTitle({ name: account.name })} onClose={onClose} size="sm">
            <Dialog.Body>
                <p className="text-muted-foreground text-[13px]">
                    {nothing ? flows.deleteEmptyBody : flows.deleteBody}
                </p>
                <div>
                    {nothing ? (
                        <Fact label={flows.balance}>{money(facts.balance, account.currency)}</Fact>
                    ) : (
                        <>
                            <Fact
                                label={
                                    <>
                                        <Glyph icon={HistoryIcon} size={16} />
                                        {flows.transactionsKeptRow}
                                    </>
                                }
                            >
                                {facts.transactions}
                            </Fact>
                            <Fact
                                label={
                                    <>
                                        <Glyph icon={ArrowDataTransferHorizontalIcon} size={16} />
                                        {flows.transfersDeleted}
                                    </>
                                }
                            >
                                {facts.transfers}
                            </Fact>
                            <Fact
                                label={
                                    <>
                                        <Glyph icon={CalendarCheckIn01Icon} size={16} />
                                        {flows.plansDeleted}
                                    </>
                                }
                            >
                                {facts.plans}
                            </Fact>
                        </>
                    )}
                    <Fact
                        label={
                            <>
                                {nothing ? null : <Glyph icon={SafeIcon} size={16} />}
                                {flows.netWorthAfter}
                            </>
                        }
                    >
                        {money(netAfterDelete(ledger, account), ledger.currency)}
                    </Fact>
                </div>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="outline">
                    {flows.cancel}
                </Button>
                <Button onClick={remove} variant="destructive">
                    {nothing ? actions.delete : flows.deleteAccount}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
