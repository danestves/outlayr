import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CalendarRemove01Icon from "@hugeicons/core-free-icons/CalendarRemove01Icon";
import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { decimalsFor } from "@outlayr/money/currency";
import { fromWall, wallDay, wallNoon } from "@outlayr/money/ledger-zone";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { monthlyChargeCount } from "@outlayr/money/subscription-cost";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { parseAmount } from "@/lib/account-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { addDays, walk } from "@/lib/recurring";
import type { Schedule } from "@/lib/recurring";
import { draftProblems } from "@/lib/recurring-writes";
import type { DraftProblem, ScheduleDraft } from "@/lib/recurring-writes";

import { AmountInput, amountText, FlowDialog } from "../accounts/fields";
import { Glyph } from "../accounts/glyph";
import { Pick, useCategoryOptions } from "../transactions/entry-form";
import { ScheduleTile, useDay, useRepeatText } from "./parts";

const NO_ACCOUNT = "none";
const PREVIEW = 3;
const MAX_EVERY = 99;
const POPUP = "app-shell z-[60]";

const UNITS = [
    { type: RECURRING_TYPE.daily, unit: "days" },
    { type: RECURRING_TYPE.weekly, unit: "weeks" },
    { type: RECURRING_TYPE.monthly, unit: "months" },
    { type: RECURRING_TYPE.yearly, unit: "years" },
] as const;

const PRESETS = [
    { key: "daily", type: RECURRING_TYPE.daily },
    { key: "weekly", type: RECURRING_TYPE.weekly },
    { key: "monthly", type: RECURRING_TYPE.monthly },
    { key: "yearly", type: RECURRING_TYPE.yearly },
] as const;

interface Values {
    accountId: string | null;
    amountText: string;
    categoryId: string | null;
    endDay: string | null;
    every: number;
    income: boolean;
    note: string;
    startDay: string;
    type: number;
}

export interface FormTarget {
    key: string;
    schedule: Schedule | null;
}

interface Preview {
    day: string;
    short: boolean;
}

/** The first charges a chain would land on, flagging the ones a short month pulled back. */
export function previewOf(values: Pick<Values, "endDay" | "every" | "startDay" | "type">, count: number): Preview[] {
    const start = wallNoon(values.startDay);
    const anchor = Number(values.startDay.slice(8, 10));
    const found: Preview[] = [{ day: values.startDay, short: false }];
    for (const wallMs of walk({ anchor, endDay: values.endDay, every: values.every, start, type: values.type })) {
        if (found.length >= count) {
            break;
        }
        const day = wallDay(new Date(wallMs));
        const clamped = values.type !== RECURRING_TYPE.daily && values.type !== RECURRING_TYPE.weekly;
        found.push({ day, short: clamped && Number(day.slice(8, 10)) < anchor });
    }
    return found;
}

export function DayField({
    invalid = false,
    label,
    onChange,
    value,
}: {
    invalid?: boolean;
    label: string;
    onChange: (day: string) => void;
    value: string;
}) {
    const days = useDay();
    const input = useRef<HTMLInputElement>(null);
    return (
        <div className="relative">
            <Button
                aria-invalid={invalid || undefined}
                className="dash-figure aria-invalid:border-destructive w-full justify-between font-normal"
                onClick={() => input.current?.showPicker()}
                type="button"
                variant="outline"
            >
                {days.day(value, "")}
                <Glyph icon={Calendar03Icon} className="text-muted-foreground" size={16} />
            </Button>
            {/* iOS keeps its own wider width on a date input until its appearance is off. */}
            <input
                aria-label={label}
                className="pointer-events-none absolute inset-0 appearance-none opacity-0 pointer-coarse:pointer-events-auto"
                onChange={(event) => {
                    if (event.target.value !== "") {
                        onChange(event.target.value);
                    }
                }}
                ref={input}
                tabIndex={-1}
                type="date"
                value={value}
            />
        </div>
    );
}

function Slot({ children, error, label }: { children: ReactNode; error?: ReactNode; label: ReactNode }) {
    return (
        <Field className="min-w-0" invalid={Boolean(error)}>
            <Field.Label>{label}</Field.Label>
            {children}
            {error ? <Field.Error match>{error}</Field.Error> : null}
        </Field>
    );
}

