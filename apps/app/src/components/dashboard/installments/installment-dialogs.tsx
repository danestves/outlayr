import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BanIcon from "@hugeicons/core-free-icons/BanIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { decimalsFor } from "@outlayr/money/currency";
import type { accountLook } from "@outlayr/money/ledger-log";
import { roundMoney } from "@outlayr/money/round";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Select } from "panelui-web/select";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { DayField, FlowDialog, plainAmount } from "@/components/dashboard/accounts/fields";
import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountRows } from "@/components/dashboard/accounts/model";
import { useGoalMoney } from "@/components/dashboard/goals/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { focusAmount } from "@/components/dashboard/transactions/entry-form";
import { AccountTile } from "@/components/ledger/tiles";
import { MoneyField } from "@/components/ui/money-field";
import { parseAmount } from "@/lib/account-writes";
import { startOfDay } from "@/lib/dashboard-series-ledger";
import { wallInstant, wallText } from "@/lib/entry-writes";
import { useNumberLocale } from "@/lib/exchange-locale";
import {
    deletedInstallment,
    editedInstallment,
    feeRows,
    outsidePayment,
    pendingDeletion,
} from "@/lib/installment-writes";
import type { CommitRow } from "@/lib/ledger-committer";
import { ledgerBooks } from "@/lib/ledger-db";
import { viewTransition } from "@/lib/motion";
import {
    createdTransfer,
    newTransferInput,
    newTransferProblem,
    newTransferValues,
    pinnedArrival,
    transferAccounts,
} from "@/lib/transfer-create";
import type { NewTransferValues } from "@/lib/transfer-create";

import type { InstallmentFlow } from "./flow-context";
import { leftAfterPaying, openRows, planById, planViews } from "./model";
import type { InstallmentView, PlanView } from "./model";
import { useRowLabel } from "./parts";

const FOOTER_PILL = "min-w-max! px-3.5";
const POPUP = "app-shell z-60";
const LABEL = "data-invalid:text-foreground has-[[aria-invalid=true]]:text-foreground";
const NONE = "none";
const SUMMARY = "rounded-app-lg border px-3";
const SUMMARY_ROW = "text-app-label flex h-8.25 items-center justify-between gap-3 border-b last:border-0";

function SummaryRow({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className={SUMMARY_ROW}>
            <span className="text-muted-foreground min-w-0 truncate">{label}</span>
            <span className="dash-figure flex-none">{children}</span>
        </div>
    );
}

export function useDeleteInstallment() {
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { edit, failed } = useIntlayer("dashboard-installments");
    const label = useRowLabel();
    return (view: PlanView, item: InstallmentView) => {
        committer.commitWithUndo(deletedInstallment(ledgerBooks(db), item.id, Date.now()), {
            failed: failed.value,
            text: edit.deleted({ installment: label(view, item) }).value,
        });
    };
}

function FeeToggle({ onAdd }: { onAdd: () => void }) {
    const { fee } = useIntlayer("dashboard-installments");
    return (
        <Button
            className="text-app-tint text-app-label! h-auto w-fit gap-1.5 p-0"
            onClick={onAdd}
            size="sm"
            type="button"
            variant="link"
        >
            <Glyph icon={Add01Icon} size={15} />
            {fee.add}
        </Button>
    );
}

function FeeField({
    amount,
    currency,
    onAmount,
    onRemove,
}: {
    amount: number | null;
    currency: string;
    onAmount: (amount: number | null) => void;
    onRemove: () => void;
}) {
    const { fee } = useIntlayer("dashboard-installments");
    return (
        <div className="flex flex-col gap-2.5">
            <MoneyField
                className="max-w-none"
                codes={[currency]}
                label={fee.label}
                onValueChange={(next) => onAmount(next.amount)}
                ref={focusAmount}
                value={{ amount, code: currency }}
            />
            <Button
                className="text-muted-foreground text-app-label! h-auto w-fit gap-1.5 p-0 font-normal"
                onClick={onRemove}
                size="sm"
                type="button"
                variant="link"
            >
                <Glyph icon={Cancel01Icon} size={13} />
                {fee.remove}
            </Button>
        </div>
    );
}

interface Source {
    balance: number;
    currency: string;
    id: string;
    look: ReturnType<typeof accountLook>;
    name: string;
}

