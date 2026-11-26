import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { decimalsFor } from "@outlayr/money/currency";
import { accountLook } from "@outlayr/money/ledger-log";
import type { EntryRateType } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import { useOnUnmount } from "@outlayr/shared/lifecycle";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { Tabs } from "panelui-web/tabs";
import { Textarea } from "panelui-web/textarea";
import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useIntlayer } from "react-intlayer";

import { FlowDialog, QUIET_ROW } from "@/components/dashboard/accounts/fields";
import type { AccountFlow } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { MoneyField } from "@/components/ui/money-field";
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
import { useDisplayFormat } from "@/lib/ledger-settings";
import { newLink } from "@/lib/rule-writes";

import { useCategoryName } from "../home/format";
import { useIncomingRules } from "../rules/incoming";
import { DraftReceipt, FilesLabel, ScanCard } from "./receipt-card";
import { useWeekday } from "./use-day-title";

const REPEATS = [
    RECURRING_TYPE.none,
    RECURRING_TYPE.daily,
    RECURRING_TYPE.weekly,
    RECURRING_TYPE.monthly,
    RECURRING_TYPE.yearly,
] as const;

const POPUP = "app-shell z-60";
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

export interface PickOption {
    icon?: ReactNode;
    label: string;
    value: string;
}