function EndingField({ onChange, values }: { onChange: (endDay: string | null) => void; values: Values }) {
    const copy = useIntlayer("dashboard-recurring");
    const choice = values.endDay === null ? "never" : "date";
    return (
        <div className="flex gap-3">
            <Select
                items={[
                    { label: copy.form.never.value, value: "never" },
                    { label: copy.form.onDate.value, value: "date" },
                ]}
                onValueChange={(next) => {
                    if (next === "never") {
                        onChange(null);
                    } else if (next === "date" && values.endDay === null) {
                        onChange(addDays(values.startDay, 365));
                    }
                }}
                value={choice}
            >
                <Select.Trigger aria-label={copy.fields.ending.value} className="min-w-0 flex-1">
                    <Select.Value />
                </Select.Trigger>
                <Select.Content className={POPUP}>
                    <Select.Item value="never">{copy.form.never}</Select.Item>
                    <Select.Item value="date">{copy.form.onDate}</Select.Item>
                </Select.Content>
            </Select>
            {values.endDay === null ? null : (
                <div className="min-w-0 flex-1">
                    <DayField label={copy.fields.ending.value} onChange={onChange} value={values.endDay} />
                </div>
            )}
        </div>
    );
}

function PreviewList({ amount, first, rows }: { amount: string; first: boolean; rows: readonly Preview[] }) {
    const copy = useIntlayer("dashboard-recurring");
    const days = useDay();
    return (
        <div className="bg-background/40 rounded-xl border px-4">
            {rows.map((row, index) => (
                <div className="flex h-[45px] items-center gap-3 border-b text-sm last:border-0" key={row.day}>
                    <span className="dash-figure">{days.day(row.day, "")}</span>
                    {first && index === 0 ? (
                        <Badge className="h-6 rounded-md px-2 text-xs font-medium" variant="outline">
                            {copy.form.firstPayment}
                        </Badge>
                    ) : null}
                    {row.short ? (
                        <Badge
                            className="bg-app-warn/14 text-app-warn h-6 rounded-md px-2 text-xs font-medium"
                            variant="secondary"
                        >
                            {copy.form.shortMonth}
                        </Badge>
                    ) : null}
                    {amount === "" ? null : <span className="dash-figure text-muted-foreground ml-auto">{amount}</span>}
                </div>
            ))}
        </div>
    );
}

function Stepper({ onChange, value }: { onChange: (every: number) => void; value: number }) {
    const copy = useIntlayer("dashboard-recurring");
    return (
        <div className="flex h-10 items-center rounded-lg border">
            <Button
                aria-label="-1"
                disabled={value <= 1}
                onClick={() => onChange(value - 1)}
                size="icon-sm"
                type="button"
                variant="ghost"
            >
                <Glyph icon={MinusSignIcon} size={16} />
            </Button>
            <input
                aria-label={copy.form.every.value}
                className="dash-figure w-10 bg-transparent text-center text-sm outline-none"
                inputMode="numeric"
                onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(next)) {
                        onChange(Math.min(MAX_EVERY, Math.max(1, next)));
                    }
                }}
                value={value}
            />
            <Button
                aria-label="+1"
                disabled={value >= MAX_EVERY}
                onClick={() => onChange(value + 1)}
                size="icon-sm"
                type="button"
                variant="ghost"
            >
                <Glyph icon={Add01Icon} size={16} />
            </Button>
        </div>
    );
}

