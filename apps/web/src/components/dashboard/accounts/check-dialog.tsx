import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { RiArrowLeftLine } from "@remixicon/react";
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
            <FlowDialog confirm label={flows.checkTitle({ name })} onClose={onClose}>
                <div className="dash-db text-center">
                    <p className="text-muted-foreground text-[13px]">{flows.checkQuestion}</p>
                    <div className="dash-figure mt-1 text-[32px] leading-10 font-semibold tracking-[-0.04em]">
                        {money(has, currency)}
                    </div>
                    <p className="text-muted-foreground mt-1 text-[13px]">{flows.checkCompare}</p>
                    {failed ? <p className="dash-er">{flows.saveFailed}</p> : null}
                    <div className="mt-[18px] grid grid-cols-2 gap-2">
                        <button
                            className="dash-ob h-9 justify-center rounded-[10px]"
                            onClick={() => setDifferent(true)}
                            type="button"
                        >
                            {flows.checkDifferent}
                        </button>
                        <button className="dash-btn justify-center" onClick={save} type="button">
                            {flows.checkMatches}
                        </button>
                    </div>
                </div>
            </FlowDialog>
        );
    }
    return (
        <FlowDialog
            confirm
            head={
                <button aria-label={flows.checkBack.value} onClick={() => setDifferent(false)} type="button">
                    <RiArrowLeftLine size={18} />
                </button>
            }
            label={flows.checkTitle({ name })}
            onClose={onClose}
        >
            <div className="dash-db">
                <label className="dash-lb" htmlFor="check-shows">
                    {flows.checkShows({ name })}
                </label>
                <AmountInput
                    autoFocus
                    currency={currency}
                    id="check-shows"
                    negative={negative}
                    onNegative={setNegative}
                    onText={setText}
                    text={text}
                />
                <div className="mt-2.5">
                    <Fact label={flows.checkOutlayrHas}>{money(has, currency)}</Fact>
                    <Fact label={flows.checkAdjustment}>
                        <span
                            className={`${change < 0 ? "text-app-spend" : ""} ${change > 0 ? "text-app-income" : ""}`}
                        >
                            {money(change, currency, "always")}
                        </span>
                    </Fact>
                </div>
            </div>
            <div className="dash-df">
                {failed ? <span className="text-app-spend mr-auto text-[13px]">{flows.saveFailed}</span> : null}
                <button className="dash-ob" onClick={() => setDifferent(false)} type="button">
                    {flows.checkBack}
                </button>
                <button className="dash-btn" onClick={save} type="button">
                    {change === 0
                        ? flows.checkMarkChecked
                        : flows.checkLog({ amount: money(change, currency, "always") })}
                </button>
            </div>
        </FlowDialog>
    );
}
