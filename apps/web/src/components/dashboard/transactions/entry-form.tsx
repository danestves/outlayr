import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { decimalsFor } from "@outlayr/money/currency";
import type { EntryRateType } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { Tabs } from "panelui-web/tabs";
import { Textarea } from "panelui-web/textarea";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useIntlayer } from "react-intlayer";

import { AmountInput, CurrencyField, FlowDialog, QUIET_ROW } from "@/components/dashboard/accounts/fields";
import { useAccountFlows, useLedgerDb } from "@/components/dashboard/accounts/flows";
import type { AccountFlow } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { parseAmount } from "@/lib/account-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import {
    baseOf,
    blankValues,
    createdEntry,
    draftOf,
    editedEntry,
    entryProblem,
    logAgainValues,
    parseFee,
    wallText,
} from "@/lib/entry-writes";
import type { Doc, EntryBase, EntryProblem, EntryValues } from "@/lib/entry-writes";
import { money } from "@/lib/ledger";
import { ledgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName } from "../home/format";
import { useWeekday } from "./use-day-title";

const REPEATS = [
    RECURRING_TYPE.none,
    RECURRING_TYPE.daily,
    RECURRING_TYPE.weekly,
    RECURRING_TYPE.monthly,
    RECURRING_TYPE.yearly,
] as const;

const POPUP = "app-shell z-[60]";
const NO_ACCOUNT = "none";
export const QUIET_INPUT = "border-transparent! bg-transparent! text-right shadow-none! focus-visible:border-ring!";

function Dot({ color }: { color: string | null | undefined }) {
    return <i className="size-2 flex-none rounded-full" style={{ backgroundColor: color ?? undefined }} />;
}

export function Slot({
    children,
    error,
    label,
    quiet,
    wide = false,
}: {
    children: ReactNode;
    error?: ReactNode;
    label: ReactNode;
    quiet: boolean;
    wide?: boolean;
}) {
    const wideClass = wide ? "col-span-full" : undefined;
    return (
        <Field className={quiet ? QUIET_ROW : wideClass} invalid={Boolean(error)}>
            <Field.Label className={quiet ? "text-muted-foreground font-normal" : undefined}>{label}</Field.Label>
            {children}
            {error ? (
                <Field.Error className={quiet ? "col-span-full text-right" : undefined} match>
                    {error}
                </Field.Error>
            ) : null}
        </Field>
    );
}

interface PickOption {
    icon?: ReactNode;
    label: string;
    value: string;
}

