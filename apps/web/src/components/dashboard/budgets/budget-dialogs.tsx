import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { decimalsFor } from "@outlayr/money/currency";
import { limitIn } from "@outlayr/money/valuation";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { FlowDialog } from "@/components/dashboard/accounts/fields";
import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { DayField, FOOTER_PILL, LABEL, MoneyField, POPUP, plainAmount } from "@/components/dashboard/debts/fields";
import { useCategoryName, useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { parseAmount } from "@/lib/account-writes";
import { createdBudget, deletedBudget, editedBudget } from "@/lib/budget-writes";
import type { Budget, BudgetDraft, MainBudget } from "@/lib/budget-writes";
import { round, UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf } from "@/lib/dashboard-series-period";
import { ledgerBooks } from "@/lib/ledger-db";

import type { BudgetFlow } from "./flow-context";
import { budgetOf, budgetsOverview, limitPreview } from "./model";
import type { LimitPreview } from "./model";
import { Dot, HistoryBars, Note, useMoney, useMonthNames } from "./parts";
import { PlanDialogs } from "./plan-dialogs";

type Cadence = "day" | "month" | "week" | "year";

const CADENCES: readonly Cadence[] = ["day", "week", "month", "year"];

export const cadenceOf = (type: number): Cadence => {
    switch (type) {
        case BUDGET_TYPE.day: {
            return "day";
        }
        case BUDGET_TYPE.week: {
            return "week";
        }
        case BUDGET_TYPE.year: {
            return "year";
        }
        default: {
            return "month";
        }
    }
};

interface StoredLimit {
    row: Budget | MainBudget;
    table: "budgets" | "mainBudget";
}

function storedLimit(ledger: Ledger, budgetId: string): StoredLimit | null {
    const budget = ledger.books.budgets.find((row) => row.localId === budgetId && row.deletedAt === null);
    if (budget) {
        return { row: budget, table: "budgets" };
    }
    const main = ledger.books.mainBudget.find((row) => row.localId === budgetId && row.deletedAt === null);
    return main ? { row: main, table: "mainBudget" } : null;
}

/** Names a window the way its cadence reads: a month by name, a year by number, a day or week by its first day. */
export function useWindowNames() {
    const names = useMonthNames();
    const date = useDateFormat();
    return {
        bar: (from: string, cadence: Cadence) => {
            if (cadence === "month") {
                return names.short(from);
            }
            return cadence === "year" ? from.slice(0, 4) : date.day(from);
        },
        name: (from: string, cadence: Cadence) => {
            if (cadence === "month") {
                return names.month(from);
            }
            return cadence === "year" ? from.slice(0, 4) : date.day(from);
        },
    };
}

function CadenceTabs({
    cadence,
    label,
    onCadence,
}: {
    cadence: Cadence;
    label: string;
    onCadence: (next: Cadence) => void;
}) {
    const { columns } = useIntlayer("dashboard-budgets");
    return (
        <Tabs onValueChange={(next: Cadence) => onCadence(next)} value={cadence} variant="segmented">
            <Tabs.List aria-label={label} className="w-full *:flex-auto *:px-1">
                {CADENCES.map((each) => (
                    <Tabs.Trigger key={each} value={each}>
                        {columns.window[each]}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

function PreviewBars({
    amount,
    cadence,
    color,
    preview,
}: {
    amount: number;
    cadence: Cadence;
    color: string;
    preview: LimitPreview;
}) {
    const copy = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const windows = useWindowNames();
    return (
        <div className="mt-1">
            <div className="mb-2 flex items-baseline justify-between text-[13px]">
                <span className="text-muted-foreground">{copy.detail.last[cadence]}</span>
                {preview.typical.amount === null ? null : (
                    <span className="dash-figure text-muted-foreground">
                        {copy.form.typical({ amount: money(preview.typical.amount) })}
                    </span>
                )}
            </div>
            <HistoryBars
                bars={preview.history.map((window) => ({
                    key: window.from,
                    label: windows.bar(window.from, cadence),
                    spent: window.spent,
                }))}
                color={color}
                height={84}
                limit={amount > 0 ? amount : null}
                limitLine
                selected={preview.history.length - 1}
            />
            <div className="h-3" />
        </div>
    );
}

function DraftNotes({ amount, cadence, preview }: { amount: number; cadence: Cadence; preview: LimitPreview }) {
    const { ledger } = useDashboard();
    const { form } = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const { whole } = useWholeMoney(ledger.currency);
    const windows = useWindowNames();
    const { current, daysLeft } = preview;
    const spare = amount - current.spent;
    return (
        <div>
            {spare >= 0 ? (
                <Note icon={TransactionHistoryIcon}>
                    {form.wouldHold({ amount: money(spare), window: windows.name(current.from, cadence) })}
                </Note>
            ) : (
                <Note icon={TransactionHistoryIcon} tone="text-app-spend">
                    {form.alreadyOver({ over: whole(-spare), spent: whole(current.spent) })}
                </Note>
            )}
            {preview.over === null ? null : (
                <Note icon={Analytics01Icon}>{form.wentOver({ count: preview.over, total: preview.closed })}</Note>
            )}
            {spare > 0 && daysLeft > 0 ? (
                <Note icon={Calendar03Icon}>
                    {daysLeft === 1
                        ? form.perDayLeftOne({ amount: whole(spare) })
                        : form.perDayLeft({ amount: whole(spare / daysLeft), count: daysLeft })}
                </Note>
            ) : null}
        </div>
    );
}

interface Choice {
    color: string;
    id: string;
    name: string;
    spent: number;
    taken: boolean;
}

function useChoices(): readonly Choice[] {
    const { ledger } = useDashboard();
    const categoryName = useCategoryName();
    const overview = budgetsOverview(ledger, monthNow(ledger));
    const spent = new Map(overview.open.map((line) => [line.categoryId, line.spent]));
    const spentOn = new Set(ledger.rows.filter((row) => !row.income).map((row) => row.topId));
    const targets = new Map([...[...ledger.categories].filter(([id]) => spentOn.has(id)), ...ledger.budgetTargets]);
    targets.delete(UNCATEGORIZED_ID);
    return [...targets.values()]
        .map((target) => ({
            color: target.color,
            id: target.id,
            name: categoryName(target),
            spent: spent.get(target.id) ?? 0,
            taken: budgetOf(ledger, target.id) !== null,
        }))
        .toSorted((a, b) => Number(a.taken) - Number(b.taken) || b.spent - a.spent || a.name.localeCompare(b.name));
}

function CategoryPick({
    choices,
    invalid,
    onPick,
    value,
}: {
    choices: readonly Choice[];
    invalid: boolean;
    onPick: (id: string) => void;
    value: string | null;
}) {
    const { form } = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const picked = choices.find((choice) => choice.id === value);
    const free = choices.filter((choice) => !choice.taken);
    const taken = choices.filter((choice) => choice.taken);
    return (
        <Select
            items={choices.map((choice) => ({ label: choice.name, value: choice.id }))}
            onValueChange={(next) => next !== null && onPick(next)}
            value={value}
        >
            <Select.Trigger aria-invalid={invalid || undefined} aria-label={form.category.value}>
                {picked ? <Dot color={picked.color} /> : null}
                <Select.Value placeholder={(invalid ? form.pick : form.choose).value} />
            </Select.Trigger>
            <Select.Content className={POPUP}>
                {free.map((choice) => (
                    <Select.Item icon={<Dot color={choice.color} />} key={choice.id} value={choice.id}>
                        <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="truncate">{choice.name}</span>
                            <span className="dash-figure text-muted-foreground ms-auto text-[13px]">
                                {form.thisMonth({ amount: money(choice.spent) })}
                            </span>
                        </span>
                    </Select.Item>
                ))}
                {free.length > 0 && taken.length > 0 ? <Select.Separator /> : null}
                {taken.map((choice) => (
                    <Select.Item disabled icon={<Dot color={choice.color} />} key={choice.id} value={choice.id}>
                        <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="truncate">{choice.name}</span>
                            <span className="text-muted-foreground ms-auto text-[13px]">{form.hasLimit}</span>
                        </span>
                    </Select.Item>
                ))}
            </Select.Content>
        </Select>
    );
}

function Locked({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
    return (
        <fieldset aria-label={label} className="bg-foreground/[0.024] h-9 rounded-lg border p-0 text-sm">
            <div className="flex h-[34px] items-center gap-2 px-3">
                {icon}
                <span className="min-w-0 truncate">{children}</span>
                <Glyph icon={SquareLock02Icon} className="text-muted-foreground ms-auto" size={16} />
            </div>
        </fieldset>
    );
}

type LimitMode =
    | { categoryId: string | null; kind: "new" }
    | { kind: "overall" }
    | { kind: "edit"; stored: StoredLimit };

// A limit set in another currency reads in the ledger's, as the overview and a phone show it.
const shownAmount = (ledger: Ledger, row: Budget | MainBudget) =>
    row.currency === ledger.currency
        ? row.amount
        : round(ledger, limitIn(row, new Date(ledger.now), ledger.currency, ledger.rates));

function initialText(ledger: Ledger, mode: LimitMode) {
    if (mode.kind === "edit") {
        return plainAmount(shownAmount(ledger, mode.stored.row), ledger.currency);
    }
    if (mode.kind === "overall") {
        const { limits } = budgetsOverview(ledger, monthNow(ledger)).totals;
        return limits > 0 ? plainAmount(limits, ledger.currency) : "";
    }
    return "";
}

function monthNow(ledger: Ledger) {
    return periodOf(periodKeyOf(ledger.today, ledger.firstDayOfMonth), ledger.firstDayOfMonth);
}

const storedDayOf = (ledger: Ledger, row: Budget | MainBudget) =>
    row.startDate === null ? null : new Date(row.startDate + ledger.offsetAt(row.startDate)).toISOString().slice(0, 10);

const isDirty = (ledger: Ledger, stored: StoredLimit, draft: BudgetDraft, storedDay: string | null) =>
    Math.abs(draft.amount) !== shownAmount(ledger, stored.row) ||
    draft.type !== stored.row.type ||
    draft.startDay !== storedDay ||
    draft.name.trim() !== (stored.row.name ?? "").trim() ||
    draft.rollover !== stored.row.rollover;

function SubjectField({
    categoryId,
    color,
    invalid,
    onPick,
    overall,
    stored,
}: {
    categoryId: string | null;
    color: string;
    invalid: boolean;
    onPick: (id: string) => void;
    overall: boolean;
    stored: boolean;
}) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-budgets");
    const { form } = copy;
    const categoryName = useCategoryName();
    const choices = useChoices();
    const target = categoryId === null ? undefined : ledger.budgetTargets.get(categoryId);
    if (overall) {
        return (
            <Field>
                <Field.Label>{form.covers}</Field.Label>
                <Locked
                    icon={<Glyph icon={PieChartIcon} className="text-muted-foreground" size={16} />}
                    label={form.covers.value}
                >
                    {copy.allSpending}
                </Locked>
            </Field>
        );
    }
    return (
        <Field invalid={invalid}>
            <Field.Label className={LABEL}>{form.category}</Field.Label>
            {stored ? (
                <Locked icon={<Dot color={color} />} label={form.category.value}>
                    {target ? categoryName(target) : ""}
                </Locked>
            ) : (
                <CategoryPick choices={choices} invalid={invalid} onPick={onPick} value={categoryId} />
            )}
            {invalid ? <Field.Error match>{form.pickHint}</Field.Error> : null}
        </Field>
    );
}

function EditNotes({
    draft,
    preview,
    stored,
    storedDay,
}: {
    draft: BudgetDraft;
    preview: LimitPreview;
    stored: StoredLimit;
    storedDay: string | null;
}) {
    const { ledger } = useDashboard();
    const { form } = useIntlayer("dashboard-budgets");
    const { whole } = useWholeMoney(ledger.currency);
    const date = useDateFormat();
    const { amount, rollover } = draft;
    const windowChanged = draft.startDay !== storedDay || draft.type !== stored.row.type;
    return (
        <div>
            {amount > 0 && preview.current.spent > amount ? (
                <Note icon={Alert02Icon} iconTone="text-app-warn">
                    {form.alreadyOver({
                        over: whole(preview.current.spent - amount),
                        spent: whole(preview.current.spent),
                    })}
                </Note>
            ) : null}
            {windowChanged ? (
                <Note icon={Calendar03Icon}>
                    {form.window({ from: date.day(preview.current.from), to: date.day(preview.current.to) })}
                </Note>
            ) : null}
            {rollover && rollover !== stored.row.rollover ? (
                <Note icon={TransactionHistoryIcon}>{form.carryNote}</Note>
            ) : null}
        </div>
    );
}

function StoredFields({
    day,
    name,
    onDay,
    onName,
    onRollover,
    placeholder,
    rollover,
}: {
    day: string;
    name: string;
    onDay: (day: string) => void;
    onName: (name: string) => void;
    onRollover: (rollover: boolean) => void;
    placeholder: string;
    rollover: boolean;
}) {
    const { ledger } = useDashboard();
    const { form } = useIntlayer("dashboard-budgets");
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <Field>
                    <Field.Label>{form.from}</Field.Label>
                    <DayField day={day} label={form.from.value} max={ledger.today} onDay={onDay} />
                </Field>
                <Field>
                    <Field.Label>{form.name}</Field.Label>
                    <Input
                        aria-label={form.name.value}
                        onChange={(event) => onName(event.target.value)}
                        placeholder={placeholder}
                        value={name}
                    />
                </Field>
            </div>
            {name.trim() === "" ? null : <p className="text-muted-foreground -mt-2 text-xs">{form.nameHint}</p>}
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
                {form.carryOver}
                <Switch checked={rollover} onCheckedChange={onRollover} />
            </label>
        </>
    );
}

function LimitNotes({
    cadence,
    dirty,
    draft,
    preview,
    stored,
    storedDay,
}: {
    cadence: Cadence;
    dirty: boolean;
    draft: BudgetDraft;
    preview: LimitPreview;
    stored: StoredLimit | null;
    storedDay: string | null;
}) {
    const { form } = useIntlayer("dashboard-budgets");
    if (!stored) {
        return draft.amount > 0 ? <DraftNotes amount={draft.amount} cadence={cadence} preview={preview} /> : null;
    }
    if (dirty) {
        return <EditNotes draft={draft} preview={preview} stored={stored} storedDay={storedDay} />;
    }
    return preview.over === null ? null : (
        <Note icon={Analytics01Icon}>{form.wentOver({ count: preview.over, total: preview.closed })}</Note>
    );
}

function limitRow(
    ledger: Ledger,
    stored: StoredLimit | null,
    categoryId: string | null,
    draft: BudgetDraft,
    at: number
) {
    if (!stored) {
        return createdBudget(ledger, categoryId, draft, crypto.randomUUID(), at);
    }
    const fresh =
        (stored.table === "budgets" ? ledger.books.budgets : ledger.books.mainBudget).find(
            (each) => each.localId === stored.row.localId
        ) ?? stored.row;
    const amount = Math.abs(draft.amount) === shownAmount(ledger, fresh) ? fresh.amount : draft.amount;
    return editedBudget(ledger, stored.table, fresh, { ...draft, amount }, at);
}

function LimitFooter({
    dirty,
    formId,
    onClose,
    onDelete,
    ready,
    submitLabel,
}: {
    dirty: boolean;
    formId: string;
    onClose: () => void;
    onDelete: (() => void) | null;
    ready: boolean;
    submitLabel: ReactNode;
}) {
    const { form } = useIntlayer("dashboard-budgets");
    return (
        <Dialog.Footer>
            {onDelete ? (
                <Button className={`text-destructive me-auto ${FOOTER_PILL}`} onClick={onDelete} variant="secondary">
                    <Glyph icon={Delete02Icon} size={16} />
                    {form.delete}
                </Button>
            ) : null}
            <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                {form.cancel}
            </Button>
            <Button
                className={`${ready ? "" : "opacity-50"} ${FOOTER_PILL}`}
                disabled={onDelete !== null && !dirty}
                form={formId}
                type="submit"
            >
                {submitLabel}
            </Button>
        </Dialog.Footer>
    );
}

function initialCategory(mode: LimitMode) {
    if (mode.kind === "new") {
        return mode.categoryId;
    }
    if (mode.kind === "edit" && mode.stored.table === "budgets" && "categoryId" in mode.stored.row) {
        return mode.stored.row.categoryId;
    }
    return null;
}

function AmountFields({
    autoFocus,
    cadence,
    invalid,
    onCadence,
    onText,
    text,
}: {
    autoFocus: boolean;
    cadence: Cadence;
    invalid: boolean;
    onCadence: (cadence: Cadence) => void;
    onText: (text: string) => void;
    text: string;
}) {
    const { ledger } = useDashboard();
    const { form } = useIntlayer("dashboard-budgets");
    const { whole } = useWholeMoney(ledger.currency);
    return (
        <div className="grid grid-cols-2 gap-3">
            <Field invalid={invalid}>
                <Field.Label className={LABEL}>{form.limit}</Field.Label>
                <MoneyField
                    autoFocus={autoFocus}
                    currency={ledger.currency}
                    invalid={invalid}
                    label={form.limit.value}
                    onText={onText}
                    text={text}
                />
                {invalid ? <Field.Error match>{form.limitHint({ zero: whole(0) })}</Field.Error> : null}
            </Field>
            <Field>
                <Field.Label>{form.every}</Field.Label>
                <CadenceTabs cadence={cadence} label={form.every.value} onCadence={onCadence} />
            </Field>
        </div>
    );
}

function useLimitForm(mode: LimitMode) {
    const { ledger } = useDashboard();
    const stored = mode.kind === "edit" ? mode.stored : null;
    const storedDay = stored ? storedDayOf(ledger, stored.row) : null;
    const [categoryId, setCategoryId] = useState(() => initialCategory(mode));
    const [text, setText] = useState(() => initialText(ledger, mode));
    const [cadence, setCadence] = useState<Cadence>(() => cadenceOf(stored?.row.type ?? BUDGET_TYPE.month));
    const [startDay, setStartDay] = useState<string | null>(storedDay);
    const [name, setName] = useState(stored?.row.name ?? "");
    const [rollover, setRollover] = useState(stored?.row.rollover ?? false);
    const [tried, setTried] = useState(false);
    const amount = text.trim() === "" ? 0 : parseAmount(text, decimalsFor(ledger.currency));
    const type = BUDGET_TYPE[cadence];
    const overall = mode.kind === "overall" || stored?.table === "mainBudget";
    const subject = overall ? null : categoryId;
    const chosen = overall || categoryId !== null;
    const preview = useMemo(
        () => (chosen ? limitPreview(ledger, subject, { amount, startDay: stored ? startDay : null, type }) : null),
        [amount, chosen, ledger, startDay, stored, subject, type]
    );
    const target = categoryId === null ? undefined : ledger.budgetTargets.get(categoryId);
    const color = target?.color ?? "var(--color-app-muted)";
    const draft: BudgetDraft = { amount, name, rollover, startDay: stored ? startDay : null, type };
    const dirty = stored !== null && isDirty(ledger, stored, draft, storedDay);
    return {
        amount,
        cadence,
        categoryId,
        chosen,
        color,
        dirty,
        draft,
        name,
        overall,
        preview,
        rollover,
        setCadence,
        setCategoryId,
        setName,
        setRollover,
        setStartDay,
        setText,
        setTried,
        startDay,
        stored,
        storedDay,
        subject,
        target,
        text,
        tried,
    };
}

function LimitDialog({
    mode,
    onClose,
    onSwitch,
}: {
    mode: LimitMode;
    onClose: () => void;
    onSwitch: (flow: BudgetFlow) => void;
}) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const copy = useIntlayer("dashboard-budgets");
    const { form } = copy;
    const { whole } = useWholeMoney(ledger.currency);
    const categoryName = useCategoryName();
    const formId = useId();
    const {
        amount,
        cadence,
        categoryId,
        chosen,
        color,
        dirty,
        draft,
        name,
        overall,
        preview,
        rollover,
        setCadence,
        setCategoryId,
        setName,
        setRollover,
        setStartDay,
        setText,
        setTried,
        startDay,
        stored,
        storedDay,
        subject,
        target,
        text,
        tried,
    } = useLimitForm(mode);
    const missingCategory = tried && !chosen;
    const missingAmount = tried && amount <= 0;
    const ready = chosen && amount > 0;
    const submit = (at: number) => {
        if (!ready) {
            setTried(true);
            return;
        }
        if (stored && !dirty) {
            onClose();
            return;
        }
        const row = limitRow({ ...ledger, books: ledgerBooks(db) }, stored, subject, draft, at);
        onClose();
        void committer.commit([row], { failed: form.failed.value });
    };
    let title: ReactNode = stored ? form.editTitle : form.newTitle;
    if (overall) {
        title = form.overallTitle;
    }
    let submitLabel: ReactNode = stored ? form.save : form.set;
    if (amount > 0 && (!stored || dirty)) {
        submitLabel = form.keepUnder({ amount: whole(amount) });
    }
    const categoryLabel = target ? categoryName(target) : "";
    return (
        <FlowDialog label={title}>
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
                    <SubjectField
                        categoryId={categoryId}
                        color={color}
                        invalid={missingCategory}
                        onPick={setCategoryId}
                        overall={overall}
                        stored={stored !== null}
                    />
                    <AmountFields
                        autoFocus={mode.kind !== "new" || mode.categoryId !== null}
                        cadence={cadence}
                        invalid={missingAmount}
                        onCadence={(next) => {
                            setCadence(next);
                            setStartDay(stored && next === cadenceOf(stored.row.type) ? storedDay : null);
                        }}
                        onText={setText}
                        text={text}
                    />
                    {stored ? (
                        <StoredFields
                            day={startDay ?? preview?.current.from ?? ledger.today}
                            name={name}
                            onDay={setStartDay}
                            onName={setName}
                            onRollover={setRollover}
                            placeholder={overall ? copy.allSpending.value : categoryLabel}
                            rollover={rollover}
                        />
                    ) : null}
                    {preview && (!stored || !dirty) ? (
                        <PreviewBars
                            amount={amount}
                            cadence={cadence}
                            color={overall ? "var(--color-app-tint)" : color}
                            preview={preview}
                        />
                    ) : null}
                </form>
                {preview ? (
                    <LimitNotes
                        cadence={cadence}
                        dirty={dirty}
                        draft={draft}
                        preview={preview}
                        stored={stored}
                        storedDay={storedDay}
                    />
                ) : null}
            </Dialog.Body>
            <LimitFooter
                dirty={dirty}
                formId={formId}
                onClose={onClose}
                onDelete={stored ? () => onSwitch({ budgetId: stored.row.localId, kind: "delete" }) : null}
                ready={ready}
                submitLabel={submitLabel}
            />
        </FlowDialog>
    );
}

function DeleteLimit({ onClose, stored }: { onClose: () => void; stored: StoredLimit }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const copy = useIntlayer("dashboard-budgets");
    const categoryName = useCategoryName();
    const navigate = useNavigate();
    const onDetail = useLocation({ select: (location) => location.pathname.startsWith("/app/budgets/") });
    const categoryId = stored.table === "budgets" && "categoryId" in stored.row ? stored.row.categoryId : null;
    const target = categoryId === null ? undefined : ledger.budgetTargets.get(categoryId);
    const name = stored.row.name?.trim() || (target ? categoryName(target) : copy.allSpending.value);
    const remove = () => {
        const books = ledgerBooks(db);
        const fresh =
            (stored.table === "budgets" ? books.budgets : books.mainBudget).find(
                (each) => each.localId === stored.row.localId
            ) ?? stored.row;
        onClose();
        committer.commitWithUndo([deletedBudget(stored.table, fresh, Date.now())], {
            after:
                onDetail && categoryId === null ? navigate({ search: (prev) => prev, to: "/app/budgets" }) : undefined,
            failed: copy.delete.failed.value,
            text: copy.delete.toast.value,
        });
    };
    return (
        <FlowDialog label={copy.delete.title({ name })}>
            <Dialog.Body>
                <Dialog.Description className="text-foreground text-wrap">
                    {categoryId === null ? copy.delete.overallBody : copy.delete.body({ name })}
                </Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {copy.form.cancel}
                </Button>
                <Button className={FOOTER_PILL} onClick={remove} variant="destructive">
                    {copy.delete.confirm}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function BudgetDialogs({
    flow,
    onClose,
    onSwitch,
}: {
    flow: BudgetFlow;
    onClose: () => void;
    onSwitch: (flow: BudgetFlow) => void;
}) {
    const { ledger } = useDashboard();
    switch (flow.kind) {
        case "new": {
            return <LimitDialog key={flow.categoryId ?? "new"} mode={flow} onClose={onClose} onSwitch={onSwitch} />;
        }
        case "overall": {
            return <LimitDialog mode={flow} onClose={onClose} onSwitch={onSwitch} />;
        }
        case "edit":
        case "delete": {
            const stored = storedLimit(ledger, flow.budgetId);
            if (!stored) {
                return null;
            }
            return flow.kind === "edit" ? (
                <LimitDialog
                    key={flow.budgetId}
                    mode={{ kind: "edit", stored }}
                    onClose={onClose}
                    onSwitch={onSwitch}
                />
            ) : (
                <DeleteLimit onClose={onClose} stored={stored} />
            );
        }
        default: {
            return <PlanDialogs flow={flow} onClose={onClose} />;
        }
    }
}
