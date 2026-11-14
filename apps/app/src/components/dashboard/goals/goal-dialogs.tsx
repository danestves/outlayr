import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon";
import { decimalsFor } from "@outlayr/money/currency";
import { accountLook } from "@outlayr/money/ledger-log";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { DayField, FlowDialog, MoneyField, plainAmount } from "@/components/dashboard/accounts/fields";
import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountRows, inMain } from "@/components/dashboard/accounts/model";
import type { AccountRow } from "@/components/dashboard/accounts/model";
import { useMonthYear } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { parseAmount } from "@/lib/account-writes";
import { wallInstant, wallText } from "@/lib/entry-writes";
import { addDays } from "@/lib/ledger";
import {
    createdTransfer,
    newTransferInput,
    newTransferProblem,
    newTransferValues,
    repriced,
    rewired,
    transferAccounts,
    withArrived,
    withSent,
} from "@/lib/transfer-create";
import type { NewTransferProblem, NewTransferValues } from "@/lib/transfer-create";

import type { GoalFlow } from "./flow-context";
import { createdGoal, deletedGoal, demand, draftProblems, editedGoal, goalViews, targetInstant } from "./model";
import type { GoalView } from "./model";
import { GoalBar, PERCENT, useGoalMoney } from "./parts";

const FOOTER_PILL = "min-w-max! px-3.5";
const POPUP = "app-shell z-[60]";
const DEFAULT_SPAN_DAYS = 365;
const LABEL = "data-invalid:text-foreground has-[[aria-invalid=true]]:text-foreground";
const LOCKED = "bg-app-fill/40 text-muted-foreground flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm";

function Locked({ row }: { row: Pick<AccountRow, "look" | "name"> }) {
    const { photos } = useDashboard();
    return (
        <div className={LOCKED}>
            <AccountTile account={row.look} photos={photos} size="sm" />
            <span className="min-w-0 truncate">{row.name}</span>
            <Glyph icon={SquareLock02Icon} className="ml-auto flex-none" size={15} />
        </div>
    );
}

function Hint({ children, icon = Calendar03Icon }: { children: ReactNode; icon?: typeof Calendar03Icon }) {
    return (
        <p className="text-muted-foreground flex items-center gap-2 border-t pt-3 text-[13px] leading-5">
            <Glyph icon={icon} className="flex-none" size={15} />
            {children}
        </p>
    );
}

