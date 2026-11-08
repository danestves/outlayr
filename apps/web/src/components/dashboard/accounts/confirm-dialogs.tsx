import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { RiArrowLeftRightLine, RiCalendarCheckLine, RiHistoryLine, RiSafe2Line } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { archivedAccount, deletedAccount } from "@/lib/account-writes";
import { commitRows, stageRows } from "@/lib/ledger-commit";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { Fact, FlowDialog } from "./fields";
import { useLedgerDb, useAccountFlows } from "./flows";
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
        <FlowDialog confirm label={flows.archiveTitle({ name: account.name })} onClose={onClose}>
            <div className="dash-db">
                <p className="text-muted-foreground mb-3 text-[13px]">{flows.archiveBody}</p>
                <Fact label={flows.balance}>{money(facts.balance, account.currency)}</Fact>
                <Fact label={flows.transactionsKept}>{facts.transactions}</Fact>
                <Fact label={flows.netWorthAfter}>{money(facts.netAfter, ledger.currency)}</Fact>
            </div>
            <div className="dash-df">
                {failed ? <span className="text-app-spend mr-auto text-[13px]">{flows.saveFailed}</span> : null}
                <button className="dash-ob" onClick={onClose} type="button">
                    {flows.cancel}
                </button>
                <button className="dash-btn" onClick={archive} type="button">
                    {flows.archive}
                </button>
            </div>
        </FlowDialog>
    );
}

export function DeleteDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { flows } = useIntlayer("dashboard-accounts");
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
        <FlowDialog confirm label={flows.deleteTitle({ name: account.name })} onClose={onClose}>
            <div className="dash-db">
                <p className="text-muted-foreground mb-3 text-[13px]">
                    {nothing ? flows.deleteEmptyBody : flows.deleteBody}
                </p>
                {nothing ? null : (
                    <>
                        <Fact
                            label={
                                <>
                                    <RiHistoryLine size={16} />
                                    {flows.transactionsKeptRow}
                                </>
                            }
                        >
                            {facts.transactions}
                        </Fact>
                        <Fact
                            label={
                                <>
                                    <RiArrowLeftRightLine size={16} />
                                    {flows.transfersDeleted}
                                </>
                            }
                        >
                            {facts.transfers}
                        </Fact>
                        <Fact
                            label={
                                <>
                                    <RiCalendarCheckLine size={16} />
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
                            <RiSafe2Line size={16} />
                            {flows.netWorthAfter}
                        </>
                    }
                >
                    {money(netAfterDelete(ledger, account), ledger.currency)}
                </Fact>
            </div>
            <div className="dash-df">
                <button className="dash-ob" onClick={onClose} type="button">
                    {flows.cancel}
                </button>
                <button className="dash-btn" data-danger="true" onClick={remove} type="button">
                    {flows.deleteAccount}
                </button>
            </div>
        </FlowDialog>
    );
}