function SourcePick({
    onPick,
    sources,
    value,
}: {
    onPick: (id: string) => void;
    sources: readonly Source[];
    value: string;
}) {
    const { pay } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const picked = sources.find((source) => source.id === value);
    const ban = <Glyph icon={BanIcon} className="text-muted-foreground" size={16} />;
    const items = [
        ...sources.map((source) => ({ label: source.name, value: source.id })),
        { label: pay.none.value, value: NONE },
    ];
    return (
        <Select items={items} onValueChange={(next) => next !== null && onPick(next)} value={value}>
            <Select.Trigger aria-label={pay.from.value}>
                {picked ? <AccountTile account={picked.look} size="sm" /> : ban}
                <Select.Value />
            </Select.Trigger>
            <Select.Content alignItemWithTrigger={false} className={POPUP}>
                {sources.map((source) => (
                    <Select.Item
                        icon={<AccountTile account={source.look} size="sm" />}
                        key={source.id}
                        value={source.id}
                    >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="truncate">{source.name}</span>
                            <span className="dash-figure text-muted-foreground text-app-caption ms-auto">
                                {format(source.balance, source.currency)}
                            </span>
                        </span>
                    </Select.Item>
                ))}
                <Select.Item icon={ban} value={NONE}>
                    {pay.none}
                </Select.Item>
            </Select.Content>
        </Select>
    );
}

type PayProblem = "amount" | "date" | "over" | "rateMissing" | null;

function useSources(view: PlanView): Source[] {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        const open = new Set(transferAccounts(ledger.books).map((row) => row.localId));
        return accountRows(ledger, overview)
            .filter((row) => open.has(row.id) && row.id !== view.account.id)
            .map(({ balance, currency, id, look, name }) => ({ balance, currency, id, look, name }));
    }, [ledger, overview, view.account.id]);
}

type Ledger = ReturnType<typeof useDashboard>["ledger"];

interface PayDraft {
    amount: number;
    date: number;
    fee: { amount: number; changed: boolean; note: string };
    owed: number;
    source: Source | null;
    target: InstallmentView | null;
    values: NewTransferValues;
    view: PlanView;
}

function payRows(
    current: Ledger,
    { amount, date, fee, owed, source, target, values, view }: PayDraft,
    at: number
): { problem: NonNullable<PayProblem> } | { rows: CommitRow[] } {
    if (!(amount > 0)) {
        return { problem: "amount" };
    }
    if (amount > owed) {
        return { problem: "over" };
    }
    const rows = target && fee.changed ? feeRows(current, view, target.id, fee, at) : [];
    if (source === null) {
        return { rows: [...rows, outsidePayment(current.books, view, { amount, date }, crypto.randomUUID(), at)] };
    }
    const found = newTransferProblem(current, values);
    const draft = newTransferInput(current, values);
    if (found === "rateMissing" || found === "date") {
        return { problem: found };
    }
    if (found !== null || draft === null) {
        return { problem: "amount" };
    }
    const transfer = { ...draft, date: new Date(date), installmentPlanId: view.id };
    return { rows: [...rows, ...createdTransfer(current, crypto.randomUUID(), transfer, at)] };
}

function transferValues(
    ledger: Ledger,
    {
        amount,
        dateText,
        leaves,
        numberLocale,
        source,
        view,
    }: {
        amount: number | null;
        dateText: string;
        leaves: number | null | undefined;
        numberLocale: string;
        source: Source | null;
        view: PlanView;
    }
) {
    const amountText = amount === null ? "" : plainAmount(amount, view.currency, numberLocale);
    const bare: NewTransferValues = {
        arrivedByHand: false,
        arrivedText: "",
        dateText,
        feeText: "",
        fromId: source?.id ?? null,
        note: "",
        sentText: amountText,
        toId: view.account.id,
    };
    if (source === null || source.currency === view.currency) {
        return { leaves: null, values: bare };
    }
    const market = amount !== null && amount > 0 ? pinnedArrival(ledger, bare, amount).sentText : "";
    const marketAmount = market ? parseAmount(market, decimalsFor(source.currency)) : null;
    const shown = leaves === undefined ? marketAmount : leaves;
    return {
        leaves: shown,
        values: {
            ...bare,
            arrivedByHand: leaves !== undefined,
            arrivedText: amountText,
            sentText: shown === null ? "" : plainAmount(shown, source.currency, numberLocale),
        },
    };
}

function PaySummary({
    amount,
    currency,
    owed,
    sent,
    source,
}: {
    amount: number;
    currency: string;
    owed: number;
    sent: number;
    source: Source | null;
}) {
    const { pay } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    return (
        <div className={SUMMARY}>
            {source ? (
                <SummaryRow label={pay.accountAfter({ account: source.name })}>
                    {format(roundMoney(source.balance - sent, decimalsFor(source.currency)), source.currency)}
                </SummaryRow>
            ) : null}
            <SummaryRow label={pay.leftAfter}>
                {format(leftAfterPaying({ currency, left: owed }, amount), currency)}
            </SummaryRow>
        </div>
    );
}