function AccountPick({
    onPick,
    rows,
    value,
}: {
    onPick: (id: string) => void;
    rows: readonly AccountRow[];
    value: string | null;
}) {
    const { dialog } = useIntlayer("dashboard-goals");
    const { photos } = useDashboard();
    const format = useGoalMoney();
    const picked = rows.find((row) => row.id === value);
    return (
        <Select
            items={rows.map((row) => ({ label: row.name, value: row.id }))}
            onValueChange={(next) => next !== null && onPick(next)}
            value={value}
        >
            <Select.Trigger aria-label={dialog.account.value} className="[&>[data-slot=select-value]]:flex-none">
                {picked ? <AccountTile account={picked.look} photos={photos} size="sm" /> : null}
                <Select.Value placeholder={dialog.noAccounts.value} />
                {picked ? (
                    <span className="dash-figure text-muted-foreground ml-auto truncate ps-2 text-xs">
                        {dialog.holdsToday({ amount: format(picked.balance, picked.currency) })}
                    </span>
                ) : null}
            </Select.Trigger>
            <Select.Content className={POPUP}>
                {rows.map((row) => (
                    <Select.Item
                        icon={<AccountTile account={row.look} photos={photos} size="sm" />}
                        key={row.id}
                        value={row.id}
                    >
                        {row.name}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select>
    );
}

function NoAccounts({ onClose }: { onClose: () => void }) {
    const { cancel, dialog } = useIntlayer("dashboard-goals");
    const { open } = useAccountFlows();
    return (
        <FlowDialog label={dialog.newTitle}>
            <Dialog.Body className="gap-3">
                <Field>
                    <Field.Label className={LABEL}>{dialog.account}</Field.Label>
                    <Select disabled items={[]} value={null}>
                        <Select.Trigger aria-label={dialog.account.value}>
                            <Select.Value placeholder={dialog.noAccounts.value} />
                        </Select.Trigger>
                    </Select>
                </Field>
                <p className="rounded-lg border px-3 py-2.5 text-[13px] leading-5">{dialog.noAccountsBody}</p>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button
                    className={FOOTER_PILL}
                    onClick={() => {
                        onClose();
                        open({ kind: "create", type: "bank" });
                    }}
                >
                    <Glyph icon={Add01Icon} size={16} />
                    {dialog.createAccount}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

function Demand({
    account,
    view,
    target,
    day,
}: {
    account: AccountRow;
    day: string;
    target: number;
    view: GoalView | null;
}) {
    const { ledger } = useDashboard();
    const { dialog } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const saved = view ? view.saved : Math.max(0, account.value);
    const asked = view
        ? demand(ledger, saved, view.start, view.startDay, target, day)
        : demand(ledger, saved, saved, ledger.today, target, day);
    if (asked === null) {
        return null;
    }
    if (asked.reached) {
        return <Hint>{dialog.already({ account: account.name })}</Hint>;
    }
    const perMonth = format(asked.pace?.perMonth ?? asked.remaining, ledger.currency);
    if (view) {
        return <Hint>{dialog.committing({ amount: perMonth })}</Hint>;
    }
    const months = asked.pace?.monthsLeft ?? 0;
    if (months < 1) {
        return <Hint>{dialog.demandsNow({ amount: format(asked.remaining, ledger.currency) })}</Hint>;
    }
    return (
        <Hint>
            {months === 1
                ? dialog.demandsOne({ amount: perMonth })
                : dialog.demands({ amount: perMonth, count: months })}
        </Hint>
    );
}

interface SaveDraft {
    account: AccountRow;
    day: string;
    name: string;
    target: number;
}

function useSaveGoal({
    onClose,
    onSwitch,
    view,
}: {
    onClose: () => void;
    onSwitch: (flow: GoalFlow) => void;
    view: GoalView | null;
}) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { dialog, toast: toastCopy } = useIntlayer("dashboard-goals");
    const commit = (row: Parameters<typeof committer.commit>[0][number], saved: string) => {
        void committer.commit([row], { failed: dialog.saveFailed.value, saved });
        onClose();
    };
    return ({ account, day, name, target }: SaveDraft, at: number) => {
        const { books } = committer.current();
        const kept = view && day === view.targetDay ? view.goal.targetDate : null;
        const targetDate = kept ?? targetInstant(ledger, day);
        const named = name.trim() === "" ? account.name : name.trim();
        if (view) {
            const row = editedGoal(books, view.goal, { name: named, targetAmount: target, targetDate }, at);
            if (row !== null) {
                commit(row, toastCopy.saved.value);
            }
            return row !== null;
        }
        if (!account.exact) {
            onSwitch({ account: account.name, kind: "unvalued" });
            return true;
        }
        const draft = {
            accountId: account.id,
            currency: ledger.currency,
            name: named,
            startAmount: account.value,
            targetAmount: target,
            targetDate,
        };
        const row = createdGoal(books, draft, crypto.randomUUID(), at);
        if (row !== null) {
            commit(row, toastCopy.created.value);
        }
        return row !== null;
    };
}

function FormSummary({
    account,
    day,
    saved,
    target,
}: {
    account: AccountRow;
    day: string;
    saved: number;
    target: number;
}) {
    const { dialog } = useIntlayer("dashboard-goals");
    const { currency } = useDashboard().ledger;
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
                <span className="text-muted-foreground min-w-0">
                    {dialog.summary({ account: account.name, amount: format(target, currency), month: monthYear(day) })}
                </span>
                <span className="dash-figure text-muted-foreground flex-none text-xs">
                    {Math.min(PERCENT, Math.round((saved / target) * PERCENT))}%
                </span>
            </div>
            <GoalBar reached={saved >= target} value={saved / target} />
        </div>
    );
}

function AccountField({
    invalid,
    onPick,
    rows,
    value,
    view,
}: {
    invalid: boolean;
    onPick: (id: string) => void;
    rows: readonly AccountRow[];
    value: string | null;
    view: GoalView | null;
}) {
    const { dialog } = useIntlayer("dashboard-goals");
    return (
        <Field invalid={invalid}>
            <Field.Label className={LABEL}>{dialog.account}</Field.Label>
            {view ? (
                <>
                    <Locked row={view.account} />
                    <Field.Description className="text-xs">{dialog.accountLocked}</Field.Description>
                </>
            ) : (
                <AccountPick onPick={onPick} rows={rows} value={value} />
            )}
            {invalid ? <Field.Error match>{dialog.accountRequired}</Field.Error> : null}
        </Field>
    );
}

function FormFooter({
    dim,
    formId,
    onClose,
    onSwitch,
    view,
}: {
    dim: boolean;
    formId: string;
    onClose: () => void;
    onSwitch: (flow: GoalFlow) => void;
    view: GoalView | null;
}) {
    const { cancel, dialog } = useIntlayer("dashboard-goals");
    return (
        <Dialog.Footer>
            {view ? (
                <Button
                    className={`text-destructive me-auto ${FOOTER_PILL}`}
                    onClick={() => onSwitch({ goalId: view.id, kind: "delete" })}
                    variant="secondary"
                >
                    <Glyph icon={Delete02Icon} size={16} />
                    {dialog.deleteGoal}
                </Button>
            ) : null}
            <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                {cancel}
            </Button>
            <Button className={dim ? `opacity-50 ${FOOTER_PILL}` : FOOTER_PILL} form={formId} type="submit">
                {view ? dialog.saveGoal : dialog.setGoal}
            </Button>
        </Dialog.Footer>
    );
}

function FormPreview({
    account,
    datedWrong,
    day,
    saved,
    target,
    view,
}: {
    account: AccountRow;
    datedWrong: boolean;
    day: string;
    saved: number;
    target: number;
    view: GoalView | null;
}) {
    return (
        <>
            {view || datedWrong ? null : <FormSummary account={account} day={day} saved={saved} target={target} />}
            {view && !view.comparable ? null : (
                <Demand account={account} day={day} target={view ? viewTarget(view, target) : target} view={view} />
            )}
        </>
    );
}

function GoalForm({
    onClose,
    onSwitch,
    view,
}: {
    onClose: () => void;
    onSwitch: (flow: GoalFlow) => void;
    view: GoalView | null;
}) {
    const { ledger, overview } = useDashboard();
    const copy = useIntlayer("dashboard-goals");
    const { dialog } = copy;
    const format = useGoalMoney();
    const formId = useId();
    const save = useSaveGoal({ onClose, onSwitch, view });
    const rows = useMemo(() => accountRows(ledger, overview), [ledger, overview]);
    const currency = view?.goal.currency ?? ledger.currency;
    const [accountId, setAccountId] = useState(view?.account.id ?? rows[0]?.id ?? null);
    const [name, setName] = useState(view?.name ?? "");
    const [amountText, setAmountText] = useState(view ? plainAmount(view.goal.targetAmount, currency) : "");
    const [day, setDay] = useState(view?.targetDay ?? addDays(ledger.today, DEFAULT_SPAN_DAYS));
    const [tried, setTried] = useState(false);
    const [failed, setFailed] = useState(false);
    if (!view && rows.length === 0) {
        return <NoAccounts onClose={onClose} />;
    }
    const account = rows.find((row) => row.id === accountId) ?? view?.account ?? null;
    const target = parseAmount(amountText, decimalsFor(currency));
    const problems = draftProblems(ledger, { accountId, amountText, day, name }, view?.targetDay ?? null);
    const shown = tried ? problems : [];
    const zero = format(0, currency);
    const saved = view ? view.saved : Math.max(0, account?.value ?? 0);
    const submit = (at: number) => {
        setTried(true);
        if (problems.length === 0 && account) {
            setFailed(!save({ account, day, name, target }, at));
        }
    };
    const dim = shown.length > 0 || amountText.trim() === "";
    return (
        <FlowDialog label={view ? dialog.editTitle : dialog.newTitle}>
            <Dialog.Body>
                <form
                    className="flex flex-col gap-3.5"
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit(Date.now());
                    }}
                >
                    <AccountField
                        invalid={shown.includes("account")}
                        onPick={setAccountId}
                        rows={rows}
                        value={accountId}
                        view={view}
                    />
                    <Field>
                        <Field.Label className={LABEL}>{dialog.name}</Field.Label>
                        <Input
                            autoFocus={Boolean(view)}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={account?.name}
                            value={name}
                        />
                    </Field>
                    <div className="grid grid-cols-2 items-start gap-3">
                        <Field invalid={shown.includes("amount")}>
                            <Field.Label className={LABEL}>{dialog.amount}</Field.Label>
                            <MoneyField
                                autoFocus={!view}
                                currency={currency}
                                invalid={shown.includes("amount")}
                                label={dialog.amount.value}
                                onText={setAmountText}
                                text={amountText}
                            />
                            {shown.includes("amount") ? (
                                <Field.Error match>{copy.amountRequired({ zero })}</Field.Error>
                            ) : null}
                        </Field>
                        <Field invalid={shown.includes("date")}>
                            <Field.Label className={LABEL}>{dialog.by}</Field.Label>
                            <DayField
                                day={day}
                                invalid={shown.includes("date")}
                                label={dialog.by.value}
                                min={addDays(ledger.today, 1)}
                                onDay={setDay}
                            />
                            {shown.includes("date") ? <Field.Error match>{copy.dateRequired}</Field.Error> : null}
                        </Field>
                    </div>
                    {account && target > 0 ? (
                        <FormPreview
                            account={account}
                            datedWrong={problems.includes("date")}
                            day={day}
                            saved={saved}
                            target={target}
                            view={view}
                        />
                    ) : null}
                    {failed ? (
                        <p className="text-destructive text-xs" role="alert">
                            {dialog.saveFailed}
                        </p>
                    ) : null}
                </form>
            </Dialog.Body>
            <FormFooter dim={dim} formId={formId} onClose={onClose} onSwitch={onSwitch} view={view} />
        </FlowDialog>
    );
}

const viewTarget = (view: GoalView, typed: number) =>
    view.goal.targetAmount === 0 ? typed : (typed * view.target) / view.goal.targetAmount;

function Unvalued({ account, onClose }: { account: string; onClose: () => void }) {
    const { dialog } = useIntlayer("dashboard-goals");
    return (
        <FlowDialog label={dialog.unvaluedTitle}>
            <Dialog.Body>
                <Dialog.Description className="text-wrap">{dialog.unvaluedBody({ account })}</Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose}>
                    {dialog.ok}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

function DeleteGoal({ onClose, view }: { onClose: () => void; view: GoalView }) {
    const committer = useLedgerCommitter();
    const { cancel, delete: copy } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const navigate = useNavigate();
    const remove = () => {
        onClose();
        committer.commitWithUndo([deletedGoal(view.goal, Date.now())], {
            after: navigate({ to: "/goals" }),
            failed: copy.failed.value,
            text: copy.toast.value,
        });
    };
    return (
        <FlowDialog label={copy.title({ name: view.name })}>
            <Dialog.Body>
                <Dialog.Description className="text-wrap">
                    {copy.body({
                        account: view.account.name,
                        amount: format(view.account.balance, view.account.currency),
                    })}
                </Dialog.Description>
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

function AddMoney({ onClose, view }: { onClose: () => void; view: GoalView }) {
    const { ledger, overview, photos } = useDashboard();
    const committer = useLedgerCommitter();
    const { add, cancel, dialog } = useIntlayer("dashboard-goals");
    const copy = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const formId = useId();
    const rows = useMemo(() => accountRows(ledger, overview), [ledger, overview]);
    const [values, setValues] = useState<NewTransferValues>(() =>
        newTransferValues(ledger, view.account.id, 0, Date.now())
    );
    const [problem, setProblem] = useState<NewTransferProblem | "overdrawn" | null>(null);
    const change = (next: NewTransferValues) => {
        setValues(next);
        setProblem(null);
    };
    const sources = transferAccounts(ledger.books).filter((row) => row.localId !== view.account.id);
    const options = sources.map((row) => ({
        icon: <AccountTile account={accountLook(row)} photos={photos} size="sm" />,
        label: row.name,
        value: row.localId,
    }));
    const from = rows.find((row) => row.id === values.fromId) ?? null;
    const fromCurrency = from?.currency ?? ledger.currency;
    const intoCurrency = view.account.currency;
    const sent = parseAmount(values.sentText, decimalsFor(fromCurrency));
    const input = newTransferInput(ledger, values);
    const arriving = input?.toAmount ?? 0;
    const overdrawn = from !== null && from.kind === "asset" && sent > Math.max(0, from.balance);
    const signed = view.savedCurrency === intoCurrency ? view.account.balance : view.account.value;
    const added = view.savedCurrency === intoCurrency ? arriving : inMain(ledger, arriving, intoCurrency).value;
    const after = Math.max(0, signed + added);
    const [dayText = ledger.today, time = "00:00"] = values.dateText.split("T");
    const submit = () => {
        const at = Date.now();
        const current = committer.current();
        const found = newTransferProblem(current, values);
        if (found !== null || overdrawn) {
            setProblem(found ?? "overdrawn");
            return;
        }
        const draft = newTransferInput(current, values);
        if (draft === null) {
            setProblem("accounts");
            return;
        }
        const date = values.dateText === wallText(at, ledger) ? at : wallInstant(values.dateText, ledger);
        const created = createdTransfer(current, crypto.randomUUID(), { ...draft, date: new Date(date) }, at);
        void committer.commit(created, {
            failed: dialog.saveFailed.value,
            saved: add.saved({ amount: format(sent, fromCurrency), name: view.name }).value,
        });
        onClose();
    };
    const amountError =
        (problem === "amount" && copy.amountRequired({ zero: format(0, fromCurrency) })) ||
        ((problem === "overdrawn" || overdrawn) &&
            from &&
            add.onlyHolds({ account: from.name, amount: format(from.balance, from.currency) })) ||
        null;
    const dim = amountError !== null || sent <= 0;
    const share = (amount: number) => `${Math.min(PERCENT, Math.max(0, (amount / view.target) * PERCENT))}%`;
    return (
        <FlowDialog label={add.title({ name: view.name })}>
            <Dialog.Body>
                <form
                    className="flex flex-col gap-3.5"
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <Field invalid={Boolean(amountError)}>
                        <Field.Label className={LABEL}>{add.amount}</Field.Label>
                        <MoneyField
                            autoFocus
                            currency={fromCurrency}
                            invalid={Boolean(amountError)}
                            label={add.amount.value}
                            onText={(text) => change(withSent(ledger, values, text))}
                            text={values.sentText}
                        />
                        {amountError ? <Field.Error match>{amountError}</Field.Error> : null}
                    </Field>
                    <div className="grid grid-cols-2 items-start gap-3">
                        <Field invalid={problem === "accounts" || problem === "same-account"}>
                            <Field.Label className={LABEL}>{add.from}</Field.Label>
                            <Select
                                items={options.map((option) => ({ label: option.label, value: option.value }))}
                                onValueChange={(next) =>
                                    next !== null && change(rewired(ledger, values, next, view.account.id))
                                }
                                value={values.fromId}
                            >
                                <Select.Trigger aria-label={add.from.value}>
                                    {options.find((option) => option.value === values.fromId)?.icon}
                                    <Select.Value placeholder={add.noSource.value} />
                                </Select.Trigger>
                                <Select.Content className={POPUP}>
                                    {options.map((option) => (
                                        <Select.Item icon={option.icon} key={option.value} value={option.value}>
                                            {option.label}
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select>
                            {problem === "accounts" ? <Field.Error match>{add.noSource}</Field.Error> : null}
                        </Field>
                        <Field>
                            <Field.Label className={LABEL}>{add.into}</Field.Label>
                            <Locked row={view.account} />
                        </Field>
                    </div>
                    {fromCurrency === intoCurrency ? null : (
                        <Field>
                            <Field.Label className={LABEL}>{add.arrives}</Field.Label>
                            <MoneyField
                                currency={intoCurrency}
                                label={add.arrives.value}
                                onText={(text) => change(withArrived(ledger, values, text))}
                                text={values.arrivedText}
                            />
                        </Field>
                    )}
                    <Field invalid={problem === "date" || problem === "rateMissing"}>
                        <Field.Label className={LABEL}>{add.date}</Field.Label>
                        <DayField
                            day={dayText}
                            label={add.date.value}
                            onDay={(day) => change(repriced(ledger, { ...values, dateText: `${day}T${time}` }))}
                        />
                        {problem === "rateMissing" ? <Field.Error match>{add.noRate}</Field.Error> : null}
                    </Field>
                    {arriving > 0 && !amountError && view.comparable ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
                                <span className="text-muted-foreground">{add.afterThis}</span>
                                <span className="dash-figure">
                                    {add.ofTarget({
                                        saved: format(after, ledger.currency),
                                        target: format(view.target, ledger.currency),
                                    })}
                                </span>
                            </div>
                            <div className="bg-app-tint/16 flex h-2 overflow-hidden rounded-full">
                                <i className="bg-app-tint block h-full" style={{ width: share(view.saved) }} />
                                <i
                                    className="bg-app-tint/55 block h-full"
                                    style={{ width: share(after - view.saved) }}
                                />
                            </div>
                            <p className="text-muted-foreground text-xs leading-4">{add.note}</p>
                        </div>
                    ) : null}
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button className={dim ? `opacity-50 ${FOOTER_PILL}` : FOOTER_PILL} form={formId} type="submit">
                    {sent > 0 ? add.submit({ amount: format(sent, fromCurrency) }) : add.submitEmpty}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function GoalDialogs({
    flow,
    onClose,
    onSwitch,
}: {
    flow: GoalFlow;
    onClose: () => void;
    onSwitch: (flow: GoalFlow) => void;
}) {
    const { ledger, overview } = useDashboard();
    const views = useMemo(() => goalViews(ledger, accountRows(ledger, overview)), [ledger, overview]);
    if (flow.kind === "create") {
        return <GoalForm onClose={onClose} onSwitch={onSwitch} view={null} />;
    }
    if (flow.kind === "unvalued") {
        return <Unvalued account={flow.account} onClose={onClose} />;
    }
    const view = views.find((each) => each.id === flow.goalId);
    if (!view) {
        return null;
    }
    switch (flow.kind) {
        case "edit": {
            return <GoalForm key={view.id} onClose={onClose} onSwitch={onSwitch} view={view} />;
        }
        case "add": {
            return <AddMoney onClose={onClose} view={view} />;
        }
        default: {
            return <DeleteGoal onClose={onClose} view={view} />;
        }
    }
}