function CustomView({
    onBack,
    onDone,
    values,
}: {
    onBack: () => void;
    onDone: (patch: Pick<Values, "endDay" | "every" | "startDay" | "type">) => void;
    values: Values;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const repeat = useRepeatText();
    const days = useDay();
    const [draft, setDraft] = useState({
        endDay: values.endDay,
        every: values.every,
        startDay: values.startDay,
        type: values.type,
    });
    const rows = previewOf(draft, PREVIEW);
    const every = repeat.everyText(draft.type, draft.every);
    const split = every.lastIndexOf(" ") + 1;
    const marker = "\u0000";
    const sentence = copy.form
        .sentence({
            end: `${marker}${draft.endDay === null ? copy.form.sentenceNever.value : days.day(draft.endDay, "")}${marker}`,
            every: `${every.slice(0, split)}${marker}${every.slice(split)}${marker}`,
            start: `${marker}${days.day(draft.startDay, draft.startDay)}${marker}`,
        })
        .value.split(marker);
    const clamps = rows.some((row) => row.short);
    const badEnd = draft.endDay !== null && draft.endDay <= draft.startDay;
    return (
        <>
            <Dialog.Header data-view="custom">
                <div className="flex items-center gap-1">
                    <Button aria-label={copy.form.back.value} onClick={onBack} size="icon-sm" variant="ghost">
                        <Glyph icon={ArrowLeft02Icon} size={18} />
                    </Button>
                    <Dialog.Title>{copy.form.customTitle}</Dialog.Title>
                </div>
            </Dialog.Header>
            <Dialog.Body className="gap-3.5">
                <p aria-live="polite" className="mb-0.5 text-[26px] leading-[34px] font-medium tracking-[-0.02em]">
                    {sentence.map((part, index) => (
                        // Odd parts are the values the sentence was built around.
                        <span className={index % 2 === 1 ? "text-app-tint/90" : undefined} key={index}>
                            {part}
                        </span>
                    ))}
                </p>
                <Slot label={copy.form.every}>
                    <div className="flex gap-2">
                        <Stepper onChange={(next) => setDraft({ ...draft, every: next })} value={draft.every} />
                        <div className="bg-muted/50 flex flex-1 gap-1 rounded-lg p-1">
                            {UNITS.map(({ type, unit }) => (
                                <button
                                    aria-pressed={draft.type === type}
                                    className={`h-8 flex-1 rounded-md px-3 text-sm font-medium transition-colors ${draft.type === type ? "bg-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                    key={unit}
                                    onClick={() => setDraft({ ...draft, type })}
                                    type="button"
                                >
                                    {copy.form.units[unit]}
                                </button>
                            ))}
                        </div>
                    </div>
                </Slot>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Slot label={copy.fields.starting}>
                        <DayField
                            label={copy.fields.starting.value}
                            onChange={(startDay) => setDraft({ ...draft, startDay })}
                            value={draft.startDay}
                        />
                    </Slot>
                    <Slot error={badEnd ? copy.form.errors.ending : null} label={copy.fields.ending}>
                        <EndingField
                            onChange={(endDay) => setDraft({ ...draft, endDay })}
                            values={{ ...values, ...draft }}
                        />
                    </Slot>
                </div>
                <Slot label={copy.fields.nextCharges}>
                    <PreviewList amount="" first rows={rows} />
                    {clamps ? <p className="text-muted-foreground text-xs">{copy.form.shortNote}</p> : null}
                </Slot>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className="flex-1" onClick={onBack} variant="secondary">
                    {copy.form.back}
                </Button>
                <Button className="flex-1" disabled={badEnd} onClick={() => onDone(draft)}>
                    {copy.form.done}
                </Button>
            </Dialog.Footer>
        </>
    );
}

function valuesOf(schedule: Schedule | null, today: string): Values {
    if (!schedule) {
        return {
            accountId: null,
            amountText: "",
            categoryId: null,
            endDay: null,
            every: 1,
            income: false,
            note: "",
            startDay: today,
            type: RECURRING_TYPE.monthly,
        };
    }
    const { chain, seed } = schedule;
    const next = schedule.next?.day ?? schedule.due.at(0)?.day ?? addDays(today, 1);
    return {
        accountId: seed.accountId,
        amountText: amountText(seed.amount, seed.currency ?? "USD"),
        categoryId: seed.categoryId,
        endDay: chain.endDay,
        every: chain.every,
        income: seed.income,
        note: seed.note,
        startDay: next,
        type: chain.type,
    };
}

/** Open accounts, plus the picked one when it has since been closed. */
export function AccountPick({ onPick, value }: { onPick: (id: string | null) => void; value: string | null }) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const accounts = openAccounts(ledger.books);
    const picked = ledger.books.accounts.find((row) => row.localId === value);
    const shown = picked && !accounts.includes(picked) ? [...accounts, picked] : accounts;
    return (
        <Pick
            onPick={(id) => onPick(id === NO_ACCOUNT ? null : id)}
            options={[
                { label: copy.form.noAccount.value, value: NO_ACCOUNT },
                ...shown.map((row) => ({
                    icon: <AccountTile account={accountLook(row)} size="sm" />,
                    label: row.name,
                    value: row.localId,
                })),
            ]}
            quiet={false}
            value={value ?? NO_ACCOUNT}
        />
    );
}

function FormView({
    onClose,
    onCustom,
    onSave,
    onStop,
    schedule,
    setValues,
    values,
}: {
    onClose: () => void;
    onCustom: () => void;
    onSave: (draft: ScheduleDraft) => void;
    onStop: (() => void) | null;
    schedule: Schedule | null;
    setValues: (values: Values) => void;
    values: Values;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const { locale } = useLocale();
    const repeat = useRepeatText();
    const categoryOptions = useCategoryOptions(ledger, values.income);
    const [tried, setTried] = useState(false);
    const account = ledger.books.accounts.find((row) => row.localId === values.accountId);
    const currency = account?.currency ?? schedule?.seed.currency ?? ledger.currency;
    const amount = parseAmount(values.amountText, decimalsFor(currency));
    const { offsetAt } = ledger;
    const draft: ScheduleDraft = {
        accountId: values.accountId,
        amount: Number.isFinite(amount) ? amount : 0,
        categoryId: values.categoryId,
        currency,
        date: fromWall(wallNoon(values.startDay), offsetAt),
        endDate: values.endDay === null ? null : fromWall(wallNoon(values.endDay), offsetAt),
        every: values.every,
        income: values.income,
        note: values.note,
        type: values.type,
    };
    const problems = new Set<DraftProblem>(tried ? draftProblems(draft) : []);
    const preset = values.every === 1 ? PRESETS.find((each) => each.type === values.type) : undefined;
    const perMonth = draft.amount * monthlyChargeCount(values.type, values.every);
    const shownAmount = draft.amount > 0 ? amountText(draft.amount, currency) : "";
    const save = () => {
        setTried(true);
        if (draftProblems(draft).length === 0) {
            onSave(draft);
        }
    };
    const set = (patch: Partial<Values>) => setValues({ ...values, ...patch });
    const { errors } = copy.form;
    return (
        <FlowDialog
            head={schedule ? <ScheduleTile name={schedule.name} seed={schedule.seed} size="md" /> : null}
            label={schedule ? copy.form.editTitle({ name: schedule.name }) : copy.form.addTitle}
        >
            <Dialog.Body className="gap-3.5">
                {schedule ? null : (
                    <div className="bg-muted/50 flex w-fit gap-1 rounded-lg p-1">
                        {([false, true] as const).map((income) => (
                            <button
                                aria-pressed={values.income === income}
                                className={`h-8 rounded-md px-4 text-sm font-medium transition-colors ${values.income === income ? "bg-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                key={String(income)}
                                onClick={() => set({ categoryId: null, income })}
                                type="button"
                            >
                                {income ? copy.form.income : copy.form.expense}
                            </button>
                        ))}
                    </div>
                )}
                <Slot error={problems.has("name") ? errors.name : null} label={copy.fields.name}>
                    <Input
                        aria-invalid={problems.has("name") || undefined}
                        autoFocus={schedule === null}
                        onChange={(event) => set({ note: event.target.value })}
                        placeholder={copy.form.namePlaceholder.value}
                        value={values.note}
                    />
                </Slot>
                <div className="grid gap-3 gap-y-3.5 sm:grid-cols-2">
                    <Slot
                        error={problems.has("amount") ? errors.amount({ zero: amountText(0, currency) }) : null}
                        label={copy.fields.amount}
                    >
                        <AmountInput
                            currency={currency}
                            label={copy.fields.amount.value}
                            onText={(text) => set({ amountText: text })}
                            text={values.amountText}
                        />
                    </Slot>
                    <Slot error={problems.has("category") ? errors.category : null} label={copy.fields.category}>
                        <Pick
                            invalid={problems.has("category")}
                            onPick={(categoryId) => set({ categoryId })}
                            options={categoryOptions}
                            placeholder={copy.form.pickCategory.value}
                            quiet={false}
                            value={values.categoryId}
                        />
                    </Slot>
                    <Slot label={copy.fields.account}>
                        <AccountPick onPick={(accountId) => set({ accountId })} value={values.accountId} />
                    </Slot>
                    <Slot label={schedule ? copy.fields.nextCharge : copy.fields.starting}>
                        <DayField
                            label={(schedule ? copy.fields.nextCharge : copy.fields.starting).value}
                            onChange={(startDay) => set({ startDay })}
                            value={values.startDay}
                        />
                    </Slot>
                </div>
                <Slot label={copy.fields.repeats}>
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((each) => (
                            <Button
                                aria-pressed={preset?.key === each.key}
                                className={`rounded-full px-3 ${preset?.key === each.key ? "border-app-tint/60 bg-app-tint/14 text-app-tint hover:bg-app-tint/18" : ""}`}
                                key={each.key}
                                onClick={() => set({ every: 1, type: each.type })}
                                size="sm"
                                type="button"
                                variant="outline"
                            >
                                {copy.repeat[each.key]}
                            </Button>
                        ))}
                        <Button
                            aria-pressed={preset === undefined}
                            className={`rounded-full px-3 ${preset === undefined ? "border-app-tint/60 bg-app-tint/14 text-app-tint hover:bg-app-tint/18" : ""}`}
                            onClick={onCustom}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            <Glyph icon={Settings02Icon} size={16} />
                            {preset === undefined ? repeat.short(values.type, values.every) : copy.form.custom}
                        </Button>
                    </div>
                </Slot>
                <Slot error={problems.has("ending") ? errors.ending : null} label={copy.fields.ending}>
                    <EndingField onChange={(endDay) => set({ endDay })} values={values} />
                </Slot>
                <Slot label={copy.fields.nextCharges}>
                    <PreviewList
                        amount={shownAmount}
                        first={schedule === null}
                        rows={previewOf(values, schedule ? 2 : PREVIEW)}
                    />
                    {schedule ? <p className="text-muted-foreground text-xs">{copy.form.keepNote}</p> : null}
                </Slot>
            </Dialog.Body>
            <Dialog.Footer className="items-center">
                {onStop ? (
                    <Button className="me-auto" onClick={onStop} variant="outline">
                        <Glyph icon={CalendarRemove01Icon} size={16} />
                        {copy.actions.stop}
                    </Button>
                ) : (
                    <span className="text-muted-foreground me-auto text-[13px] max-sm:hidden">
                        {perMonth > 0
                            ? copy.form
                                  .adds({ amount: money(perMonth, currency) })
                                  .value.split(money(perMonth, currency))
                                  .flatMap((part, index) =>
                                      index === 0
                                          ? [part]
                                          : [
                                                <b className="dash-figure text-foreground font-medium" key={locale}>
                                                    {money(perMonth, currency)}
                                                </b>,
                                                part,
                                            ]
                                  )
                            : null}
                    </span>
                )}
                <Button onClick={onClose} variant="secondary">
                    {copy.cancel}
                </Button>
                <Button disabled={problems.size > 0} onClick={save}>
                    {copy.form.save}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function ScheduleForm({
    onClose,
    onSave,
    onStop,
    target,
}: {
    onClose: () => void;
    onSave: (schedule: Schedule | null, draft: ScheduleDraft) => void;
    onStop: (schedule: Schedule) => void;
    target: FormTarget | null;
}) {
    return (
        <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open={target !== null}>
            <Dialog.Content
                className="app-shell ph-no-capture max-w-[520px] has-[[data-view=custom]]:max-w-md"
                size="md"
            >
                {target ? (
                    <FormBody key={target.key} onClose={onClose} onSave={onSave} onStop={onStop} target={target} />
                ) : null}
            </Dialog.Content>
        </Dialog>
    );
}

function FormBody({
    onClose,
    onSave,
    onStop,
    target,
}: {
    onClose: () => void;
    onSave: (schedule: Schedule | null, draft: ScheduleDraft) => void;
    onStop: (schedule: Schedule) => void;
    target: FormTarget;
}) {
    const { ledger } = useDashboard();
    const { schedule } = target;
    const [values, setValues] = useState(() => valuesOf(schedule, ledger.today));
    const [custom, setCustom] = useState(false);
    if (custom) {
        return (
            <CustomView
                onBack={() => setCustom(false)}
                onDone={(patch) => {
                    setValues({ ...values, ...patch });
                    setCustom(false);
                }}
                values={values}
            />
        );
    }
    return (
        <FormView
            onClose={onClose}
            onCustom={() => setCustom(true)}
            onSave={(draft) => onSave(schedule, draft)}
            onStop={schedule && schedule.state === "active" ? () => onStop(schedule) : null}
            schedule={schedule}
            setValues={setValues}
            values={values}
        />
    );
}
