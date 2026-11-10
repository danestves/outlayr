import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { Tabs } from "panelui-web/tabs";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { CurrencyField, Fact, FlowDialog } from "@/components/dashboard/accounts/fields";
import { UNDO_HOLD_MS, useAccountFlows, useLedgerDb } from "@/components/dashboard/accounts/flows";
import type { AccountRow } from "@/components/dashboard/accounts/model";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { useCategoryOptions } from "@/components/dashboard/transactions/entry-form";
import { deletedAccount, frozenUsd, parseAmount } from "@/lib/account-writes";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { wallInstant, wallText } from "@/lib/entry-writes";
import { addDays } from "@/lib/ledger";
import type { CommitRow } from "@/lib/ledger-committer";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { createdTransfer, marketRate } from "@/lib/transfer-create";

import { targetInstant } from "../goals/model";
import {
    AccountPick,
    Chips,
    DayField,
    FOOTER_PILL,
    LABEL,
    MoneyField,
    POPUP,
    PersonField,
    Pick,
    matchPerson,
    plainAmount,
} from "./fields";
import type { DebtFlow, NewVerb } from "./flow-context";
import { planAsk, plansOf, standingOf, takesPayoffPlan } from "./model";
import type { DebtRow } from "./model";
import { liveLine, peopleOf, useDebts, useRemovePlan } from "./parts";
import {
    createdPerson,
    debtTransferInput,
    movementProblem,
    onCreditRows,
    outsideMove,
    payoffPlanRows,
    renamedPerson,
} from "./writes";
import type { DebtVerb } from "./writes";

const QUICK_PEOPLE = 4;
const USD = "USD";
const FRIDAY = 5;
const WEEK = 7;
const PLAN_MONTHS = [3, 4, 6, 12] as const;
const YEAR_MONTHS = 12;
const DEFAULT_PLAN_MONTHS = 2;

type Problem = "rateMissing" | "saveFailed" | null;

const sameDayAt = (ledger: Pick<Ledger, "offsetAt">, day: string, at: number) =>
    `${day}${wallText(at, ledger).slice(10)}`;

const instantOf = (ledger: Pick<Ledger, "offsetAt" | "today">, day: string, at: number) =>
    day === ledger.today ? at : wallInstant(sameDayAt(ledger, day, at), ledger);

function addMonths(day: string, months: number) {
    const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
    const last = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month - 1 + months, Math.min(date, last))).toISOString().slice(0, 10);
}

const signedBy = (verb: DebtVerb | NewVerb, amount: number) =>
    verb === "borrowed" || verb === "bought" || verb === "gotPaidBack" ? -amount : amount;

function useWrite() {
    const committer = useLedgerCommitter();
    const { form } = useIntlayer("dashboard-debts");
    const { toast } = useAccountFlows();
    return (rows: readonly CommitRow[], text: string, undoable = false) => {
        const held = committer.commit(rows, undoable ? { holdMs: UNDO_HOLD_MS } : undefined);
        void held.settled.then((outcome) => {
            if (outcome.status === "failed") {
                toast({ failed: true, text: form.saveFailed.value });
            }
        });
        if (!undoable) {
            toast({ text });
            return;
        }
        toast({
            onExpire: () => {
                void held.flush();
            },
            onUndo: () => {
                held.undo();
            },
            text,
        });
    };
}

/** Bank accounts and cards: what money can move in or out of. */
function useMoneyAccounts() {
    const { rows } = useDebts();
    return useMemo(() => rows.filter((row) => row.kind !== "person"), [rows]);
}

const defaultAccount = (rows: readonly AccountRow[], currency: string) =>
    (rows.find((row) => row.kind === "asset" && row.currency === currency) ?? rows.find((row) => row.kind === "asset"))
        ?.id ?? null;

interface MoveState {
    /** Undefined while the pick follows the default account. */
    accountId: string | null | undefined;
    /** Null while the other leg follows the day's rate. */
    crossText: string | null;
    day: string;
    usdText: string;
}

function useMoveState() {
    const { ledger } = useDashboard();
    const [state, setState] = useState<MoveState>({
        accountId: undefined,
        crossText: null,
        day: ledger.today,
        usdText: "",
    });
    return [state, (patch: Partial<MoveState>) => setState((last) => ({ ...last, ...patch }))] as const;
}

const pickedId = (state: MoveState, fallback: string | null) =>
    state.accountId === undefined ? fallback : state.accountId;

const usdMissing = (ledger: Ledger, currency: string, day: string) =>
    currency !== USD && frozenUsd(ledger.books, 1, currency, wallInstant(`${day}T12:00`, ledger)) === null;

interface MoveInput {
    amount: number;
    fallback: string | null;
    personCurrency: string;
    rows: readonly AccountRow[];
    state: MoveState;
}

/** Where the money went and when, with the second leg asked for only when the currencies cross. */
function moveOf(ledger: Ledger, { amount, fallback, personCurrency, rows, state }: MoveInput) {
    const account = rows.find((row) => row.id === pickedId(state, fallback)) ?? null;
    const crossed = account !== null && account.currency !== personCurrency;
    const accountCurrency = account?.currency ?? personCurrency;
    const rate = crossed ? marketRate(ledger, personCurrency, accountCurrency, `${state.day}T12:00`) : null;
    const marketText =
        rate !== null && amount > 0
            ? plainAmount(roundMoney(amount * rate, decimalsFor(accountCurrency)), accountCurrency)
            : "";
    const crossText = state.crossText ?? marketText;
    const needsUsd = account === null && usdMissing(ledger, personCurrency, state.day);
    return {
        account,
        cross: crossed ? parseAmount(crossText, decimalsFor(accountCurrency)) : amount,
        crossByHand: state.crossText !== null,
        crossText,
        crossed,
        needsUsd,
        state,
        usd: needsUsd ? parseAmount(state.usdText, decimalsFor(USD)) : null,
    };
}