function PayTitle({ all, target, view }: { all: boolean; target: InstallmentView | null; view: PlanView }) {
    const { pay, status } = useIntlayer("dashboard-installments");
    return (
        <span className="flex items-center gap-2">
            {all ? pay.allTitle({ name: view.name }) : pay.title({ account: view.account.name })}
            {target?.overdue ? (
                <Badge className="text-app-caption! h-6 rounded-md px-2 font-medium" variant="destructive">
                    {status.overdue}
                </Badge>
            ) : null}
        </span>
    );
}

function useAmountError(problem: PayProblem, currency: string, owed: number): ReactNode {
    const { pay } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    if (problem === "amount") {
        return pay.amountRequired({ zero: format(0, currency) });
    }
    return problem === "over" ? pay.overLeft({ amount: format(owed, currency) }) : null;
}

const positiveOrNull = (amount: number) => (amount > 0 ? amount : null);

function PayDialog({ all, onClose, view }: { all: boolean; onClose: () => void; view: PlanView }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const numberLocale = useNumberLocale();
    const { cancel, failed, fee: feeCopy, pay } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const formId = useId();
    const sources = useSources(view);
    const label = useRowLabel();
    const target = all ? null : view.next;
    const [openedAt] = useState(Date.now);
    const [sourceId, setSourceId] = useState(
        () => newTransferValues(ledger, view.account.id, 0, openedAt).fromId ?? sources[0]?.id ?? NONE
    );
    const targetFee = target?.fee ?? 0;
    const [feeOpen, setFeeOpen] = useState(targetFee > 0);
    const [feeAmount, setFeeAmount] = useState<number | null>(targetFee > 0 ? targetFee : null);
    const [typed, setTyped] = useState<number | null | undefined>(undefined);
    const [typedLeaves, setTypedLeaves] = useState<number | null | undefined>(undefined);
    const [day, setDay] = useState(ledger.today);
    const [problem, setProblem] = useState<PayProblem>(null);
    const { currency } = view;
    const decimals = decimalsFor(currency);
    const fee = feeAmount ?? 0;
    const feeDelta = roundMoney(fee - targetFee, decimals);
    const owed = roundMoney(view.left + feeDelta, decimals);
    const suggested = all ? owed : roundMoney((target?.remaining ?? 0) + feeDelta, decimals);
    const shownAmount = typed === undefined ? positiveOrNull(suggested) : typed;
    const amount = shownAmount ?? 0;
    const source = sources.find((each) => each.id === sourceId) ?? null;
    const dateText = `${day}T${wallText(openedAt, ledger).split("T")[1] ?? "12:00"}`;
    const { leaves, values } = transferValues(ledger, {
        amount: shownAmount,
        dateText,
        leaves: typedLeaves,
        numberLocale,
        source,
        view,
    });
    const sent = source ? parseAmount(values.sentText, decimalsFor(source.currency)) : 0;
    const amountError = useAmountError(problem, currency, owed);
    const change =
        <Value,>(set: (value: Value) => void) =>
        (value: Value) => {
            set(value);
            setProblem(null);
        };
    const submit = (at: number) => {
        const outcome = payRows(
            { ...ledger, books: ledgerBooks(db) },
            {
                amount,
                date: day === ledger.today ? at : wallInstant(dateText, ledger),
                fee: {
                    amount: fee,
                    changed: target !== null && feeDelta !== 0,
                    note: feeCopy.note({ order: view.name }).value,
                },
                owed,
                source,
                target,
                values,
                view,
            },
            at
        );
        if ("problem" in outcome) {
            setProblem(outcome.problem);
            return;
        }
        void committer.commit(outcome.rows, {
            failed: failed.value,
            saved: pay.saved({ amount: format(amount, currency), name: view.name }).value,
        });
        onClose();
    };
    const dim = amountError !== null || !(amount > 0);
    const dateField = (
        <Field invalid={problem === "rateMissing" || problem === "date"}>
            <Field.Label className={LABEL}>{pay.date}</Field.Label>
            <DayField day={day} label={pay.date.value} max={ledger.today} onDay={change(setDay)} trailing />
            {problem === "rateMissing" ? <Field.Error match>{pay.noRate}</Field.Error> : null}
        </Field>
    );
    const fromField = (
        <Field>
            <Field.Label className={LABEL}>{pay.from}</Field.Label>
            <SourcePick
                onPick={(id) => {
                    setSourceId(id);
                    setTypedLeaves(undefined);
                    setProblem(null);
                }}
                sources={sources}
                value={source ? source.id : NONE}
            />
            {source ? null : (
                <Field.Description className="text-muted-foreground text-app-label">
                    {pay.noneHint({ account: view.account.name })}
                </Field.Description>
            )}
        </Field>
    );
    return (
        <FlowDialog label={<PayTitle all={all} target={target} view={view} />}>
            <Dialog.Body>
                {target ? (
                    <Dialog.Description className="text-app-body -mt-1 mb-3">
                        {target.sequence === 0
                            ? pay.subtitleUpfront({ name: view.name })
                            : pay.subtitle({ count: view.count, index: target.sequence, name: view.name })}
                    </Dialog.Description>
                ) : null}
                <form
                    aria-label={target ? label(view, target) : undefined}
                    className="flex flex-col gap-3.5"
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        // oxlint-disable-next-line react/purity -- runs on submit, not during render.
                        submit(Date.now());
                    }}
                >
                    <Field invalid={amountError !== null}>
                        <MoneyField
                            className={amountError === null ? "max-w-none" : "border-destructive max-w-none"}
                            codes={[currency]}
                            label={pay.amount}
                            onValueChange={(next) => change(setTyped)(next.amount)}
                            ref={focusAmount}
                            value={{ amount: shownAmount, code: currency }}
                        />
                        {amountError ? <Field.Error match>{amountError}</Field.Error> : null}
                    </Field>
                    {all ? (
                        <>
                            {dateField}
                            {fromField}
                        </>
                    ) : (
                        <div className="grid grid-cols-2 items-start gap-3">
                            {fromField}
                            {dateField}
                        </div>
                    )}
                    {source && source.currency !== currency ? (
                        <MoneyField
                            className="max-w-none"
                            codes={[source.currency]}
                            label={pay.leaves({ account: source.name })}
                            onValueChange={(next) => change(setTypedLeaves)(next.amount)}
                            value={{ amount: leaves, code: source.currency }}
                        />
                    ) : null}
                    {target && !feeOpen ? <FeeToggle onAdd={() => setFeeOpen(true)} /> : null}
                    {target && feeOpen ? (
                        <FeeField
                            amount={feeAmount}
                            currency={currency}
                            onAmount={change(setFeeAmount)}
                            onRemove={() => {
                                setFeeOpen(false);
                                setFeeAmount(null);
                            }}
                        />
                    ) : null}
                    {amount > 0 && amountError === null ? (
                        <PaySummary amount={amount} currency={currency} owed={owed} sent={sent} source={source} />
                    ) : null}
                </form>
            </Dialog.Body>
            <Dialog.Footer className="grid grid-cols-2">
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button className={dim ? `opacity-50 ${FOOTER_PILL}` : FOOTER_PILL} form={formId} type="submit">
                    {amount > 0 ? pay.submit({ amount: format(amount, currency) }) : pay.submitEmpty}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

