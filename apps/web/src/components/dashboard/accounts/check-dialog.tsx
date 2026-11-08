import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { RiArrowLeftLine } from "@remixicon/react";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { checkedAccount, parseAmount, uncheckedAccount } from "@/lib/account-writes";
import { commitRows } from "@/lib/ledger-commit";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { AmountInput, amountText, Fact, FlowDialog } from "./fields";
import { useLedgerDb, useAccountFlows } from "./flows";
import { accountFacts } from "./model";

type Account = LedgerBooks["accounts"][number];

export function CheckDialog({ account, onClose }: { account: Account; onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { flows } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const { toast } = useAccountFlows();
    const { currency, name } = account;
    const has = accountFacts(ledger, account.localId).balance;
    const [different, setDifferent] = useState(false);
    const [negative, setNegative] = useState(has < 0);
    const [text, setText] = useState(() => amountText(Math.abs(has), currency));
    const [failed, setFailed] = useState(false);
    const decimals = decimalsFor(currency);
    const shows = (negative ? -1 : 1) * parseAmount(text, decimals);
    const change = different ? roundMoney(shows - has, decimals) : 0;

    const save = async () => {
        // oxlint-disable-next-line react/purity -- runs on a click, not during render.
        const at = Date.now();
        const adjustmentId = change === 0 ? null : crypto.randomUUID();
        const adjustment =
            adjustmentId === null ? null : { amount: change, id: adjustmentId, note: flows.checkNote.value };
        try {
            await commitRows(db, checkedAccount(ledgerBooks(db), account, adjustment, at));
        } catch {
            setFailed(true);
            return;
        }
        onClose();
        toast({
            onUndo: () => {
                const books = ledgerBooks(db);
                const fresh = books.accounts.find((row) => row.localId === account.localId);
                if (fresh) {
                    const rows = uncheckedAccount(books, fresh, account.checkedAt ?? null, adjustmentId, Date.now());
                    void commitRows(db, rows);
                }
            },
            text:
                change === 0
                    ? flows.checkedToast({ name }).value
                    : flows.checkedAdjusted({ amount: money(Math.abs(change), currency), name }).value,
        });
    };

    if (!different) {
        return (
            <FlowDialog label={flows.checkTitle({ name })} onClose={onClose} size="sm">
                <Dialog.Body className="text-center">
                    <div>
                        <p className="text-muted-foreground text-[13px]">{flows.checkQuestion}</p>
                        <div className="dash-figure mt-1 text-[32px] leading-10 font-semibold tracking-[-0.04em]">
                            {money(has, currency)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-[13px]">{flows.checkCompare}</p>
                        {failed ? (
                            <p className="text-destructive mt-1.5 text-xs" role="alert">
                                {flows.saveFailed}
                            </p>
                        ) : null}
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
                <Button
                    aria-label={flows.checkBack.value}
                    onClick={() => setDifferent(false)}
                    size="icon-sm"
                    variant="ghost"
                >
                    <RiArrowLeftLine size={18} />
                </Button>
            }
            label={flows.checkTitle({ name })}
            onClose={onClose}
            size="sm"
        >
            <Dialog.Body>
                <Field>
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
                {failed ? <span className="text-destructive mr-auto text-[13px]">{flows.saveFailed}</span> : null}
                <Button onClick={() => setDifferent(false)} variant="outline">
                    {flows.checkBack}
                </Button>
                <Button onClick={save}>
                    {change === 0
                        ? flows.checkMarkChecked
                        : flows.checkLog({ amount: money(change, currency, "always") })}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
