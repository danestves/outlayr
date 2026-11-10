import { decimalsFor } from "@outlayr/money/currency";
import { fromWall, wallNoon } from "@outlayr/money/ledger-zone";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Switch } from "panelui-web/switch";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { parseAmount } from "@/lib/account-writes";
import { addDays, nextCharges } from "@/lib/recurring";
import type { Candidate, Charge, Schedule } from "@/lib/recurring";
import { resumeCharge } from "@/lib/recurring-writes";
import type { PauseMode, ScheduleDraft } from "@/lib/recurring-writes";

import { AmountInput, amountText, FlowDialog } from "../accounts/fields";
import { Pick, useCategoryOptions } from "../transactions/entry-form";
import { StateBadge } from "./all";
import { ScheduleTile, useChargeMoney, useDay, useRepeatText } from "./parts";
import { AccountPick, DayField } from "./schedule-form";
import { CandidateTile } from "./upcoming";

const PAUSE_MODES = ["next", "until", "open"] as const satisfies readonly PauseMode[];
const UNTIL_STEPS = 3;
const UNTIL_FALLBACK_DAYS = 60;

function Shell({ children, onClose, width }: { children: ReactNode; onClose: () => void; width: string }) {
    return (
        <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
            <Dialog.Content className={`app-shell ph-no-capture ${width}`} size="md">
                {children}
            </Dialog.Content>
        </Dialog>
    );
}

function DateText({ label, onChange, value }: { label: string; onChange: (day: string) => void; value: string }) {
    const days = useDay();
    const input = useRef<HTMLInputElement>(null);
    return (
        <span className="relative">
            <button
                className="dash-figure text-muted-foreground hover:text-foreground text-[13px] underline-offset-4 hover:underline"
                onClick={(event) => {
                    event.preventDefault();
                    input.current?.showPicker();
                }}
                type="button"
            >
                {days.day(value, "")}
            </button>
            <input
                aria-label={label}
                className="pointer-events-none absolute inset-0 opacity-0"
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
        </span>
    );
}