function EditInstallment({ item, onClose, view }: { item: InstallmentView; onClose: () => void; view: PlanView }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { cancel, edit, failed, fee: feeCopy, pay } = useIntlayer("dashboard-installments");
    const remove = useDeleteInstallment();
    const format = useGoalMoney();
    const label = useRowLabel();
    const formId = useId();
    const { currency } = view;
    const decimals = decimalsFor(currency);
    const [day, setDay] = useState(item.day);
    const [typed, setTyped] = useState<number | null>(item.amount);
    const [feeOpen, setFeeOpen] = useState(item.fee > 0);
    const [feeAmount, setFeeAmount] = useState<number | null>(item.fee > 0 ? item.fee : null);
    const [tried, setTried] = useState(false);
    const amount = typed ?? 0;
    const fee = feeAmount ?? 0;
    const invalid = tried && !(amount > 0);
    const submit = (at: number) => {
        setTried(true);
        if (!(amount > 0)) {
            return;
        }
        const books = ledgerBooks(db);
        const doc = books.installments.find((row) => row.localId === item.id);
        if (!doc) {
            onClose();
            return;
        }
        const dueDate = day === item.day ? doc.dueDate : startOfDay(ledger, day);
        const rows: CommitRow[] = [];
        if (amount !== item.amount || dueDate !== doc.dueDate) {
            rows.push(...editedInstallment(books, item.id, { amount, dueDate }, at));
        }
        if (roundMoney(fee - item.fee, decimals) !== 0) {
            const current = { ...ledger, books };
            rows.push(
                ...feeRows(current, view, item.id, { amount: fee, note: feeCopy.note({ order: view.name }).value }, at)
            );
        }
        if (rows.length > 0) {
            void committer.commit(rows, { failed: failed.value, saved: edit.saved.value });
        }
        onClose();
    };
    return (
        <FlowDialog label={label(view, item)}>
            <Dialog.Body>
                <form
                    className="flex flex-col gap-3.5"
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        // oxlint-disable-next-line react/purity -- runs on submit, not during render.
                        submit(Date.now());
                    }}
                >
                    <Field>
                        <Field.Label className={LABEL}>{edit.due}</Field.Label>
                        <DayField day={day} label={edit.due.value} onDay={setDay} trailing />
                    </Field>
                    <Field invalid={invalid}>
                        <MoneyField
                            className={invalid ? "border-destructive max-w-none" : "max-w-none"}
                            codes={[currency]}
                            label={pay.amount}
                            onValueChange={(next) => setTyped(next.amount)}
                            value={{ amount: typed, code: currency }}
                        />
                        {invalid ? (
                            <Field.Error match>{edit.amountRequired({ zero: format(0, currency) })}</Field.Error>
                        ) : null}
                    </Field>
                    {feeOpen ? (
                        <FeeField
                            amount={feeAmount}
                            currency={currency}
                            onAmount={setFeeAmount}
                            onRemove={() => {
                                setFeeOpen(false);
                                setFeeAmount(null);
                            }}
                        />
                    ) : (
                        <FeeToggle onAdd={() => setFeeOpen(true)} />
                    )}
                    {fee > 0 && amount > 0 ? (
                        <div className={SUMMARY}>
                            <SummaryRow label={edit.installment}>{format(amount, currency)}</SummaryRow>
                            <SummaryRow label={feeCopy.label}>+ {format(fee, currency)}</SummaryRow>
                            <SummaryRow label={edit.totalDue}>
                                {format(roundMoney(amount + fee, decimals), currency)}
                            </SummaryRow>
                        </div>
                    ) : null}
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                {item.status === "paid" ? null : (
                    <Button
                        className={`text-destructive me-auto ${FOOTER_PILL}`}
                        onClick={() => {
                            remove(view, item);
                            onClose();
                        }}
                        variant="secondary"
                    >
                        {edit.delete}
                    </Button>
                )}
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button className={FOOTER_PILL} form={formId} type="submit">
                    {edit.save}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

