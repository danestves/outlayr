import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { checkedAccount, parseAmount } from "@/lib/account-writes";
import type { LedgerBooks } from "@/lib/ledger-books";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { AmountInput, amountText, Fact, FlowDialog } from "./fields";
import { accountFacts } from "./model";

type Account = LedgerBooks["accounts"][number];

export function CheckDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { currency, name } = account;
    const has = accountFacts(ledger, account.localId).balance;
    const [different, setDifferent] = useState(false);
    const [negative, setNegative] = useState(has < 0);
    const [text, setText] = useState(() => amountText(Math.abs(has), currency));
    const decimals = decimalsFor(currency);
    const shows = (negative ? -1 : 1) * parseAmount(text, decimals);
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
                        <p className="text-muted-foreground text-[13px]">{flows.checkQuestion}</p>
                        <div className="dash-figure mt-0.5 text-[32px] leading-11 font-semibold tracking-[-0.04em]">
                            {money(has, currency)}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-[13px]">{flows.checkCompare}</p>
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
        <FlowDialog label={flows.checkTitle({ name })}>
            <Dialog.Body className="gap-3">
                <Field className="[&_.dash-sg]:text-foreground [&_input]:ps-0.5 [&_input]:font-medium">
                    <Field.Label>{flows.checkShows({ name })}</Field.Label>
                    <AmountInput
                        autoFocus
                        currency={currency}
                        negative={negative}
                        onNegative={setNegative}
                        onText={setText}
                        text={text}
                    />
                </Field>
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
                <Button className="px-3.5 sm:min-w-max!" onClick={save}>
                    {change === 0
                        ? flows.checkMarkChecked
                        : flows.checkLog({ amount: money(change, currency, "always") })}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