export function Pick({
    bare = false,
    onPick,
    options,
    placeholder,
    quiet,
    triggerRef,
    value,
}: {
    bare?: boolean;
    onPick: (value: string) => void;
    options: readonly PickOption[];
    placeholder?: string;
    quiet: boolean;
    triggerRef?: RefObject<HTMLButtonElement | null>;
    value: string | null;
}) {
    return (
        <Select
            items={options.map((option) => ({ label: option.label, value: option.value }))}
            onValueChange={(next) => next !== null && onPick(next)}
            value={value}
        >
            <Select.Trigger
                className={quiet ? "-me-2 ml-auto w-auto" : undefined}
                icon={bare ? null : undefined}
                ref={triggerRef}
                variant={quiet ? "ghost" : "default"}
            >
                {options.find((option) => option.value === value)?.icon}
                <Select.Value placeholder={placeholder} />
            </Select.Trigger>
            <Select.Content className={POPUP}>
                {options.map((option) => (
                    <Select.Item icon={option.icon} key={option.value} value={option.value}>
                        {option.label}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select>
    );
}

/** No PanelUI part picks a date and time, so the browser's picker opens under this text. */
export function DateRow({ onChange, quiet, text }: { onChange: (text: string) => void; quiet: boolean; text: string }) {
    const { form } = useIntlayer("dashboard-transactions");
    const weekday = useWeekday();
    const { clockTime } = useDisplayFormat();
    const input = useRef<HTMLInputElement>(null);
    const [day, time] = text.split("T");
    return (
        <div className={`relative flex items-center ${quiet ? "-me-2 ml-auto w-fit" : "w-full"}`}>
            <Button
                aria-label={form.pickDate.value}
                className={quiet ? "dash-figure" : "dash-figure w-full justify-between font-normal"}
                onClick={() => input.current?.showPicker()}
                size={quiet ? "sm" : "md"}
                type="button"
                variant={quiet ? "ghost" : "outline"}
            >
                {day && time ? `${weekday(day)}, ${clockTime(time)}` : form.pickDate}
                <HugeiconsIcon icon={Calendar03Icon} className="text-muted-foreground" size={15} />
            </Button>
            {/* iOS keeps its own wider width on a date input until its appearance is off. */}
            <input
                aria-label={form.date.value}
                className="pointer-events-none absolute inset-0 appearance-none opacity-0 pointer-coarse:pointer-events-auto"
                onChange={(event) => onChange(event.target.value)}
                ref={input}
                tabIndex={-1}
                type="datetime-local"
                value={text}
            />
        </div>
    );
}

/** What a repeat setting reads as. */
export function useRepeatNames() {
    const { form } = useIntlayer("dashboard-transactions");
    return {
        [RECURRING_TYPE.daily]: form.repeatDaily.value,
        [RECURRING_TYPE.monthly]: form.repeatMonthly.value,
        [RECURRING_TYPE.none]: form.repeatNone.value,
        [RECURRING_TYPE.weekly]: form.repeatWeekly.value,
        [RECURRING_TYPE.yearly]: form.repeatYearly.value,
    };
}

/** Parents, each with its children under it. */
export function useCategoryOptions(ledger: Ledger, income: boolean): PickOption[] {
    const categoryName = useCategoryName();
    const live = ledger.books.categories
        .filter((row) => row.deletedAt === null && row.income === income)
        .toSorted((left, right) => left.sortOrder - right.sortOrder);
    const option = (row: (typeof live)[number]): PickOption => ({
        icon: <Dot color={row.color} />,
        label: categoryName({ id: row.localId, name: row.name ?? "" }),
        value: row.localId,
    });
    return live
        .filter((row) => row.parentId === null)
        .flatMap((parent) => [
            option(parent),
            ...live.filter((row) => row.parentId === parent.localId).map((row) => option(row)),
        ]);
}

/**
 * The fields the Add dialog and the edit drawer share. `onChange` carries a typed change and `onPick` a choice,
 * which a drawer saves at once while it waits for the blur on text.
 */
function feeOfRate({ amountText, currency }: EntryValues, rate: number) {
    const decimals = decimalsFor(currency);
    return roundMoney(parseAmount(amountText, decimals) * rate, decimals);
}

function AmountField({
    amountKey,
    onChange,
    problem,
    quiet,
    values,
}: {
    amountKey?: number;
    onChange: (patch: Partial<EntryValues>) => void;
    problem: EntryProblem | null;
    quiet: boolean;
    values: EntryValues;
}) {
    const { form } = useIntlayer("dashboard-transactions");
    const sign = values.income ? "+" : "-";
    return (
        <Field className="min-w-0 flex-1" invalid={problem === "amount"}>
            <Field.Label className={quiet ? "sr-only" : undefined}>{form.amount}</Field.Label>
            <div className="[&_[data-slot=input-addon]]:text-2xl! [&_[data-slot=input-addon]]:font-semibold! [&_input]:ps-0! [&_input]:text-2xl! [&_input]:font-semibold!">
                <AmountInput
                    autoFocus={!quiet}
                    currency={values.currency}
                    key={amountKey}
                    onText={(amountText) => onChange({ amountText })}
                    sign={quiet ? sign : undefined}
                    size="lg"
                    text={values.amountText}
                />
            </div>
            {problem === "amount" ? <Field.Error match>{form.amountRequired}</Field.Error> : null}
        </Field>
    );
}

export function NoteSlot({
    onChange,
    quiet,
    text,
}: {
    onChange: (text: string) => void;
    quiet: boolean;
    text: string;
}) {
    const { form } = useIntlayer("dashboard-transactions");
    return (
        <Slot label={form.note} quiet={quiet} wide>
            <Textarea
                className={quiet ? "text-muted-foreground focus:text-foreground min-h-0! py-0! text-right" : undefined}
                minRows={quiet ? 1 : 2}
                onChange={(event) => onChange(event.target.value)}
                placeholder={quiet ? form.noteAdd.value : undefined}
                value={text}
                variant={quiet ? "ghost" : "default"}
            />
        </Slot>
    );
}

function EntryFields({
    accountTrigger,
    amountKey,
    categoryTrigger,
    imageUrl,
    layout,
    onChange,
    onCreateAccount,
    onPick,
    problem,
    values,
}: {
    accountTrigger?: RefObject<HTMLButtonElement | null>;
    amountKey?: number;
    categoryTrigger?: RefObject<HTMLButtonElement | null>;
    imageUrl?: string;
    layout: "dialog" | "drawer";
    onChange: (patch: Partial<EntryValues>) => void;
    onCreateAccount?: () => void;
    onPick: (patch: Partial<EntryValues>) => void;
    problem: EntryProblem | null;
    values: EntryValues;
}) {
    const { ledger, overview, photos } = useDashboard();
    const { form, kind } = useIntlayer("dashboard-transactions");
    const quiet = layout === "drawer";
    const accounts = openAccounts(ledger.books);
    const inUse = useMemo(
        () => [...new Set([ledger.currency, ...overview.balances.accounts.map((row) => row.currency)])],
        [ledger.currency, overview.balances.accounts]
    );
    const categoryOptions = useCategoryOptions(ledger, values.income);
    const category = ledger.books.categories.find((row) => row.localId === values.categoryId);
    const account = ledger.books.accounts.find((row) => row.localId === values.accountId);
    const flip = (income: boolean) =>
        onPick({ categoryId: category?.income === income ? values.categoryId : null, income });
    const pickAccount = (id: string) => {
        const accountId = id === NO_ACCOUNT ? null : id;
        const picked = accounts.find((row) => row.localId === accountId);
        onPick(
            !values.currencyByHand && picked
                ? { accountId, currency: picked.currency, rateType: "official" }
                : { accountId }
        );
    };
    const repeatNames = useRepeatNames();
    const rateNames: Record<EntryRateType, string> = {
        custom: form.rateCustom.value,
        eur_reference: "EUR (BCV)",
        official: values.currency === "VES" ? "USD (BCV)" : form.rateOfficial.value,
    };
    const rateTypes: EntryRateType[] =
        values.currency === "VES" ? ["official", "eur_reference", "custom"] : ["official", "custom"];
    const kinds = (
        <Tabs onValueChange={(next) => flip(next === "income")} value={values.income ? "income" : "expense"}>
            <Tabs.List className={quiet ? undefined : "w-full [&>*]:flex-1"}>
                <Tabs.Trigger value="expense">{kind.expense}</Tabs.Trigger>
                <Tabs.Trigger value="income">{kind.income}</Tabs.Trigger>
            </Tabs.List>
        </Tabs>
    );
    const amount = (
        <AmountField amountKey={amountKey} onChange={onChange} problem={problem} quiet={quiet} values={values} />
    );
    const feeRate = parseFee(values.feeText, values.currency)?.rate;
    const feeShown = feeRate == null ? null : money(feeOfRate(values, feeRate), values.currency);
    const name = <Input onChange={(event) => onChange({ note: event.target.value })} value={values.note} />;
    return (
        <>
            {quiet ? (
                <div className="flex flex-col gap-3 pb-3">
                    <Field className="flex-row! items-center gap-3">
                        <MerchantTile imageUrl={imageUrl} name={values.note || (category?.name ?? "")} size="xl" />
                        <Field.Label className="sr-only">{form.name}</Field.Label>
                        <div className="min-w-0 flex-1">{name}</div>
                    </Field>
                    <div className="flex items-start gap-3">
                        {amount}
                        <div className="flex-none pt-1">{kinds}</div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4 pb-4">
                    {kinds}
                    {amount}
                </div>
            )}
            <div className={quiet ? undefined : "grid grid-cols-1 gap-x-3 gap-y-4 min-[481px]:grid-cols-2"}>
                {quiet ? null : (
                    <Slot label={form.name} quiet={quiet}>
                        {name}
                    </Slot>
                )}
                <Slot error={problem === "category" ? form.categoryRequired : null} label={form.category} quiet={quiet}>
                    <Pick
                        onPick={(categoryId) => onPick({ categoryId })}
                        options={categoryOptions}
                        placeholder={form.none.value}
                        quiet={quiet}
                        triggerRef={categoryTrigger}
                        value={values.categoryId}
                    />
                </Slot>
                <Slot label={form.account} quiet={quiet}>
                    <Pick
                        onPick={pickAccount}
                        options={[
                            { label: form.none.value, value: NO_ACCOUNT },
                            ...[...accounts, ...(account && !accounts.includes(account) ? [account] : [])].map(
                                (row) => ({
                                    icon: <AccountTile account={accountLook(row)} photos={photos} size="sm" />,
                                    label: row.name,
                                    value: row.localId,
                                })
                            ),
                        ]}
                        quiet={quiet}
                        triggerRef={accountTrigger}
                        value={values.accountId ?? NO_ACCOUNT}
                    />
                </Slot>
                {accounts.length === 0 && onCreateAccount ? (
                    <p className="text-muted-foreground col-span-full text-[13px]">
                        {form.noAccountLine}{" "}
                        <Button onClick={onCreateAccount} size="sm" type="button" variant="link">
                            {form.createAccount}
                        </Button>
                    </p>
                ) : null}
                <Slot error={problem === "date" ? form.dateRequired : null} label={form.date} quiet={quiet}>
                    <DateRow
                        onChange={(dateText) => (quiet ? onPick({ dateText }) : onChange({ dateText }))}
                        quiet={quiet}
                        text={values.dateText}
                    />
                </Slot>
                <CurrencyField
                    inUse={inUse}
                    label={form.currency}
                    onPick={(currency) => {
                        if (currency !== values.currency) {
                            onPick({
                                amountText:
                                    values.amountText.trim() === ""
                                        ? ""
                                        : money(parseAmount(values.amountText, decimalsFor(values.currency)), currency),
                                currency,
                                currencyByHand: true,
                                rateType: "official",
                            });
                        }
                    }}
                    quiet={quiet}
                    value={values.currency}
                />
                {values.income || values.accountId === null ? null : (
                    <Slot label={form.fee} quiet={quiet}>
                        <div className="flex min-w-0 items-center justify-end">
                            {quiet && feeShown ? <span className="dash-figure font-medium">+{feeShown}</span> : null}
                            <Input
                                className={`dash-figure ${quiet ? `${QUIET_INPUT} text-muted-foreground w-14 px-1.5!` : ""}`}
                                inputMode="decimal"
                                onChange={(event) => onChange({ feeText: event.target.value })}
                                placeholder={form.feePlaceholder.value}
                                value={values.feeText}
                            />
                            {quiet && values.feeText.trim() !== "" ? (
                                <Button
                                    aria-label={form.removeFee.value}
                                    className="text-muted-foreground"
                                    onClick={() => onPick({ feeText: "" })}
                                    size="icon-sm"
                                    type="button"
                                    variant="ghost"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={15} />
                                </Button>
                            ) : null}
                        </div>
                    </Slot>
                )}
                {values.currency === "USD" ? null : (
                    <Slot error={problem === "rateMissing" ? form.rateMissing : null} label={form.rate} quiet={quiet}>
                        <Pick
                            onPick={(next) => {
                                const rateType = rateTypes.find((type) => type === next);
                                if (rateType) {
                                    onPick({ rateType });
                                }
                            }}
                            options={rateTypes.map((type) => ({ label: rateNames[type], value: type }))}
                            quiet={quiet}
                            value={values.rateType}
                        />
                    </Slot>
                )}
                {values.currency !== "USD" && values.rateType === "custom" ? (
                    <Slot error={problem === "rate" ? form.rateRequired : null} label={form.ratePerUsd} quiet={quiet}>
                        <Input
                            className={`dash-figure ${quiet ? QUIET_INPUT : ""}`}
                            inputMode="decimal"
                            onChange={(event) => onChange({ rateText: event.target.value })}
                            value={values.rateText}
                        />
                    </Slot>
                ) : null}
                <Slot label={form.repeat} quiet={quiet}>
                    <Pick
                        onPick={(next) => {
                            const recurringType = REPEATS.find((type) => String(type) === next);
                            if (recurringType !== undefined) {
                                onPick({ recurringType });
                            }
                        }}
                        options={REPEATS.map((type) => ({ label: repeatNames[type], value: String(type) }))}
                        quiet={quiet}
                        value={String(values.recurringType)}
                    />
                </Slot>
                <NoteSlot onChange={(details) => onChange({ details })} quiet={quiet} text={values.details} />
            </div>
        </>
    );
}

export const merchantOf = (ledger: Ledger, values: EntryValues) =>
    values.note.trim() || (ledger.books.categories.find((row) => row.localId === values.categoryId)?.name ?? "");

/** Add entry. It closes at once: the row shows from the local copy, and a push that fails says so in a toast. */
export function EntryDialog({
    flow,
    onClose,
    onSwitch,
}: {
    flow: Extract<AccountFlow, { kind: "entry" }>;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { add } = useIntlayer("dashboard");
    const { flows } = useIntlayer("dashboard-accounts");
    const { form } = useIntlayer("dashboard-transactions");
    const { toast } = useAccountFlows();
    const [values, setValues] = useState(() => {
        const source = ledger.books.transactions.find((row) => row.localId === flow.from);
        return source
            ? logAgainValues(ledger, source, Date.now())
            : blankValues(ledger, flow.accountId ?? null, Date.now());
    });
    const [problem, setProblem] = useState<EntryProblem | null>(null);
    const [round, setRound] = useState(0);
    const formId = useId();
    const change = (patch: Partial<EntryValues>) => {
        setValues((current) => ({ ...current, ...patch }));
        setProblem(null);
    };
    const submit = (another: boolean) => {
        const at = Date.now();
        const current = { ...ledger, books: ledgerBooks(db) };
        const draft = draftOf(current, values, null, form.feeNote({ merchant: merchantOf(ledger, values) }).value);
        // The default minute keeps its seconds, so entries added back to back stay in the order they were typed.
        const dated = values.dateText === wallText(at, ledger) ? { ...draft, date: at } : draft;
        const found = entryProblem(current, dated, null, at);
        setProblem(found);
        if (found !== null) {
            return;
        }
        void committer.commit(createdEntry(current, crypto.randomUUID(), dated, at)).settled.then((outcome) => {
            if (outcome.status === "failed") {
                toast({ failed: true, text: form.saveFailed.value });
            }
        });
        toast({ text: form.added.value });
        if (another) {
            change({ amountText: "", details: "", feeText: "", note: "" });
            setRound((count) => count + 1);
        } else {
            onClose();
        }
    };
    return (
        <FlowDialog label={add.entry}>
            <Dialog.Body>
                <form
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit(false);
                    }}
                >
                    <EntryFields
                        amountKey={round}
                        layout="dialog"
                        onChange={change}
                        onCreateAccount={() => onSwitch({ kind: "create", type: "bank" })}
                        onPick={change}
                        problem={problem}
                        values={values}
                    />
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
                    {add.entry}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

/** The drawer's editor. There is no Save: a choice saves at once, typing on blur, and whatever is left on close. */
export function EntryEditor({
    accountTrigger,
    categoryTrigger,
    doc,
    imageUrl,
    onDelete,
    onLogAgain,
    total,
}: {
    accountTrigger?: RefObject<HTMLButtonElement | null>;
    categoryTrigger?: RefObject<HTMLButtonElement | null>;
    doc: Doc;
    imageUrl?: string;
    onDelete: () => void;
    onLogAgain: () => void;
    total: ReactNode;
}) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { bulk, form } = useIntlayer("dashboard-transactions");
    const { toast } = useAccountFlows();
    const [base] = useState<EntryBase>(() => baseOf(ledger, doc));
    const [values, setValues] = useState(base.start);
    const [problem, setProblem] = useState<EntryProblem | null>(null);
    const saved = useRef(JSON.stringify(draftOf(ledger, base.start, base, "")));
    const save = (next: EntryValues) => {
        const books = ledgerBooks(db);
        const live = books.transactions.find((row) => row.localId === doc.localId);
        if (!live || live.deletedAt !== null) {
            return;
        }
        const current = { ...ledger, books };
        const at = Date.now();
        const draft = draftOf(current, next, base, "");
        const key = JSON.stringify(draft);
        const found = entryProblem(current, draft, live, at);
        setProblem(found);
        if (found !== null || key === saved.current) {
            return;
        }
        saved.current = key;
        const feeNote = form.feeNote({ merchant: merchantOf(ledger, next) }).value;
        void committer.commit(editedEntry(current, live, { ...draft, feeNote }, at)).settled.then((outcome) => {
            if (outcome.status !== "failed") {
                return;
            }
            // Cleared, not restored: the save before this one may have failed too. A repeat send changes nothing.
            if (saved.current === key) {
                saved.current = "";
            }
            toast({ failed: true, text: form.saveFailed.value });
        });
    };
    const flush = useEffectEvent(() => save(values));
    // oxlint-disable-next-line outlayr/react-effect-budget -- Esc and J K unmount this with no blur to save on.
    useEffect(() => () => flush(), []);
    return (
        <div onBlur={() => save(values)}>
            <EntryFields
                accountTrigger={accountTrigger}
                categoryTrigger={categoryTrigger}
                imageUrl={imageUrl}
                layout="drawer"
                onChange={(patch) => {
                    setValues((current) => ({ ...current, ...patch }));
                    setProblem(null);
                }}
                onPick={(patch) => {
                    const next = { ...values, ...patch };
                    setValues(next);
                    save(next);
                }}
                problem={problem}
                values={values}
            />
            <div className="flex flex-wrap items-center gap-2 py-4">
                <Button onClick={onLogAgain} size="sm" variant="outline">
                    <HugeiconsIcon icon={Copy01Icon} size={14} />
                    {form.logAgain}
                </Button>
                <Button onClick={onDelete} size="sm" variant="outline">
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                    {bulk.delete}
                </Button>
                <span className="text-muted-foreground ml-auto text-[13px]">
                    {form.total} <span className="dash-figure text-foreground">{total}</span>
                </span>
            </div>
        </div>
    );
}
