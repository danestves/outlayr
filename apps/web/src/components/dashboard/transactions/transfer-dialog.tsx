import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Input } from "panelui-web/input";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AmountInput, FlowDialog } from "@/components/dashboard/accounts/fields";
import { useAccountFlows, useLedgerDb } from "@/components/dashboard/accounts/flows";
import { accountRows, cardStatement, flowsOf, isCard, plansOn } from "@/components/dashboard/accounts/model";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { wallInstant, wallText } from "@/lib/entry-writes";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";
import {
    createdTransfer,
    newTransferInput,
    newTransferProblem,
    newTransferValues,
    repriced,
    rewired,
    swapped,
    transferAccounts,
    withArrived,
    withSent,
} from "@/lib/transfer-create";
import type { NewTransferProblem, NewTransferValues } from "@/lib/transfer-create";

import { DateRow, Pick, Slot } from "./entry-form";

function Balance({ children }: { children: ReactNode }) {
    return <p className="dash-figure text-muted-foreground mt-1.5 text-xs">{children}</p>;
}

export function TransferDialog({ accountId, onClose }: { accountId: string; onClose: () => void }) {
    const { ledger, overview, photos } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { detail, form } = useIntlayer("dashboard-transactions");
    const { toast } = useAccountFlows();
    const { money } = useDisplayFormat();
    const rows = accountRows(ledger, overview);
    const [values, setValues] = useState<NewTransferValues>(() => {
        const row = rows.find((each) => each.id === accountId);
        const statement =
            row && cardStatement(row, flowsOf(ledger, accountId), ledger.today, plansOn(ledger, accountId));
        return newTransferValues(ledger, accountId, row && isCard(row) ? (statement?.due ?? 0) : null, Date.now());
    });
    const [problem, setProblem] = useState<NewTransferProblem | null>(null);
    const [round, setRound] = useState(0);
    const formId = useId();
    const change = (next: NewTransferValues) => {
        setValues(next);
        setProblem(null);
    };
    const open = transferAccounts(ledger.books);
    const here = ledger.books.accounts.find((row) => row.localId === accountId);
    const options = [...open, ...(here && !open.includes(here) ? [here] : [])].map((row) => ({
        icon: <AccountTile account={accountLook(row)} photos={photos} size="sm" />,
        label: row.name,
        value: row.localId,
    }));
    const currencyOf = (id: string | null) =>
        ledger.books.accounts.find((row) => row.localId === id)?.currency ?? ledger.currency;
    const [fromCurrency, toCurrency] = [currencyOf(values.fromId), currencyOf(values.toId)];
    const input = newTransferInput(ledger, values);
    const balanceLine = (id: string | null, delta: number) => {
        const held = rows.find((row) => row.id === id);
        if (!held) {
            return null;
        }
        const before = money(held.balance, held.currency);
        return delta === 0 ? before : flows.balanceThen({ after: money(held.balance + delta, held.currency), before });
    };
    const fee = input?.fees?.source?.amount ?? 0;
    const submit = (another: boolean) => {
        const at = Date.now();
        const current = { ...ledger, books: ledgerBooks(db) };
        const found = newTransferProblem(current, values);
        setProblem(found);
        const name = (id: string | null) => current.books.accounts.find((row) => row.localId === id)?.name ?? "";
        const feeNote = flows.transferFeeNote({ from: name(values.fromId), to: name(values.toId) }).value;
        const draft = newTransferInput(current, values, feeNote);
        if (found !== null || draft === null) {
            return;
        }
        const date = values.dateText === wallText(at, ledger) ? at : wallInstant(values.dateText, ledger);
        const created = createdTransfer(current, crypto.randomUUID(), { ...draft, date: new Date(date) }, at);
        void committer.commit(created).settled.then((outcome) => {
            if (outcome.status === "failed") {
                toast({ failed: true, text: form.saveFailed.value });
            }
        });
        toast({ text: flows.transferSaved.value });
        if (another) {
            change({ ...values, arrivedByHand: false, arrivedText: "", feeText: "", note: "", sentText: "" });
            setRound((count) => count + 1);
        } else {
            onClose();
        }
    };
    return (
        <FlowDialog label={flows.newTransfer} onClose={onClose} size="md">
            <Dialog.Body>
                <form
                    className="flex flex-col gap-3.5"
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit(false);
                    }}
                >
                    <Slot error={problem === "amount" ? form.amountRequired : null} label={flows.youSend} quiet={false}>
                        <div className="[&_input]:font-semibold!">
                            <AmountInput
                                autoFocus
                                currency={fromCurrency}
                                key={round}
                                onText={(text) => change(withSent(ledger, values, text))}
                                text={values.sentText}
                                unit={fromCurrency}
                            />
                        </div>
                    </Slot>
                    <div className="grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-start gap-2">
                        <Slot
                            error={problem === "accounts" ? flows.transferNeedsAccounts : null}
                            label={detail.from}
                            quiet={false}
                        >
                            <Pick
                                onPick={(id) => change(rewired(ledger, values, id, values.toId))}
                                options={options}
                                quiet={false}
                                value={values.fromId}
                            />
                            <Balance>{balanceLine(values.fromId, input ? -(input.fromAmount + fee) : 0)}</Balance>
                        </Slot>
                        <Button
                            aria-label={flows.swap.value}
                            className="text-muted-foreground mt-7"
                            onClick={() => change(swapped(ledger, values))}
                            size="icon"
                            type="button"
                            variant="ghost"
                        >
                            <HugeiconsIcon icon={ArrowDataTransferHorizontalIcon} size={16} />
                        </Button>
                        <Slot
                            error={problem === "same-account" ? flows.transferSameAccount : null}
                            label={detail.to}
                            quiet={false}
                        >
                            <Pick
                                onPick={(id) => change(rewired(ledger, values, values.fromId, id))}
                                options={options}
                                quiet={false}
                                value={values.toId}
                            />
                            <Balance>{balanceLine(values.toId, input?.toAmount ?? 0)}</Balance>
                        </Slot>
                    </div>
                    {fromCurrency === toCurrency ? null : (
                        <Slot label={flows.arrives} quiet={false}>
                            <AmountInput
                                currency={toCurrency}
                                onText={(text) => change(withArrived(ledger, values, text))}
                                text={values.arrivedText}
                                unit={toCurrency}
                            />
                        </Slot>
                    )}
                    <div className="grid grid-cols-1 gap-3.5 min-[481px]:grid-cols-[3fr_2fr]">
                        <Slot
                            error={
                                (problem === "date" && form.dateRequired) ||
                                (problem === "rateMissing" && flows.transferNoRate) ||
                                null
                            }
                            label={form.date}
                            quiet={false}
                        >
                            <DateRow
                                onChange={(dateText) => change(repriced(ledger, { ...values, dateText }))}
                                quiet={false}
                                text={values.dateText}
                            />
                        </Slot>
                        <Slot label={detail.fee} quiet={false}>
                            <Input
                                className="dash-figure"
                                inputMode="decimal"
                                onChange={(event) =>
                                    change(repriced(ledger, { ...values, feeText: event.target.value }))
                                }
                                placeholder={flows.noFee.value}
                                value={values.feeText}
                            />
                        </Slot>
                    </div>
                    <Slot label={form.note} quiet={false}>
                        <Input
                            onChange={(event) => change({ ...values, note: event.target.value })}
                            placeholder={flows.optional.value}
                            value={values.note}
                        />
                    </Slot>
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={() => submit(true)} variant="secondary">
                    {form.addAnother}
                </Button>
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button form={formId} type="submit">
                    {flows.saveTransfer}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
