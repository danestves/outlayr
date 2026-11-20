import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { decimalsFor } from "@outlayr/money/currency";
import { accountLook } from "@outlayr/money/ledger-log";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { FlowDialog } from "@/components/dashboard/accounts/fields";
import { accountRows, isCard, statementOf } from "@/components/dashboard/accounts/model";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { MoneyField } from "@/components/ui/money-field";
import { parseAmount } from "@/lib/account-writes";
import { wallInstant, wallText } from "@/lib/entry-writes";
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
    withSent,
} from "@/lib/transfer-create";
import type { NewTransferProblem, NewTransferValues } from "@/lib/transfer-create";

import { DateRow, focusAmount, Pick, Slot } from "./entry-form";
import { TransferExchange } from "./transfer-exchange";

function Balance({ children }: { children: ReactNode }) {
    return <p className="text-muted-foreground text-app-caption mt-1.5 font-mono tabular-nums">{children}</p>;
}

/** Saves a new transfer the way the dialog does, and answers with the problem that stopped it. */
export function useAddTransfer() {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { form } = useIntlayer("dashboard-transactions");
    return (values: NewTransferValues): NewTransferProblem | null => {
        const at = Date.now();
        const current = committer.current();
        const found = newTransferProblem(current, values);
        const name = (id: string | null) => current.books.accounts.find((row) => row.localId === id)?.name ?? "";
        const feeNote = flows.transferFeeNote({ from: name(values.fromId), to: name(values.toId) }).value;
        const draft = newTransferInput(current, values, feeNote);
        if (found !== null || draft === null) {
            return found ?? "amount";
        }
        const date = values.dateText === wallText(at, ledger) ? at : wallInstant(values.dateText, ledger);
        const created = createdTransfer(current, crypto.randomUUID(), { ...draft, date: new Date(date) }, at);
        void committer.commit(created, { failed: form.saveFailed.value, saved: flows.transferSaved.value });
        return null;
    };
}

export function TransferDialog({
    accountId,
    onClose,
    seed,
}: {
    accountId: string;
    onClose: () => void;
    seed?: NewTransferValues;
}) {
    const { ledger, overview } = useDashboard();
    const { flows } = useIntlayer("dashboard-accounts");
    const { detail, form } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const rows = accountRows(ledger, overview);
    const [values, setValues] = useState<NewTransferValues>(() => {
        if (seed) {
            return seed;
        }
        const row = rows.find((each) => each.id === accountId);
        const statement = row && statementOf(ledger, row);
        return newTransferValues(ledger, accountId, row && isCard(row) ? (statement?.due ?? 0) : null, Date.now());
    });
    const [problem, setProblem] = useState<NewTransferProblem | null>(null);
    const [round, setRound] = useState(0);
    const formId = useId();
    const addTransfer = useAddTransfer();
    const change = (next: NewTransferValues) => {
        setValues(next);
        setProblem(null);
    };
    const open = transferAccounts(ledger.books);
    const here = ledger.books.accounts.find((row) => row.localId === accountId);
    const options = [...open, ...(here && !open.includes(here) ? [here] : [])].map((row) => ({
        icon: <AccountTile account={accountLook(row)} size="sm" />,
        label: row.name,
        value: row.localId,
    }));
    const currencyOf = (id: string | null) =>
        ledger.books.accounts.find((row) => row.localId === id)?.currency ?? ledger.currency;
    const [fromCurrency, toCurrency] = [currencyOf(values.fromId), currencyOf(values.toId)];
    const crossed = fromCurrency !== toCurrency;
    const typedSent = values.sentText.trim();
    const sentAmount = typedSent === "" ? null : parseAmount(typedSent, decimalsFor(fromCurrency));
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
        const found = addTransfer(values);
        setProblem(found);
        if (found !== null) {
            return;
        }
        if (another) {
            change({ ...values, arrivedByHand: false, arrivedText: "", feeText: "", note: "", sentText: "" });
            setRound((count) => count + 1);
        } else {
            onClose();
        }
    };
    return (
        <FlowDialog label={flows.newTransfer}>
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
                    {crossed ? (
                        <>
                            <TransferExchange
                                from={{
                                    currency: fromCurrency,
                                    detail: balanceLine(values.fromId, input ? -(input.fromAmount + fee) : 0),
                                    error: problem === "accounts" ? flows.transferNeedsAccounts : null,
                                    onPick: (id) => change(rewired(ledger, values, id, values.toId)),
                                }}
                                onChange={change}
                                options={options}
                                to={{
                                    currency: toCurrency,
                                    detail: balanceLine(values.toId, input?.toAmount ?? 0),
                                    error: problem === "same-account" ? flows.transferSameAccount : null,
                                    onPick: (id) => change(rewired(ledger, values, values.fromId, id)),
                                }}
                                values={values}
                            />
                            {problem === "amount" ? (
                                <p className="text-destructive text-app-label" role="alert">
                                    {form.amountRequired}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <Field className="min-w-0" invalid={problem === "amount"}>
                                <MoneyField
                                    className={problem === "amount" ? "border-destructive" : undefined}
                                    codes={[fromCurrency]}
                                    key={round}
                                    label={flows.youSend}
                                    onValueChange={(next) =>
                                        change(
                                            withSent(ledger, values, next.amount === null ? "" : String(next.amount))
                                        )
                                    }
                                    ref={focusAmount}
                                    value={{ amount: sentAmount, code: fromCurrency }}
                                />
                                {problem === "amount" ? <Field.Error match>{form.amountRequired}</Field.Error> : null}
                            </Field>
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
                                    <Balance>
                                        {balanceLine(values.fromId, input ? -(input.fromAmount + fee) : 0)}
                                    </Balance>
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
                        </>
                    )}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[3fr_2fr]">
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
                                className="font-mono tabular-nums"
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

export function TransferNoAccounts({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
    const { flows } = useIntlayer("dashboard-accounts");
    const { form } = useIntlayer("dashboard-transactions");
    const { transfer } = useIntlayer("dashboard-shell");
    return (
        <FlowDialog label={flows.newTransfer}>
            <Dialog.Body>
                <p className="border-border text-app-label text-muted-foreground rounded-app-md border px-3 py-2.5">
                    {transfer.intro}
                </p>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button onClick={onCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={1.5} />
                    {form.createAccount}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