function DeletePending({ onClose, view }: { onClose: () => void; view: PlanView }) {
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { cancel, deletePending: copy, failed } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const navigate = useNavigate();
    const open = openRows(view);
    const amount = format(view.left, view.currency);
    const whole = view.paid === 0;
    let body: ReactNode = copy.body({ amount, count: open.length, name: view.name });
    if (whole) {
        body = copy.whole({ account: view.account.name, amount: format(view.price, view.currency), name: view.name });
    } else if (open.length === 1) {
        body = copy.bodyOne({ amount, name: view.name });
    }
    const remove = () => {
        const rows = pendingDeletion(ledgerBooks(db), view, Date.now());
        onClose();
        committer.commitWithUndo(rows, {
            after: whole
                ? navigate({ to: "/installments", viewTransition: viewTransition("push-left", { back: true }) })
                : undefined,
            failed: failed.value,
            text: copy.done({ name: view.name }).value,
        });
    };
    return (
        <FlowDialog label={copy.title}>
            <Dialog.Body>
                <Dialog.Description className="text-wrap">{body}</Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button className={FOOTER_PILL} onClick={remove} variant="destructive">
                    {copy.confirm}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function InstallmentDialogs({
    flow,
    onClose,
}: {
    flow: InstallmentFlow;
    onClose: () => void;
    onSwitch: (flow: InstallmentFlow) => void;
}) {
    const { ledger } = useDashboard();
    const view = planById(planViews(ledger), flow.planId);
    if (!view) {
        return null;
    }
    switch (flow.kind) {
        case "pay":
        case "payAll": {
            return view.next ? <PayDialog all={flow.kind === "payAll"} onClose={onClose} view={view} /> : null;
        }
        case "edit": {
            const item = view.rows.find((row) => row.id === flow.installmentId);
            return item ? <EditInstallment item={item} key={item.id} onClose={onClose} view={view} /> : null;
        }
        default: {
            return <DeletePending onClose={onClose} view={view} />;
        }
    }
}