type Move = ReturnType<typeof moveOf> & { set: (patch: Partial<MoveState>) => void };

function useMove(rows: readonly AccountRow[], personCurrency: string, amount: number) {
    const { ledger } = useDashboard();
    const [state, set] = useMoveState();
    const fallback = defaultAccount(rows, personCurrency);
    return { ...moveOf(ledger, { amount, fallback, personCurrency, rows, state }), set };
}

const moveProblems = (move: Move) => ({
    cross: move.crossed && !(move.cross > 0),
    usd: move.needsUsd && !((move.usd ?? 0) > 0),
});

function MoveFields({
    accountLabel,
    move,
    rows,
    tried,
}: {
    accountLabel: string;
    move: Move;
    rows: readonly AccountRow[];
    tried: boolean;
}) {
    const { form } = useIntlayer("dashboard-debts");
    const { account, state } = move;
    return (
        <>
            <div className="grid grid-cols-2 items-start gap-3">
                <Field>
                    <Field.Label className={LABEL}>{accountLabel}</Field.Label>
                    <AccountPick
                        label={accountLabel}
                        onPick={(accountId) => move.set({ accountId, crossText: null })}
                        rows={rows}
                        value={move.account?.id ?? null}
                    />
                </Field>
                <Field>
                    <Field.Label className={LABEL}>{form.date}</Field.Label>
                    <DayField day={state.day} label={form.date.value} onDay={(day) => move.set({ day })} />
                </Field>
            </div>
            {move.crossed && account ? (
                <CrossField
                    currency={account.currency}
                    invalid={tried && !(move.cross > 0)}
                    onText={(crossText) => move.set({ crossText })}
                    text={move.crossText}
                />
            ) : null}
            {move.needsUsd ? (
                <CrossField
                    currency={USD}
                    invalid={tried && !((move.usd ?? 0) > 0)}
                    onText={(usdText) => move.set({ usdText })}
                    text={state.usdText}
                />
            ) : null}
        </>
    );
}

function CrossField({
    currency,
    invalid,
    onText,
    text,
}: {
    currency: string;
    invalid: boolean;
    onText: (text: string) => void;
    text: string;
}) {
    const { form } = useIntlayer("dashboard-debts");
    const label = form.inCurrency({ currency }).value;
    return (
        <Field invalid={invalid}>
            <Field.Label className={LABEL}>{label}</Field.Label>
            <MoneyField currency={currency} invalid={invalid} label={label} onText={onText} text={text} />
            {invalid ? <Field.Error match>{form.inCurrencyRequired({ currency })}</Field.Error> : null}
        </Field>
    );
}

interface Moved {
    amount: number;
    at: number;
    move: Move;
    note: string;
    person: { currency: string; id: string };
    verb: DebtVerb;
}

/** A transfer when an account took part, else a move that only shifts the balance. */
type MovedRows = { problem: "rateMissing" | "saveFailed" } | { rows: CommitRow[] };

function movedRows(ledger: Ledger, { amount, at, move, note, person, verb }: Moved): MovedRows {
    const date = instantOf(ledger, move.state.day, at);
    const { account } = move;
    if (account === null) {
        const row = outsideMove(
            ledger.books,
            { amount, date, note, person, usd: move.usd, verb },
            crypto.randomUUID(),
            at
        );
        const priced = row.table === "outsideMoves" && row.fields.amountUsd !== null;
        return priced ? { rows: [row] } : { problem: "rateMissing" as const };
    }
    const input = debtTransferInput({
        account: { accountId: account.id, amount: move.cross, currency: account.currency },
        byHand: move.crossByHand,
        date,
        note,
        person: { accountId: person.id, amount, currency: person.currency },
        verb,
    });
    const problem = movementProblem(ledger, input);
    return problem === null
        ? { rows: createdTransfer(ledger, crypto.randomUUID(), input, at) }
        : { problem: "rateMissing" as const };
}

function useSettledToast() {
    const { settle } = useIntlayer("dashboard-debts");
    return (name: string) => settle.toast({ name }).value;
}

function ProblemLine({ problem }: { problem: Problem }) {
    const { form } = useIntlayer("dashboard-debts");
    if (problem === null) {
        return null;
    }
    return (
        <p className="text-destructive text-xs" role="alert">
            {problem === "rateMissing" ? form.noRate : form.saveFailed}
        </p>
    );
}

function Footer({
    children,
    dim,
    formId,
    label,
    onClose,
}: {
    children?: ReactNode;
    dim: boolean;
    formId: string;
    label: ReactNode;
    onClose: () => void;
}) {
    const { cancel } = useIntlayer("dashboard-debts");
    return (
        <Dialog.Footer>
            {children}
            <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                {cancel}
            </Button>
            <Button className={dim ? `opacity-50 ${FOOTER_PILL}` : FOOTER_PILL} form={formId} type="submit">
                {label}
            </Button>
        </Dialog.Footer>
    );
}

function DebtForm({
    children,
    formId,
    onSubmit,
}: {
    children: ReactNode;
    formId: string;
    onSubmit: (at: number) => void;
}) {
    return (
        <form
            className="flex flex-col gap-3.5"
            id={formId}
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(Date.now());
            }}
        >
            {children}
        </form>
    );
}

function AmountField({
    autoFocus = true,
    currency,
    invalid,
    onText,
    text,
    children,
}: {
    autoFocus?: boolean;
    children?: ReactNode;
    currency: string;
    invalid: boolean;
    onText: (text: string) => void;
    text: string;
}) {
    const { form } = useIntlayer("dashboard-debts");
    return (
        <Field invalid={invalid}>
            <Field.Label className={LABEL}>{form.amount}</Field.Label>
            <MoneyField
                autoFocus={autoFocus}
                big
                currency={currency}
                invalid={invalid}
                label={form.amount.value}
                onText={onText}
                text={text}
            />
            {invalid ? <Field.Error match>{form.amountRequired}</Field.Error> : null}
            {children}
        </Field>
    );
}