export function Pick({
    bare = false,
    invalid = false,
    onPick,
    options,
    placeholder,
    quiet,
    triggerRef,
    value,
}: {
    bare?: boolean;
    invalid?: boolean;
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
                aria-invalid={invalid || undefined}
                className={quiet ? "-me-2 ml-auto w-auto" : "aria-invalid:border-destructive"}
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
                className={
                    quiet ? "font-mono tabular-nums" : "w-full justify-between font-mono font-normal tabular-nums"
                }
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

export const focusAmount = (node: HTMLDivElement | null) => {
    node?.querySelector("input")?.focus();
};

function DialogAmount({
    amountKey,
    codes,
    onChange,
    onPickCurrency,
    problem,
    values,
}: {
    amountKey?: number;
    codes: readonly string[];
    onChange: (patch: Partial<EntryValues>) => void;
    onPickCurrency: (currency: string) => void;
    problem: EntryProblem | null;
    values: EntryValues;
}) {
    const { form } = useIntlayer("dashboard-transactions");
    const typed = values.amountText.trim();
    return (
        <Field className="min-w-0" invalid={problem === "amount"}>
            <MoneyField
                className={problem === "amount" ? "border-destructive" : undefined}
                codes={codes}
                key={amountKey}
                label={form.amount}
                onValueChange={(next) =>
                    next.code === values.currency
                        ? onChange({ amountText: next.amount === null ? "" : String(next.amount) })
                        : onPickCurrency(next.code)
                }
                ref={focusAmount}
                value={{
                    amount: typed === "" ? null : parseAmount(typed, decimalsFor(values.currency)),
                    code: values.currency,
                }}
            />
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

function EntryTile({ imageUrl, name, onEdit }: { imageUrl?: string; name: string; onEdit?: () => void }) {
    const merchant = useIntlayer("dashboard-merchant");
    const tile = <MerchantTile imageUrl={imageUrl} name={name} size="xl" />;
    if (!onEdit) {
        return tile;
    }
    return (
        <button
            aria-label={merchant.edit.value}
            className="focus-visible:ring-ring/30 shrink-0 rounded-xl outline-none focus-visible:ring-3"
            onClick={onEdit}
            title={merchant.edit.value}
            type="button"
        >
            {tile}
        </button>
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
    onEditMerchant,
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
    onEditMerchant?: () => void;
    onPick: (patch: Partial<EntryValues>) => void;
    problem: EntryProblem | null;
    values: EntryValues;
}) {
    const { ledger, overview } = useDashboard();
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
    const pickCurrency = (currency: string) => {
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
    };
    const amount = (
        <DialogAmount
            amountKey={amountKey}
            codes={[...inUse, ...PICKABLE_CURRENCY_CODES.filter((code) => !inUse.includes(code))]}
            onChange={onChange}
            onPickCurrency={pickCurrency}
            problem={problem}
            values={values}
        />
    );
    const feeRate = parseFee(values.feeText, values.currency)?.rate;
    const feeShown = feeRate == null ? null : money(feeOfRate(values, feeRate), values.currency);
    const name = <Input onChange={(event) => onChange({ note: event.target.value })} value={values.note} />;
    return (
        <>
            {quiet ? (
                <div className="flex flex-col gap-3 pb-3">
                    <Field className="flex-row! items-center gap-3">
                        <EntryTile
                            imageUrl={imageUrl}
                            name={values.note || (category?.name ?? "")}
                            onEdit={onEditMerchant}
                        />
                        <Field.Label className="sr-only">{form.name}</Field.Label>
                        <div className="min-w-0 flex-1">{name}</div>
                    </Field>
                    {kinds}
                    {amount}
                </div>
            ) : (
                <div className="flex flex-col gap-4 pb-4">
                    {kinds}
                    {amount}
                </div>
            )}
            <div className={quiet ? undefined : "grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2"}>
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
                                    icon: <AccountTile account={accountLook(row)} size="sm" />,
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
                    <p className="border-border text-app-label text-muted-foreground rounded-app-md col-span-full flex items-center gap-3 border px-3 py-2.5">
                        <span className="min-w-0 flex-1">{form.noAccountLine}</span>
                        <Button
                            className="text-app-tint shrink-0"
                            onClick={onCreateAccount}
                            size="sm"
                            type="button"
                            variant="link"
                        >
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
                {values.income || values.accountId === null ? null : (
                    <Slot label={form.fee} quiet={quiet}>
                        <div className="flex min-w-0 items-center justify-end">
                            {quiet && feeShown ? (
                                <span className="font-mono font-medium tabular-nums">+{feeShown}</span>
                            ) : null}
                            <Input
                                className={`font-mono tabular-nums ${quiet ? `${QUIET_INPUT} text-muted-foreground w-14 px-1.5!` : ""}`}
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
                            className={`font-mono tabular-nums ${quiet ? QUIET_INPUT : ""}`}
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

const ruleInput = (values: EntryValues) => ({
    amount: parseAmount(values.amountText, decimalsFor(values.currency)),
    details: values.details,
    income: values.income,
    note: values.note,
});

/** Saves a new entry the way Add entry does, rules included, and answers with the problem that stopped it. */
export function useAddEntry() {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const rules = useIncomingRules();
    const { form } = useIntlayer("dashboard-transactions");
    return (values: EntryValues, receipt?: string): EntryProblem | null => {
        const at = Date.now();
        const current = committer.current();
        const ruled = rules(ruleInput(values));
        const filled =
            values.categoryId === null && ruled.categoryId !== null
                ? { ...values, categoryId: ruled.categoryId }
                : values;
        const draft = {
            ...draftOf(current, filled, null, form.feeNote({ merchant: merchantOf(ledger, filled) }).value),
            receipt,
        };
        // The default minute keeps its seconds, so entries added back to back stay in the order they were typed.
        const dated = values.dateText === wallText(at, ledger) ? { ...draft, date: at } : draft;
        const found = entryProblem(current, dated, null, at);
        if (found !== null) {
            return found;
        }
        const id = crypto.randomUUID();
        const links = ruled.tagIds.map((tagId) => newLink(id, tagId, at));
        void committer.commit([...createdEntry(current, id, dated, at), ...links], {
            failed: form.saveFailed.value,
            saved: form.added.value,
        });
        return null;
    };
}

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
    const { add } = useIntlayer("dashboard");
    const { flows } = useIntlayer("dashboard-accounts");
    const { form } = useIntlayer("dashboard-transactions");
    const [values, setValues] = useState(() => {
        if (flow.scanned) {
            return flow.scanned.values;
        }
        if (flow.seed) {
            return flow.seed;
        }
        const source = ledger.books.transactions.find((row) => row.localId === flow.from);
        return source
            ? logAgainValues(ledger, source, Date.now())
            : { ...blankValues(ledger, flow.accountId ?? null, Date.now()), note: flow.note ?? "" };
    });
    const [scan, setScan] = useState(flow.scanned ?? null);
    const [problem, setProblem] = useState<EntryProblem | null>(null);
    const [round, setRound] = useState(0);
    const formId = useId();
    const addEntry = useAddEntry();
    const ruled = useIncomingRules()(ruleInput(values));
    const filled =
        values.categoryId === null && ruled.categoryId !== null ? { ...values, categoryId: ruled.categoryId } : values;
    const change = (patch: Partial<EntryValues>) => {
        setValues((current) => ({ ...current, ...patch }));
        setProblem(null);
    };
    const submit = (another: boolean) => {
        const found = addEntry(values, scan?.receipt ? JSON.stringify(scan.receipt) : undefined);
        setProblem(found);
        if (found !== null) {
            return;
        }
        if (another) {
            change({ amountText: "", details: "", feeText: "", note: "" });
            setScan(null);
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
                        values={filled}
                    />
                    <section className="mt-5 flex flex-col gap-2">
                        <FilesLabel />
                        {scan ? (
                            <DraftReceipt
                                currency={values.currency}
                                merchant={values.note.trim()}
                                onRemove={() => setScan(null)}
                                receipt={scan.receipt}
                            />
                        ) : (
                            <ScanCard
                                onScan={(file) =>
                                    onSwitch({ accountId: values.accountId ?? undefined, file, kind: "receipt" })
                                }
                            />
                        )}
                    </section>
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
    children,
    doc,
    imageUrl,
    onDelete,
    onEditMerchant,
    onLogAgain,
    total,
}: {
    accountTrigger?: RefObject<HTMLButtonElement | null>;
    categoryTrigger?: RefObject<HTMLButtonElement | null>;
    children?: ReactNode;
    doc: Doc;
    imageUrl?: string;
    onDelete: () => void;
    onEditMerchant?: () => void;
    onLogAgain: () => void;
    total: ReactNode;
}) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { bulk, form } = useIntlayer("dashboard-transactions");
    const [base] = useState<EntryBase>(() => baseOf(ledger, doc));
    const [values, setValues] = useState(base.start);
    const [problem, setProblem] = useState<EntryProblem | null>(null);
    const saved = useRef(JSON.stringify(draftOf(ledger, base.start, base, "")));
    const save = (next: EntryValues) => {
        const current = committer.current();
        const live = current.books.transactions.find((row) => row.localId === doc.localId);
        if (!live || live.deletedAt !== null) {
            return;
        }
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
        const rows = editedEntry(current, live, { ...draft, feeNote }, at);
        void committer.commit(rows, { failed: form.saveFailed.value }).then((kept) => {
            // Cleared, not restored: the save before this one may have failed too. A repeat send changes nothing.
            if (!kept && saved.current === key) {
                saved.current = "";
            }
        });
    };
    // Esc and J K unmount this with no blur to save on.
    useOnUnmount(() => save(values));
    return (
        <>
            <div onBlur={() => save(values)}>
                <EntryFields
                    accountTrigger={accountTrigger}
                    categoryTrigger={categoryTrigger}
                    imageUrl={imageUrl}
                    layout="drawer"
                    onEditMerchant={onEditMerchant}
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
            </div>
            {children}
            <div className="flex flex-wrap items-center gap-2 py-4">
                <Button onClick={onLogAgain} size="sm" variant="outline">
                    <HugeiconsIcon icon={Copy01Icon} size={14} />
                    {form.logAgain}
                </Button>
                <Button onClick={onDelete} size="sm" variant="outline">
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                    {bulk.delete}
                </Button>
                <span className="text-muted-foreground text-app-label ml-auto">
                    {form.total} <span className="text-foreground font-mono tabular-nums">{total}</span>
                </span>
            </div>
        </>
    );
}
