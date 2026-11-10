import { decimalsFor } from "@outlayr/money/currency";
import { fromWall, wallNoon } from "@outlayr/money/ledger-zone";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Radio, RadioGroup } from "panelui-web/radio-group";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { parseAmount } from "@/lib/account-writes";
import { addDays } from "@/lib/recurring";
import type { Candidate, Charge, Schedule } from "@/lib/recurring";
import { resumeCharge } from "@/lib/recurring-writes";
import type { PauseMode } from "@/lib/recurring-writes";

import { AmountInput, amountText, FlowDialog } from "../accounts/fields";
import { ScheduleTile, useChargeMoney, useDay } from "./parts";
import { DayField } from "./schedule-form";
import { CandidateTile } from "./upcoming";

const PAUSE_MODES = ["next", "until", "open"] as const satisfies readonly PauseMode[];

function Shell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
    return (
        <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
            <Dialog.Content className="app-shell ph-no-capture" size="sm">
                {children}
            </Dialog.Content>
        </Dialog>
    );
}

function Head({ line, schedule }: { line: ReactNode; schedule: Pick<Schedule, "name" | "seed"> }) {
    return (
        <div className="flex items-center gap-3">
            <ScheduleTile name={schedule.name} seed={schedule.seed} size="lg" />
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{schedule.name}</p>
                <p className="text-muted-foreground truncate text-[13px]">{line}</p>
            </div>
        </div>
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
    const [mode, setMode] = useState<PauseMode>(schedule.next ? "next" : "open");
    const [until, setUntil] = useState(() => addDays(ledger.today, 30));
    const resume = resumeCharge(ledger, schedule, mode, until);
    const modes = [
        { label: copy.pause.next, mode: "next" as const, off: schedule.next === null },
        { label: copy.pause.until, mode: "until" as const, off: false },
        { label: copy.pause.open, mode: "open" as const, off: false },
    ];
    return (
        <Shell onClose={onClose}>
            <FlowDialog label={copy.pause.title({ name: schedule.name })}>
                <Dialog.Body className="gap-4">
                    <RadioGroup
                        aria-label={copy.pause.title({ name: schedule.name }).value}
                        className="gap-0 rounded-xl border"
                        onValueChange={(next) => setMode(PAUSE_MODES.find((each) => each === next) ?? mode)}
                        value={mode}
                    >
                        {modes.map((each) => (
                            <label
                                className="flex min-h-12 cursor-pointer items-center gap-3 border-b px-4 text-sm last:border-0 has-disabled:cursor-default has-disabled:opacity-50"
                                key={each.mode}
                            >
                                <Radio disabled={each.off} value={each.mode} />
                                <span className="me-auto">{each.label}</span>
                                {each.mode === mode && resume ? (
                                    <span className="dash-figure text-muted-foreground text-[13px]">
                                        {copy.fields.resumes} {days.day(resume.day, ledger.today)}
                                    </span>
                                ) : null}
                            </label>
                        ))}
                    </RadioGroup>
                    {mode === "until" ? (
                        <Field>
                            <Field.Label>{copy.fields.resumes}</Field.Label>
                            <DayField label={copy.fields.resumes.value} onChange={setUntil} value={until} />
                        </Field>
                    ) : null}
                    {schedule.perMonth > 0 ? (
                        <p className="text-muted-foreground text-[13px]">
                            {copy.pause.leaves({ amount: cash.plain(schedule.perMonth) })}
                        </p>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} variant="secondary">
                        {copy.cancel}
                    </Button>
                    <Button onClick={() => onPause(mode, until)}>{copy.actions.pause}</Button>
                </Dialog.Footer>
            </FlowDialog>
        </Shell>
    );
}

export interface LogOverride {
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
    const [day, setDay] = useState(charge.day > ledger.today ? charge.day : ledger.today);
    const [text, setText] = useState(() => amountText(schedule.seed.amount, currency));
    const amount = parseAmount(text, decimalsFor(currency));
    const valid = Number.isFinite(amount) && amount > 0;
    const line =
        charge.day === ledger.today ? copy.log.dueToday : copy.log.dueOn({ date: days.day(charge.day, ledger.today) });
    return (
        <Shell onClose={onClose}>
            <FlowDialog label={copy.actions.logIt}>
                <Dialog.Body className="gap-4">
                    <Head line={line} schedule={schedule} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <Field.Label>{copy.fields.paidOn}</Field.Label>
                            <DayField label={copy.fields.paidOn.value} onChange={setDay} value={day} />
                        </Field>
                        <Field invalid={!valid}>
                            <Field.Label>{copy.fields.amount}</Field.Label>
                            <AmountInput
                                currency={currency}
                                label={copy.fields.amount.value}
                                onText={setText}
                                text={text}
                            />
                        </Field>
                    </div>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button className="me-auto" onClick={onSkip} variant="ghost">
                        {copy.log.skip}
                    </Button>
                    <Button onClick={onClose} variant="secondary">
                        {copy.cancel}
                    </Button>
                    <Button
                        disabled={!valid}
                        onClick={() => onLog({ amount, date: fromWall(wallNoon(day), ledger.offsetAt) })}
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
        <Shell onClose={onClose}>
            <FlowDialog label={copy.remove.title({ name: schedule.name })}>
                <Dialog.Body className="gap-4">
                    <p className="text-muted-foreground text-sm">{body()}</p>
                    {count > 0 ? (
                        <label className="flex items-center gap-2 text-[13px] font-medium">
                            <Checkbox checked={also} onCheckedChange={setAlso} />
                            {count === 1 ? copy.remove.alsoOne : copy.remove.also({ count: String(count) })}
                        </label>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} variant="secondary">
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

export function ConfirmDialog({
    candidate,
    onClose,
    onConfirm,
}: {
    candidate: Candidate;
    onClose: () => void;
    onConfirm: (linkPast: boolean) => void;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const cash = useChargeMoney();
    const [link, setLink] = useState(true);
    const past = candidate.entries.toSorted((a, b) => a.at - b.at).slice(0, -1);
    const first = past.at(0);
    const last = past.at(-1);
    const dayText = (day: string) => days.day(day, ledger.today);
    const linkText = () => {
        if (!first || !last) {
            return null;
        }
        return past.length === 1
            ? copy.confirm.linkOne({ from: dayText(first.day) })
            : copy.confirm.link({ count: String(past.length), from: dayText(first.day), to: dayText(last.day) });
    };
    return (
        <Shell onClose={onClose}>
            <FlowDialog label={copy.detected.confirm}>
                <Dialog.Body className="gap-4">
                    <div className="flex items-center gap-3">
                        <CandidateTile candidate={candidate} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{candidate.name}</p>
                            <p className="dash-figure text-muted-foreground truncate text-[13px]">
                                {copy.detected.since({
                                    amount: cash.plain(candidate.total),
                                    month: days.month(candidate.since.slice(0, 7)),
                                })}
                            </p>
                        </div>
                    </div>
                    {past.length > 0 ? (
                        <label className="flex items-center gap-2 text-[13px] font-medium">
                            <Checkbox checked={link} onCheckedChange={setLink} />
                            {linkText()}
                        </label>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} variant="secondary">
                        {copy.cancel}
                    </Button>
                    <Button onClick={() => onConfirm(link && past.length > 0)}>{copy.detected.confirm}</Button>
                </Dialog.Footer>
            </FlowDialog>
        </Shell>
    );
}
