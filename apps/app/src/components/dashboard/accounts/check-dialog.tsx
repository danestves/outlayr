import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { IconButton } from "@/components/ui/icon-button";
import { checkedAccount } from "@/lib/account-writes";
import type { LedgerBooks } from "@/lib/ledger-books";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { Fact, FlowDialog } from "./fields";
import { heldBalance } from "./model";
import { SignedMoney } from "./signed-money";

type Account = LedgerBooks["accounts"][number];

export function CheckDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { currency, name } = account;
    const has = heldBalance(ledger, account.localId);
    const [different, setDifferent] = useState(false);
    const [negative, setNegative] = useState(has < 0);
    const [amount, setAmount] = useState<number | null>(Math.abs(has));
    const decimals = decimalsFor(currency);
    const shows = (negative ? -1 : 1) * (amount ?? 0);
    const change = different ? roundMoney(shows - has, decimals) : 0;

    const save = () => {
        // oxlint-disable-next-line react/purity -- runs on a click, not during render.
        const at = Date.now();
        const adjustment =
            change === 0 ? null : { amount: change, id: crypto.randomUUID(), note: flows.checkNote.value };
        onClose();
        committer.commitWithUndo(checkedAccount(committer.current().books, account, adjustment, at), {
            failed: flows.checkFailed({ name }).value,
            text:
                change === 0
                    ? flows.checkedToast({ name }).value
                    : flows.checkedAdjusted({ amount: money(Math.abs(change), currency), name }).value,
        });
    };

    if (!different) {
        return (
            <FlowDialog label={flows.checkTitle({ name })}>
                <Dialog.Body className="gap-5 text-center">
                    <div>
                        <p className="text-muted-foreground text-app-label">{flows.checkQuestion}</p>
                        <div className="text-app-figure mt-1 font-mono font-semibold tabular-nums">
                            {money(has, currency)}
                        </div>
                        <p className="text-muted-foreground text-app-label mt-1">{flows.checkCompare}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => setDifferent(true)} variant="outline">
                            {flows.checkDifferent}
                        </Button>
                        <Button onClick={save}>{flows.checkMatches}</Button>
                    </div>
                </Dialog.Body>
            </FlowDialog>
        );
    }
    return (
        <FlowDialog
            head={
                <IconButton
                    className="-ms-2"
                    icon={ArrowLeft02Icon}
                    label={flows.checkBack.value}
                    onClick={() => setDifferent(false)}
                    size="sm"
                />
            }
            label={flows.checkTitle({ name })}
        >
            <Dialog.Body className="gap-3">
                <SignedMoney
                    amount={amount}
                    autoFocus
                    currency={currency}
                    label={flows.checkShows({ name })}
                    negative={negative}
                    onAmount={setAmount}
                    onNegative={setNegative}
                />
                <div>
                    <Fact label={flows.checkOutlayrHas}>{money(has, currency)}</Fact>
                    <Fact label={flows.checkAdjustment}>
                        <span
                            className={`${change < 0 ? "text-app-spend" : ""} ${change > 0 ? "text-app-income" : ""}`}
                        >
                            {money(change, currency, "always")}
                        </span>
                    </Fact>
                </div>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className="px-3.5 sm:min-w-max!" onClick={() => setDifferent(false)} variant="secondary">
                    {flows.checkBack}
                </Button>
                <Button className="grow-2 px-3.5 sm:min-w-max!" onClick={save}>
                    {change === 0
                        ? flows.checkMarkChecked
                        : flows.checkLog({ amount: money(change, currency, "always") })}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