export function PauseDialog({
    onClose,
    onPause,
    schedule,
}: {
    onClose: () => void;
    onPause: (mode: PauseMode, until: string) => void;
    schedule: Schedule;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const cash = useChargeMoney();
    const [mode, setMode] = useState<PauseMode>("until");
    const [until, setUntil] = useState(
        () => nextCharges(schedule, ledger, UNTIL_STEPS).at(-1)?.day ?? addDays(ledger.today, UNTIL_FALLBACK_DAYS)
    );
    const name = useId();
    const labels = { next: copy.pause.next, open: copy.pause.open, until: copy.pause.until };
    const trailing = (each: PauseMode) => {
        if (each === "next") {
            return schedule.next ? (
                <span className="dash-figure text-muted-foreground text-[13px]">
                    {days.day(schedule.next.day, ledger.today)}
                </span>
            ) : null;
        }
        return each === "until" ? <DateText label={copy.pause.until.value} onChange={setUntil} value={until} /> : null;
    };
    const resumes = resumeCharge(ledger, schedule, mode, until);
    return (
        <Shell onClose={onClose} width="max-w-[420px]">
            <FlowDialog label={copy.pause.title({ name: schedule.name })}>
                <Dialog.Body className="gap-2">
                    <div aria-label={copy.pause.title({ name: schedule.name }).value} role="radiogroup">
                        {PAUSE_MODES.map((each) => {
                            const on = mode === each;
                            return (
                                <label
                                    className={`mb-2 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 text-sm font-medium transition-colors has-disabled:cursor-default has-disabled:opacity-50 ${on ? "border-app-tint/45 bg-app-tint/10" : "hover:bg-muted/40"}`}
                                    key={each}
                                >
                                    <input
                                        checked={on}
                                        className="accent-app-tint size-4"
                                        disabled={each === "next" && schedule.next === null}
                                        name={name}
                                        onChange={() => setMode(each)}
                                        type="radio"
                                    />
                                    <span className="me-auto">{labels[each]}</span>
                                    {trailing(each)}
                                </label>
                            );
                        })}
                    </div>
                    {schedule.perMonth > 0 ? (
                        <p className="text-muted-foreground text-[13px]">
                            {copy.pause.leaves({ amount: cash.plain(schedule.perMonth) })}
                        </p>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} variant="outline">
                        {copy.cancel}
                    </Button>
                    <Button disabled={mode === "until" && resumes === null} onClick={() => onPause(mode, until)}>
                        {copy.actions.pause}
                    </Button>
                </Dialog.Footer>
            </FlowDialog>
        </Shell>
    );
}

export interface LogOverride {
    accountId: string | null;
    amount: number;
    date: number;
}

export function LogDialog({
    charge,
    onClose,
    onLog,
    onSkip,
    schedule,
}: {
    charge: Charge;
    onClose: () => void;
    onLog: (override: LogOverride) => void;
    onSkip: () => void;
    schedule: Schedule;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const currency = schedule.seed.currency ?? ledger.currency;
    const [day, setDay] = useState(charge.day);
    const [accountId, setAccountId] = useState(schedule.seed.accountId);
    const [text, setText] = useState(() => amountText(schedule.seed.amount, currency));
    const amount = parseAmount(text, decimalsFor(currency));
    const valid = Number.isFinite(amount) && amount > 0;
    const line =
        charge.day === ledger.today ? copy.log.dueToday : copy.log.dueOn({ date: days.day(charge.day, ledger.today) });
    return (
        <Shell onClose={onClose} width="max-w-[440px]">
            <FlowDialog
                head={<ScheduleTile name={schedule.name} seed={schedule.seed} size="md" />}
                label={
                    <span className="flex items-center gap-2.5">
                        {schedule.name}
                        <StateBadge schedule={schedule} />
                    </span>
                }
            >
                <Dialog.Body className="gap-3.5">
                    <p className="text-muted-foreground text-sm">{line}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field invalid={!valid}>
                            <Field.Label>{copy.fields.amount}</Field.Label>
                            <AmountInput
                                currency={currency}
                                label={copy.fields.amount.value}
                                onText={setText}
                                text={text}
                            />
                        </Field>
                        <Field>
                            <Field.Label>{copy.fields.paidOn}</Field.Label>
                            <DayField label={copy.fields.paidOn.value} onChange={setDay} value={day} />
                        </Field>
                    </div>
                    <Field>
                        <Field.Label>{copy.fields.account}</Field.Label>
                        <AccountPick onPick={setAccountId} value={accountId} />
                    </Field>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button className="me-auto" onClick={onSkip} variant="outline">
                        {schedule.due.length > 1
                            ? copy.log.skipAll({ count: String(schedule.due.length) })
                            : copy.log.skip}
                    </Button>
                    <Button onClick={onClose} variant="outline">
                        {copy.cancel}
                    </Button>
                    <Button
                        disabled={!valid}
                        onClick={() => onLog({ accountId, amount, date: fromWall(wallNoon(day), ledger.offsetAt) })}
                    >
                        {copy.actions.logIt}
                    </Button>
                </Dialog.Footer>
            </FlowDialog>
        </Shell>
    );
}

export function DeleteDialog({
    entries,
    onClose,
    onDelete,
    schedule,
}: {
    entries: readonly string[];
    onClose: () => void;
    onDelete: (alsoEntries: boolean) => void;
    schedule: Schedule;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const [also, setAlso] = useState(false);
    const count = entries.length;
    const body = () => {
        if (count === 0) {
            return copy.remove.bodyNone;
        }
        return count === 1 ? copy.remove.bodyOne : copy.remove.body({ count: String(count) });
    };
    return (
        <Shell onClose={onClose} width="max-w-[420px]">
            <FlowDialog label={copy.remove.title({ name: schedule.name })}>
                <Dialog.Body className="gap-3">
                    <p className="text-muted-foreground text-sm">{body()}</p>
                    {count > 0 ? (
                        <label className="flex min-h-8 items-center gap-2.5 text-[13px]">
                            <Checkbox checked={also} onCheckedChange={setAlso} />
                            {count === 1 ? copy.remove.alsoOne : copy.remove.also({ count: String(count) })}
                        </label>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} variant="outline">
                        {copy.cancel}
                    </Button>
                    <Button onClick={() => onDelete(also)} variant="destructive">
                        {copy.actions.delete}
                    </Button>
                </Dialog.Footer>
            </FlowDialog>
        </Shell>
    );
}

const REPEATS = [
    { every: 1, type: RECURRING_TYPE.daily },
    { every: 1, type: RECURRING_TYPE.weekly },
    { every: 2, type: RECURRING_TYPE.weekly },
    { every: 1, type: RECURRING_TYPE.monthly },
    { every: 3, type: RECURRING_TYPE.monthly },
    { every: 1, type: RECURRING_TYPE.yearly },
] as const;

const repeatKey = (type: number, every: number) => `${type}:${every}`;

export function ConfirmDialog({
    candidate,
    onClose,
    onConfirm,
    onDismiss,
}: {
    candidate: Candidate;
    onClose: () => void;
    onConfirm: (linkPast: boolean, changed: ScheduleDraft | null) => void;
    onDismiss: () => void;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const repeat = useRepeatText();
    const categoryOptions = useCategoryOptions(ledger, candidate.income);
    const original = amountText(candidate.amount, candidate.currency);
    const cadenceAtFirst = repeatKey(candidate.type, candidate.every);
    const [text, setText] = useState(original);
    const [cadence, setCadence] = useState(cadenceAtFirst);
    const [day, setDay] = useState(candidate.next.day);
    const [accountId, setAccountId] = useState(candidate.accountId);
    const [categoryId, setCategoryId] = useState(candidate.categoryId);
    const [link, setLink] = useState(true);
    const switchId = useId();
    const amount = parseAmount(text, decimalsFor(candidate.currency));
    const valid = Number.isFinite(amount) && amount > 0 && categoryId !== null;
    const past = candidate.entries.toSorted((a, b) => a.at - b.at);
    const first = past.at(0);
    const last = past.at(-1);
    const known = REPEATS.some((each) => repeatKey(each.type, each.every) === cadenceAtFirst);
    const repeats = known ? [...REPEATS] : [...REPEATS, { every: candidate.every, type: candidate.type }];
    const picked = repeats.find((each) => repeatKey(each.type, each.every) === cadence);
    const changed =
        text !== original ||
        day !== candidate.next.day ||
        accountId !== candidate.accountId ||
        categoryId !== candidate.categoryId ||
        cadence !== cadenceAtFirst;
    const linkText = () => {
        if (!first || !last) {
            return null;
        }
        const from = days.day(first.day, ledger.today);
        return past.length === 1
            ? copy.confirm.linkOne({ from })
            : copy.confirm.link({ count: String(past.length), from, to: days.day(last.day, ledger.today) });
    };
    const confirm = () => {
        const draft: ScheduleDraft | null =
            changed && picked
                ? {
                      accountId,
                      amount,
                      categoryId,
                      currency: candidate.currency,
                      date: fromWall(wallNoon(day), ledger.offsetAt),
                      endDate: null,
                      every: picked.every,
                      income: candidate.income,
                      note: candidate.name,
                      type: picked.type,
                  }
                : null;
        onConfirm(link, draft);
    };
    return (
        <Shell onClose={onClose} width="max-w-md">
            <FlowDialog head={<CandidateTile candidate={candidate} />} label={candidate.name}>
                <Dialog.Body className="gap-3.5">
                    <div className="grid gap-3 gap-y-3.5 sm:grid-cols-2">
                        <Field>
                            <Field.Label>{copy.fields.amount}</Field.Label>
                            <AmountInput
                                currency={candidate.currency}
                                label={copy.fields.amount.value}
                                onText={setText}
                                text={text}
                            />
                        </Field>
                        <Field>
                            <Field.Label>{copy.fields.repeats}</Field.Label>
                            <Pick
                                onPick={setCadence}
                                options={repeats.map((each) => ({
                                    label: repeat.short(each.type, each.every),
                                    value: repeatKey(each.type, each.every),
                                }))}
                                quiet={false}
                                value={cadence}
                            />
                        </Field>
                        <Field>
                            <Field.Label>{copy.columns.nextDate}</Field.Label>
                            <DayField label={copy.columns.nextDate.value} onChange={setDay} value={day} />
                        </Field>
                        <Field>
                            <Field.Label>{copy.fields.account}</Field.Label>
                            <AccountPick onPick={setAccountId} value={accountId} />
                        </Field>
                    </div>
                    <Field>
                        <Field.Label>{copy.fields.category}</Field.Label>
                        <Pick
                            invalid={categoryId === null}
                            onPick={setCategoryId}
                            options={categoryOptions}
                            placeholder={copy.form.pickCategory.value}
                            quiet={false}
                            value={categoryId}
                        />
                    </Field>
                    {past.length > 0 ? (
                        <div className="flex items-center justify-between gap-4 rounded-[10px] border px-4 py-3">
                            <label className="text-[13px]" htmlFor={switchId}>
                                {linkText()}
                            </label>
                            <Switch checked={link} id={switchId} onCheckedChange={setLink} />
                        </div>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button className="me-auto" onClick={onDismiss} variant="outline">
                        {copy.detected.notRecurring}
                    </Button>
                    <Button onClick={onClose} variant="outline">
                        {copy.cancel}
                    </Button>
                    <Button disabled={!valid} onClick={confirm}>
                        {copy.detected.confirm}
                    </Button>
                </Dialog.Footer>
            </FlowDialog>
        </Shell>
    );
}
