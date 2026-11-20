import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import SafeIcon from "@hugeicons/core-free-icons/SafeIcon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { archivedAccount, deletedAccount } from "@/lib/account-writes";
import type { LedgerBooks } from "@/lib/ledger-books";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";

import { Fact, FlowDialog } from "./fields";
import { Glyph } from "./glyph";
import { accountFacts, heldBalance, netAfterDelete } from "./model";
import type { AccountFacts } from "./model";

type Account = LedgerBooks["accounts"][number];

const sampleFacts = (balance: number): AccountFacts => ({
    adjustments: 0,
    balance,
    netAfter: 0,
    plans: 0,
    transactions: 1,
    transfers: 0,
});

export function ArchiveDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const navigate = useNavigate();
    const known = accountFacts(ledger, account.localId);
    const facts = known ?? sampleFacts(heldBalance(ledger, account.localId));
    const archive = () => {
        const at = Date.now();
        onClose();
        committer.commitWithUndo([archivedAccount(account, at, at)], {
            after: navigate({ to: "/accounts", viewTransition: viewTransition("push-left", { back: true }) }),
            failed: flows.archiveFailed({ name: account.name }).value,
            text: flows.archivedToast({ name: account.name }).value,
        });
    };
    return (
        <FlowDialog label={flows.archiveTitle({ name: account.name })}>
            <Dialog.Body className="gap-3">
                <Dialog.Description className="text-wrap">{flows.archiveBody}</Dialog.Description>
                <Skeleton loading={known === null}>
                    <div>
                        <Fact label={flows.balance}>{money(facts.balance, account.currency)}</Fact>
                        <Fact label={flows.transactionsKept}>{facts.transactions}</Fact>
                        <Fact label={flows.netWorthAfter}>{money(facts.netAfter, ledger.currency)}</Fact>
                    </div>
                </Skeleton>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button disabled={known === null} onClick={archive}>
                    {flows.archive}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function DeleteDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { actions, flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const navigate = useNavigate();
    const known = accountFacts(ledger, account.localId);
    const facts = known ?? sampleFacts(heldBalance(ledger, account.localId));
    const nothing = facts.transactions + facts.adjustments + facts.transfers + facts.plans === 0;
    const remove = () => {
        const rows = deletedAccount(committer.current().books, account, Date.now());
        onClose();
        committer.commitWithUndo(rows, {
            after: navigate({ to: "/accounts", viewTransition: viewTransition("push-left", { back: true }) }),
            detail: nothing ? undefined : flows.deleteBody.value,
            failed: flows.deleteFailed({ name: account.name }).value,
            text: flows.deletedToast.value,
        });
    };
    return (
        <FlowDialog label={flows.deleteTitle({ name: account.name })}>
            <Dialog.Body className={nothing ? "gap-3" : "gap-2.5"}>
                <Dialog.Description className="text-wrap">
                    {nothing ? flows.deleteEmptyBody : flows.deleteBody}
                </Dialog.Description>
                <Skeleton loading={known === null}>
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
                            {money(netAfterDelete(ledger, account) ?? 0, ledger.currency)}
                        </Fact>
                    </div>
                </Skeleton>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button disabled={known === null} onClick={remove} variant="destructive">
                    {nothing ? actions.delete : flows.deleteAccount}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