function NoteField({
    label,
    onText,
    placeholder,
    text,
}: {
    label?: string;
    onText: (text: string) => void;
    placeholder?: string;
    text: string;
}) {
    const { form } = useIntlayer("dashboard-debts");
    return (
        <Field>
            <Field.Label className={LABEL}>{label ?? form.note}</Field.Label>
            <Input
                onChange={(event) => onText(event.target.value)}
                placeholder={placeholder ?? form.optional.value}
                value={text}
            />
        </Field>
    );
}

function CategoryField({
    error,
    income,
    onPick,
    placeholder,
    value,
}: {
    error: ReactNode;
    income: boolean;
    onPick: (id: string) => void;
    placeholder?: string;
    value: string | null;
}) {
    const { ledger } = useDashboard();
    const { form } = useIntlayer("dashboard-debts");
    const options = useCategoryOptions(ledger, income);
    const picked = options.find((option) => option.value === value);
    return (
        <Field invalid={error !== null}>
            <Field.Label className={LABEL}>{form.category}</Field.Label>
            <Select
                items={options.map(({ label, value: id }) => ({ label, value: id }))}
                onValueChange={(next) => next !== null && onPick(next)}
                value={value}
            >
                <Select.Trigger
                    aria-invalid={error === null ? undefined : true}
                    aria-label={form.category.value}
                    className="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-3"
                >
                    {picked?.icon}
                    <Select.Value placeholder={placeholder ?? form.categoryPlaceholder.value} />
                </Select.Trigger>
                <Select.Content className={POPUP}>
                    {options.map((option) => (
                        <Select.Item icon={option.icon} key={option.value} value={option.value}>
                            {option.label}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
            {error === null ? null : <Field.Error match>{error}</Field.Error>}
        </Field>
    );
}

/** A day to pay back by, or none: picking one sets a payoff plan after the write. */
function PlanDayField({
    day,
    invalid,
    label,
    onDay,
}: {
    day: string | null;
    invalid: boolean;
    label: string;
    onDay: (day: string | null) => void;
}) {
    const { ledger } = useDashboard();
    const { form, plan } = useIntlayer("dashboard-debts");
    return (
        <Field invalid={invalid}>
            <Field.Label className={LABEL}>{label}</Field.Label>
            {day === null ? (
                <Button
                    className="text-muted-foreground w-full justify-start px-3 font-normal"
                    onClick={() => onDay(addMonths(ledger.today, DEFAULT_PLAN_MONTHS))}
                    type="button"
                    variant="outline"
                >
                    {form.optional}
                </Button>
            ) : (
                <DayField day={day} invalid={invalid} label={label} min={addDays(ledger.today, 1)} onDay={onDay} />
            )}
            {invalid ? <Field.Error match>{plan.dateRequired}</Field.Error> : null}
        </Field>
    );
}

function usePeopleChoices() {
    const { model } = useDebts();
    return useMemo(() => {
        const people = peopleOf(model);
        const choices = people.map((row) => ({ id: row.account.id, name: row.account.name }));
        return {
            choices: choices.toSorted((a, b) => a.name.localeCompare(b.name)),
            people,
            quick: choices.slice(0, QUICK_PEOPLE),
        };
    }, [model]);
}

function planFor(ledger: Ledger, person: DebtRow | null) {
    if (person === null) {
        return { all: [], live: null };
    }
    return { all: plansOf(ledger, person.account.id), live: liveLine(person)?.goal ?? null };
}

const VERBS: readonly NewVerb[] = ["borrowed", "lent", "bought", "sold"];

interface NewDebtDraft {
    amount: number;
    amountText: string;
    categoryId: string | null;
    currency: string;
    move: Move;
    name: string;
    note: string;
    person: DebtRow | null;
    usd: number | null;
    verb: NewVerb;
}

const isOnCredit = (verb: NewVerb) => verb === "bought" || verb === "sold";

/** The person, when new, then whatever moved: an entry on credit, a transfer, or only an opening balance. */
function newDebtRows(ledger: Ledger, draft: NewDebtDraft, id: string, at: number): MovedRows {
    const { amount, currency, move, person, usd, verb } = draft;
    const fresh = (opening: number) =>
        createdPerson(
            ledger.books,
            {
                currency,
                name: draft.name,
                opening,
                openingUsd: opening === 0 ? null : usd,
                openedAt: instantOf(ledger, move.state.day, at),
            },
            id,
            at
        );
    const opened = person ? [] : [fresh(0)];
    if (isOnCredit(verb)) {
        const made = onCreditRows(
            ledger,
            {
                amountText: draft.amountText,
                categoryId: draft.categoryId,
                currency,
                dateText: wallText(at, ledger),
                income: verb === "sold",
                note: draft.note,
                personId: id,
                usd,
            },
            amount,
            crypto.randomUUID(),
            at
        );
        if ("problem" in made) {
            return { problem: made.problem === "rateMissing" ? "rateMissing" : "saveFailed" };
        }
        return { rows: [...opened, ...made.rows] };
    }
    if (person === null && move.account === null) {
        const row = fresh(signedBy(verb, amount));
        return row.table === "accounts" && row.fields.initialBalanceUsd === null
            ? { problem: "rateMissing" }
            : { rows: [row] };
    }
    const moved = movedRows(ledger, {
        amount,
        at,
        move,
        note: draft.note,
        person: { currency, id },
        verb: verb === "borrowed" ? "borrowed" : "lent",
    });
    return "problem" in moved ? moved : { rows: [...opened, ...moved.rows] };
}

function VerbTabs({ onVerb, verb }: { onVerb: (verb: NewVerb) => void; verb: NewVerb }) {
    const { newForm } = useIntlayer("dashboard-debts");
    return (
        <Tabs onValueChange={(next: NewVerb) => onVerb(next)} value={verb} variant="segmented">
            <Tabs.List className="w-full *:flex-auto *:px-1">
                {VERBS.map((each) => (
                    <Tabs.Trigger key={each} value={each}>
                        {newForm.verbs[each]}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

/** A currency for someone new with nowhere to read one from, and its USD value when no rate covers it. */
function CurrencyRow({
    accounts,
    askCurrency,
    currency,
    move,
    onCurrency,
    usdInvalid,
}: {
    accounts: readonly AccountRow[];
    askCurrency: boolean;
    currency: string;
    move: Move;
    onCurrency: (currency: string) => void;
    usdInvalid: boolean;
}) {
    const { form } = useIntlayer("dashboard-debts");
    if (!askCurrency && !move.needsUsd) {
        return null;
    }
    return (
        <div className="grid grid-cols-2 items-start gap-3">
            {askCurrency ? (
                <CurrencyField
                    inUse={[...new Set(accounts.map((row) => row.currency))]}
                    label={form.currency}
                    onPick={onCurrency}
                    value={currency}
                />
            ) : null}
            {move.needsUsd ? (
                <CrossField
                    currency={USD}
                    invalid={usdInvalid}
                    onText={(usdText) => move.set({ usdText })}
                    text={move.state.usdText}
                />
            ) : null}
        </div>
    );
}

/** Shown before an amount is typed too, with the label read from which way the verb moves the balance. */
function PlanSection({
    after,
    currency,
    day,
    invalid,
    onDay,
    verb,
}: {
    after: number | null;
    currency: string;
    day: string | null;
    invalid: boolean;
    onDay: (day: string | null) => void;
    verb: NewVerb;
}) {
    const { form } = useIntlayer("dashboard-debts");
    if (after === 0) {
        return null;
    }
    const owing = (after ?? signedBy(verb, 1)) < 0;
    return (
        <>
            <PlanDayField
                day={day}
                invalid={invalid}
                label={owing ? form.payBackBy.value : form.getBackBy.value}
                onDay={onDay}
            />
            {day === null || invalid || after === null ? null : (
                <PlanHint balance={after} currency={currency} day={day} />
            )}
        </>
    );
}

function useNewDebtDraft(personId: string | null, startVerb: NewVerb) {
    const { ledger } = useDashboard();
    const accounts = useMoneyAccounts();
    const people = usePeopleChoices();
    const preset = people.people.find((row) => row.account.id === personId) ?? null;
    const [verb, setVerb] = useState<NewVerb>(startVerb);
    const [amountText, setAmountText] = useState("");
    const [name, setName] = useState(preset?.account.name ?? "");
    const [currencyPick, setCurrencyPick] = useState(ledger.currency);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [state, setMove] = useMoveState();
    const matched = matchPerson(people.choices, name);
    const person = people.people.find((row) => row.account.id === matched?.id) ?? null;
    const onCredit = isOnCredit(verb);
    const fallback = defaultAccount(accounts, person?.account.currency ?? ledger.currency);
    const picked = onCredit ? null : (accounts.find((row) => row.id === pickedId(state, fallback)) ?? null);
    const askCurrency = person === null && picked === null;
    const currency = person?.account.currency ?? picked?.currency ?? currencyPick;
    const amount = parseAmount(amountText, decimalsFor(currency));
    const moved = moveOf(ledger, {
        amount,
        fallback: onCredit ? null : fallback,
        personCurrency: currency,
        rows: onCredit ? [] : accounts,
        state,
    });
    const move: Move = { ...moved, set: setMove };
    const draft: NewDebtDraft = {
        amount,
        amountText,
        categoryId,
        currency,
        move,
        name: name.trim(),
        note,
        person,
        usd: move.usd,
        verb,
    };
    return {
        accounts,
        nameText: name,
        askCurrency,
        draft,
        people,
        preset,
        set: {
            amountText: setAmountText,
            categoryId: setCategoryId,
            currency: setCurrencyPick,
            name: setName,
            note: setNote,
            verb: setVerb,
        },
    };
}

function NewDebt({
    onClose,
    personId,
    verb: startVerb,
}: {
    onClose: () => void;
    personId: string | null;
    verb: NewVerb;
}) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { form, newForm } = useIntlayer("dashboard-debts");
    const write = useWrite();
    const settledText = useSettledToast();
    const formId = useId();
    const { accounts, askCurrency, draft, nameText, people, preset, set } = useNewDebtDraft(personId, startVerb);
    const { amount, currency, move, person, verb } = draft;
    const [planDay, setPlanDay] = useState<string | null>(null);
    const [tried, setTried] = useState(false);
    const [problem, setProblem] = useState<Problem>(null);
    const onCredit = isOnCredit(verb);
    const before = person?.account.balance ?? 0;
    const after = amount > 0 ? roundMoney(before + signedBy(verb, amount), decimalsFor(currency)) : before;
    const problems = {
        ...moveProblems(move),
        amount: !(amount > 0),
        category: onCredit && draft.categoryId === null,
        name: draft.name === "",
        plan: planDay !== null && planDay <= ledger.today,
    };
    const shown = tried ? problems : null;
    const submit = (at: number) => {
        setTried(true);
        setProblem(null);
        if (Object.values(problems).some(Boolean)) {
            return;
        }
        const current = { ...ledger, books: ledgerBooks(db) };
        const id = person?.account.id ?? crypto.randomUUID();
        const made = newDebtRows(current, draft, id, at);
        if ("problem" in made) {
            setProblem(made.problem);
            return;
        }
        const planned =
            planDay === null || onCredit || after === 0
                ? null
                : payoffPlanRows(
                      current.books,
                      { accountId: id, balance: after, currency, name: draft.name },
                      planFor(current, person),
                      targetInstant(ledger, planDay),
                      crypto.randomUUID(),
                      at
                  );
        const settles = person !== null && before !== 0 && after === 0;
        write(
            [...made.rows, ...(planned ?? [])],
            settles ? settledText(draft.name) : newForm.saved({ name: draft.name }).value,
            settles
        );
        onClose();
    };
    const categoryError = verb === "sold" ? newForm.soldNeedsCategory : newForm.boughtNeedsCategory;
    const dim = Object.values(shown ?? {}).some(Boolean) || draft.amountText.trim() === "";
    return (
        <FlowDialog label={newForm.title}>
            <Dialog.Body>
                <DebtForm formId={formId} onSubmit={submit}>
                    <VerbTabs
                        onVerb={(next) => {
                            set.verb(next);
                            setProblem(null);
                        }}
                        verb={verb}
                    />
                    <AmountField
                        autoFocus={preset !== null}
                        currency={currency}
                        invalid={shown?.amount ?? false}
                        onText={set.amountText}
                        text={draft.amountText}
                    />
                    <Field invalid={shown?.name ?? false}>
                        <Field.Label className={LABEL}>{form.name}</Field.Label>
                        <PersonField
                            invalid={shown?.name ?? false}
                            label={form.name.value}
                            onText={(text) => {
                                set.name(text);
                                move.set({ accountId: undefined, crossText: null });
                            }}
                            people={people.choices}
                            placeholder={form.namePlaceholder.value}
                            quick={people.quick}
                            text={nameText}
                        />
                        {shown?.name ? <Field.Error match>{form.nameRequired}</Field.Error> : null}
                    </Field>
                    {onCredit ? (
                        <CategoryField
                            error={shown?.category ? categoryError : null}
                            income={verb === "sold"}
                            onPick={set.categoryId}
                            value={draft.categoryId}
                        />
                    ) : (
                        <MoveFields
                            accountLabel={verb === "borrowed" ? form.into.value : form.from.value}
                            move={{ ...move, needsUsd: false }}
                            rows={accounts}
                            tried={tried}
                        />
                    )}
                    <CurrencyRow
                        accounts={accounts}
                        askCurrency={askCurrency}
                        currency={currency}
                        move={move}
                        onCurrency={set.currency}
                        usdInvalid={shown?.usd ?? false}
                    />
                    {onCredit ? null : (
                        <>
                            <NoteField onText={set.note} text={draft.note} />
                            <PlanSection
                                after={amount > 0 ? after : null}
                                currency={currency}
                                day={planDay}
                                invalid={shown?.plan ?? false}
                                onDay={setPlanDay}
                                verb={verb}
                            />
                        </>
                    )}
                    <ProblemLine problem={problem} />
                </DebtForm>
            </Dialog.Body>
            <Footer dim={dim} formId={formId} label={form.save} onClose={onClose} />
        </FlowDialog>
    );
}

function PlanHint({ balance, currency, day }: { balance: number; currency: string; day: string }) {
    const text = usePlanAsk()(balance, currency, day);
    return <p className="text-muted-foreground text-[13px] leading-5">{text}</p>;
}

function usePlanAsk() {
    const { ledger } = useDashboard();
    const { plan } = useIntlayer("dashboard-debts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    return (balance: number, currency: string, day: string): ReactNode => {
        const pace = planAsk(balance, ledger.today, day, currency);
        const amount = money(pace?.perMonth ?? Math.abs(balance), currency);
        return pace && pace.monthsLeft > 0
            ? plan.perMonth({ amount, date: date.day(day) })
            : plan.by({ amount, date: date.day(day) });
    };
}

type PayDay = "endOfMonth" | "friday" | "tomorrow";

function payDays(today: string): Record<PayDay, string> {
    const tomorrow = addDays(today, 1);
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    let friday = addDays(today, (FRIDAY - weekday + WEEK) % WEEK || WEEK);
    if (friday === tomorrow) {
        friday = addDays(friday, WEEK);
    }
    let endOfMonth = addDays(addMonths(`${today.slice(0, 8)}01`, 1), -1);
    if (endOfMonth === today) {
        endOfMonth = addDays(addMonths(`${today.slice(0, 8)}01`, 2), -1);
    }
    return { endOfMonth, friday, tomorrow };
}

function useWeekdayDay() {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC", weekday: "long" });
        return (day: string) => {
            const parts = format.formatToParts(new Date(`${day}T12:00:00Z`));
            const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((each) => each.type === type)?.value ?? "";
            const weekday = part("weekday");
            return `${weekday.charAt(0).toLocaleUpperCase(locale)}${weekday.slice(1)} ${part("day")}`;
        };
    }, [locale]);
}

function SomethingIOwe({ onClose }: { onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { form, kinds, owe } = useIntlayer("dashboard-debts");
    const write = useWrite();
    const { money } = useDisplayFormat();
    const weekdayDay = useWeekdayDay();
    const formId = useId();
    const { choices, people, quick } = usePeopleChoices();
    const [amountText, setAmountText] = useState("");
    const [name, setName] = useState("");
    const [note, setNote] = useState("");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [payDay, setPayDay] = useState<PayDay | null>(null);
    const [moveState, setMove] = useMoveState();
    const [tried, setTried] = useState(false);
    const [problem, setProblem] = useState<Problem>(null);
    const matched = matchPerson(choices, name);
    const person = people.find((row) => row.account.id === matched?.id) ?? null;
    const currency = person?.account.currency ?? ledger.currency;
    const amount = parseAmount(amountText, decimalsFor(currency));
    const days = payDays(ledger.today);
    const move: Move = {
        ...moveOf(ledger, { amount, fallback: null, personCurrency: currency, rows: [], state: moveState }),
        set: setMove,
    };
    const problems = {
        amount: !(amount > 0),
        category: categoryId === null,
        name: name.trim() === "",
        usd: moveProblems(move).usd,
    };
    const shown = tried ? problems : null;
    const submit = (at: number) => {
        setTried(true);
        setProblem(null);
        if (Object.values(problems).some(Boolean)) {
            return;
        }
        const current = { ...ledger, books: ledgerBooks(db) };
        const id = person?.account.id ?? crypto.randomUUID();
        const trimmed = name.trim();
        const made = newDebtRows(
            current,
            {
                amount,
                amountText,
                categoryId,
                currency,
                move,
                name: trimmed,
                note: note.trim() === "" ? kinds.boughtOnCredit.value : note,
                person,
                usd: move.usd,
                verb: "bought",
            },
            id,
            at
        );
        if ("problem" in made) {
            setProblem(made.problem);
            return;
        }
        const after = roundMoney((person?.account.balance ?? 0) - amount, decimalsFor(currency));
        const planned =
            payDay === null || after >= 0
                ? []
                : (payoffPlanRows(
                      current.books,
                      { accountId: id, balance: after, currency, name: trimmed },
                      planFor(current, person),
                      targetInstant(ledger, days[payDay]),
                      crypto.randomUUID(),
                      at
                  ) ?? []);
        write([...made.rows, ...planned], owe.saved({ amount: money(amount, currency), name: trimmed }).value);
        onClose();
    };
    const dim = (shown !== null && Object.values(shown).some(Boolean)) || amountText.trim() === "";
    const payChoices: readonly { label: ReactNode; value: PayDay | null }[] = [
        { label: owe.tomorrow, value: "tomorrow" },
        { label: weekdayDay(days.friday), value: "friday" },
        { label: owe.endOfMonth, value: "endOfMonth" },
        { label: owe.noDate, value: null },
    ];
    return (
        <FlowDialog label={owe.title}>
            <Dialog.Body>
                <DebtForm formId={formId} onSubmit={submit}>
                    <AmountField
                        currency={currency}
                        invalid={shown?.amount ?? false}
                        onText={setAmountText}
                        text={amountText}
                    />
                    <Field invalid={shown?.name ?? false}>
                        <Field.Label className={LABEL}>{owe.who}</Field.Label>
                        <PersonField
                            invalid={shown?.name ?? false}
                            label={owe.who.value}
                            onText={setName}
                            people={choices}
                            placeholder={owe.whoPlaceholder.value}
                            quick={quick}
                            text={name}
                        />
                        {shown?.name ? <Field.Error match>{owe.whoRequired}</Field.Error> : null}
                    </Field>
                    <div className="grid grid-cols-2 items-start gap-3">
                        <NoteField
                            label={owe.whatFor.value}
                            onText={setNote}
                            placeholder={owe.whatForPlaceholder.value}
                            text={note}
                        />
                        <CategoryField
                            error={shown?.category ? owe.categoryRequired : null}
                            income={false}
                            onPick={setCategoryId}
                            placeholder={owe.choose.value}
                            value={categoryId}
                        />
                    </div>
                    {move.needsUsd ? (
                        <CrossField
                            currency={USD}
                            invalid={shown?.usd ?? false}
                            onText={(usdText) => move.set({ usdText })}
                            text={moveState.usdText}
                        />
                    ) : null}
                    <Field>
                        <Field.Label className={LABEL}>{owe.illPay}</Field.Label>
                        <Chips>
                            {payChoices.map(({ label, value }) => (
                                <Pick
                                    key={value ?? "none"}
                                    onPress={() => setPayDay(value)}
                                    pressed={payDay === value}
                                    size="md"
                                >
                                    {label}
                                </Pick>
                            ))}
                        </Chips>
                    </Field>
                    <ProblemLine problem={problem} />
                </DebtForm>
            </Dialog.Body>
            <Footer dim={dim} formId={formId} label={form.save} onClose={onClose} />
        </FlowDialog>
    );
}

function PayBack({ onClose, row }: { onClose: () => void; row: DebtRow }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { form, pay } = useIntlayer("dashboard-debts");
    const write = useWrite();
    const settledText = useSettledToast();
    const { money } = useDisplayFormat();
    const formId = useId();
    const accounts = useMoneyAccounts();
    const { account: person, amount: balance } = row;
    const { currency } = person;
    const youOwe = row.standing === "youOwe";
    const verb: DebtVerb = youOwe ? "paidBack" : "gotPaidBack";
    const [amountText, setAmountText] = useState("");
    const [note, setNote] = useState("");
    const [tried, setTried] = useState(false);
    const [problem, setProblem] = useState<Problem>(null);
    const amount = parseAmount(amountText, decimalsFor(currency));
    const move = useMove(accounts, currency, amount);
    const decimals = decimalsFor(currency);
    const after = roundMoney(balance - amount, decimals);
    const line = liveLine(row);
    const perMonth = line?.pace?.perMonth ?? null;
    const chips = [
        perMonth !== null && perMonth < balance ? { amount: perMonth, id: "plan", label: pay.plan } : null,
        perMonth !== null && line?.behind
            ? {
                  amount: Math.min(balance, roundMoney(perMonth + line.behind, decimals)),
                  id: "behind",
                  label: pay.withBehind,
              }
            : null,
        { amount: balance, id: "all", label: pay.all },
    ].filter((chip) => chip !== null);
    const problems = {
        amount: !(amount > 0),
        ...moveProblems(move),
    };
    const shown = tried ? problems : null;
    const submit = (at: number) => {
        setTried(true);
        setProblem(null);
        if (Object.values(problems).some(Boolean)) {
            return;
        }
        const moved = movedRows(
            { ...ledger, books: ledgerBooks(db) },
            { amount, at, move, note, person: { currency, id: person.id }, verb }
        );
        if ("problem" in moved) {
            setProblem(moved.problem);
            return;
        }
        const settles = after === 0;
        write(
            moved.rows,
            settles
                ? settledText(person.name)
                : pay.saved({ amount: money(amount, currency), name: person.name }).value,
            settles
        );
        onClose();
    };
    const dim = (shown !== null && Object.values(shown).some(Boolean)) || amountText.trim() === "";
    let label: ReactNode = youOwe ? pay.submitEmpty : pay.recordEmpty;
    if (amount > 0) {
        label = (youOwe ? pay.submit : pay.record)({ amount: money(amount, currency) });
    }
    return (
        <FlowDialog label={(youOwe ? pay.payTitle : pay.gotTitle)({ name: person.name })}>
            <Dialog.Body>
                <DebtForm formId={formId} onSubmit={submit}>
                    <AmountField
                        currency={currency}
                        invalid={shown?.amount ?? false}
                        onText={setAmountText}
                        text={amountText}
                    >
                        <Chips>
                            {chips.map((chip) => (
                                <Pick
                                    key={chip.id}
                                    onPress={() => setAmountText(plainAmount(chip.amount, currency))}
                                    pressed={amount === chip.amount}
                                >
                                    {chip.label({ amount: money(chip.amount, currency) })}
                                </Pick>
                            ))}
                        </Chips>
                    </AmountField>
                    <MoveFields
                        accountLabel={youOwe ? form.from.value : form.into.value}
                        move={move}
                        rows={accounts}
                        tried={tried}
                    />
                    <NoteField onText={setNote} text={note} />
                    <div className="rounded-lg border px-3">
                        <Fact label={youOwe ? pay.youOweNow : pay.owesYouNow}>{money(balance, currency)}</Fact>
                        <Fact label={pay.afterThis}>{money(Math.abs(after), currency)}</Fact>
                    </div>
                    <ProblemLine problem={problem} />
                </DebtForm>
            </Dialog.Body>
            <Footer dim={dim} formId={formId} label={label} onClose={onClose} />
        </FlowDialog>
    );
}

function Settle({ onClose, onSwitch, row }: { onClose: () => void; onSwitch: (flow: DebtFlow) => void; row: DebtRow }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { form, settle } = useIntlayer("dashboard-debts");
    const write = useWrite();
    const settledText = useSettledToast();
    const { money } = useDisplayFormat();
    const formId = useId();
    const accounts = useMoneyAccounts();
    const { account: person, amount } = row;
    const { currency } = person;
    const youOwe = row.standing === "youOwe";
    const move = useMove(accounts, currency, amount);
    const [tried, setTried] = useState(false);
    const [problem, setProblem] = useState<Problem>(null);
    const problems = moveProblems(move);
    const submit = (at: number) => {
        setTried(true);
        setProblem(null);
        if (Object.values(problems).some(Boolean)) {
            return;
        }
        const moved = movedRows(
            { ...ledger, books: ledgerBooks(db) },
            {
                amount,
                at,
                move,
                note: "",
                person: { currency, id: person.id },
                verb: youOwe ? "paidBack" : "gotPaidBack",
            }
        );
        if ("problem" in moved) {
            setProblem(moved.problem);
            return;
        }
        write(moved.rows, settledText(person.name), true);
        onClose();
    };
    const figure = money(amount, currency);
    return (
        <FlowDialog label={settle.title({ name: person.name })}>
            <Dialog.Body>
                <DebtForm formId={formId} onSubmit={submit}>
                    <Dialog.Description className="text-foreground text-wrap">
                        {(youOwe ? settle.bodyYouOwe : settle.bodyOwesYou)({ amount: figure, name: person.name })}
                    </Dialog.Description>
                    <MoveFields
                        accountLabel={youOwe ? form.from.value : form.into.value}
                        move={move}
                        rows={accounts}
                        tried={tried}
                    />
                    <ProblemLine problem={problem} />
                </DebtForm>
            </Dialog.Body>
            <Footer
                dim={tried && Object.values(problems).some(Boolean)}
                formId={formId}
                label={settle.submit({ amount: figure })}
                onClose={onClose}
            >
                <Button
                    className={`me-auto ${FOOTER_PILL}`}
                    onClick={() => onSwitch({ accountId: person.id, kind: "pay" })}
                    variant="ghost"
                >
                    {settle.another}
                </Button>
            </Footer>
        </FlowDialog>
    );
}

function PlanDialog({ onClose, row }: { onClose: () => void; row: DebtRow }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const { actions, cancel, form, kpi, plan } = useIntlayer("dashboard-debts");
    const write = useWrite();
    const removePlan = useRemovePlan();
    const ask = usePlanAsk();
    const { money } = useDisplayFormat();
    const formId = useId();
    const { account } = row;
    const live = liveLine(row);
    const [day, setDay] = useState(live?.targetDay ?? addMonths(ledger.today, DEFAULT_PLAN_MONTHS));
    const [tried, setTried] = useState(false);
    const [problem, setProblem] = useState<"noRate" | null>(null);
    const late = day <= ledger.today;
    const invalid = tried && late;
    let label: string = form.payBackBy.value;
    if (row.card) {
        label = plan.payOffBy.value;
    } else if (row.standing === "owesYou") {
        label = form.getBackBy.value;
    }
    const submit = (at: number) => {
        setTried(true);
        if (late) {
            return;
        }
        const current = { ...ledger, books: ledgerBooks(db) };
        const rows = payoffPlanRows(
            current.books,
            { accountId: account.id, balance: account.balance, currency: account.currency, name: account.name },
            planFor(current, row),
            targetInstant(ledger, day),
            crypto.randomUUID(),
            at
        );
        if (rows === null) {
            setProblem("noRate");
            return;
        }
        write(rows, plan.saved.value);
        onClose();
    };
    return (
        <FlowDialog label={live ? plan.title : plan.setTitle}>
            <Dialog.Body>
                <DebtForm formId={formId} onSubmit={submit}>
                    <Field invalid={invalid}>
                        <Field.Label className={LABEL}>{label}</Field.Label>
                        <DayField
                            day={day}
                            invalid={invalid}
                            label={label}
                            min={addDays(ledger.today, 1)}
                            onDay={setDay}
                        />
                        {invalid ? <Field.Error match>{plan.dateRequired}</Field.Error> : null}
                        <Chips>
                            {PLAN_MONTHS.map((months) => {
                                const target = addMonths(ledger.today, months);
                                return (
                                    <Pick
                                        key={months}
                                        onPress={() => setDay(target)}
                                        pressed={day === target}
                                        size="md"
                                    >
                                        {months === YEAR_MONTHS ? plan.year : plan.months({ count: months })}
                                    </Pick>
                                );
                            })}
                        </Chips>
                    </Field>
                    <div className="rounded-lg border px-3">
                        <Fact label={row.standing === "owesYou" ? kpi.owesYou : kpi.youOwe}>
                            {money(row.amount, account.currency)}
                        </Fact>
                        <Fact label={plan.plan}>{late ? "–" : ask(account.balance, account.currency, day)}</Fact>
                    </div>
                    {problem ? (
                        <p className="text-destructive text-xs" role="alert">
                            {plan.noRate}
                        </p>
                    ) : null}
                </DebtForm>
            </Dialog.Body>
            <Dialog.Footer>
                {live ? (
                    <Button
                        className={`me-auto ${FOOTER_PILL}`}
                        onClick={() => {
                            removePlan(account.id);
                            onClose();
                        }}
                        variant="secondary"
                    >
                        {actions.removePlan}
                    </Button>
                ) : null}
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button className={invalid ? `opacity-50 ${FOOTER_PILL}` : FOOTER_PILL} form={formId} type="submit">
                    {plan.save}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

function Rename({ onClose, row }: { onClose: () => void; row: DebtRow }) {
    const db = useLedgerDb();
    const { form, rename } = useIntlayer("dashboard-debts");
    const write = useWrite();
    const formId = useId();
    const [name, setName] = useState(row.account.name);
    const [tried, setTried] = useState(false);
    const empty = name.trim() === "";
    const submit = (at: number) => {
        setTried(true);
        const account = ledgerBooks(db).accounts.find((each) => each.localId === row.account.id);
        if (empty || !account) {
            return;
        }
        if (name.trim() !== account.name) {
            write([renamedPerson(account, name, at)], rename.saved.value);
        }
        onClose();
    };
    return (
        <FlowDialog label={rename.title({ name: row.account.name })}>
            <Dialog.Body>
                <DebtForm formId={formId} onSubmit={submit}>
                    <Field invalid={tried && empty}>
                        <Field.Label className={LABEL}>{form.name}</Field.Label>
                        <Input
                            aria-invalid={(tried && empty) || undefined}
                            autoFocus
                            onChange={(event) => setName(event.target.value)}
                            value={name}
                        />
                        {tried && empty ? <Field.Error match>{rename.required}</Field.Error> : null}
                    </Field>
                </DebtForm>
            </Dialog.Body>
            <Footer dim={tried && empty} formId={formId} label={form.save} onClose={onClose} />
        </FlowDialog>
    );
}

function DeleteDebt({ onClose, row }: { onClose: () => void; row: DebtRow }) {
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { cancel, delete: copy } = useIntlayer("dashboard-debts");
    const { toast } = useAccountFlows();
    const { money } = useDisplayFormat();
    const navigate = useNavigate();
    const onDetail = useLocation({ select: (location) => location.pathname !== "/app/debts" });
    const count = row.facts.movements.length;
    const amount = money(row.amount, row.account.currency);
    const remove = async () => {
        const books = ledgerBooks(db);
        const account = books.accounts.find((each) => each.localId === row.account.id);
        if (!account) {
            onClose();
            return;
        }
        const held = committer.commit(deletedAccount(books, account, Date.now()), { holdMs: UNDO_HOLD_MS });
        void held.settled.then((outcome) => {
            if (outcome.status === "failed") {
                toast({ failed: true, text: copy.failed.value });
            }
        });
        onClose();
        if (onDetail) {
            await navigate({ to: "/app/debts" });
        }
        toast({
            onExpire: () => {
                void held.flush();
            },
            onUndo: () => {
                held.undo();
            },
            text: copy.toast({ name: row.account.name }).value,
        });
    };
    return (
        <FlowDialog label={copy.title({ name: row.account.name })}>
            <Dialog.Body>
                <Dialog.Description className="text-wrap">
                    {count === 1 ? copy.bodyOne({ amount }) : copy.body({ amount, count })}
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

export function DebtDialogs({
    flow,
    onClose,
    onSwitch,
}: {
    flow: DebtFlow;
    onClose: () => void;
    onSwitch: (flow: DebtFlow) => void;
}) {
    const { model } = useDebts();
    if (flow.kind === "new") {
        return (
            <NewDebt
                key={`${flow.personId}-${flow.verb}`}
                onClose={onClose}
                personId={flow.personId}
                verb={flow.verb}
            />
        );
    }
    if (flow.kind === "owe") {
        return <SomethingIOwe onClose={onClose} />;
    }
    const row = [...peopleOf(model), ...model.cards].find((each) => each.account.id === flow.accountId);
    if (!row) {
        return null;
    }
    switch (flow.kind) {
        case "delete": {
            return <DeleteDebt onClose={onClose} row={row} />;
        }
        case "pay": {
            return standingOf(row.account.balance, row.account.currency) === "settled" ? null : (
                <PayBack onClose={onClose} row={row} />
            );
        }
        case "plan": {
            return takesPayoffPlan(row.account) ? <PlanDialog onClose={onClose} row={row} /> : null;
        }
        case "rename": {
            return <Rename onClose={onClose} row={row} />;
        }
        default: {
            return <Settle onClose={onClose} onSwitch={onSwitch} row={row} />;
        }
    }
}
