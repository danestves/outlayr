import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { decimalsFor } from "@outlayr/money/currency";
import {
    aboveTypical,
    editorMonths,
    firstShortRun,
    isShort,
    monthKeyParts,
    overPlan,
    projectYear,
    trimEffect,
    trimMonths,
    withPlannedMonths,
} from "@outlayr/money/year-plan";
import type { EditorMonth, MonthKey, MonthProjection } from "@outlayr/money/year-plan";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Select } from "panelui-web/select";
import { useId, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { FlowDialog } from "@/components/dashboard/accounts/fields";
import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { FOOTER_PILL, LABEL, MoneyField, POPUP, plainAmount } from "@/components/dashboard/debts/fields";
import { useBox } from "@/components/dashboard/insights/use-box";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { parseAmount } from "@/lib/account-writes";
import { plannedMonths } from "@/lib/budget-writes";
import { ledgerBooks } from "@/lib/ledger-db";

import type { BudgetFlow } from "./flow-context";
import { Dot, Note, OK, TINT, useMoney } from "./parts";
import { planStep, useYearPlan } from "./plan-model";
import type { PlanCategoryMeta, YearPlan } from "./plan-model";
import { usePlanMonths, usePlanName, useShortRunSentence } from "./plan-parts";

const CHART_HEIGHT = 170;
const BASELINE = CHART_HEIGHT - 22;
const PLOT = CHART_HEIGHT - 30;
const COLUMN_GAP = 10;
const AXIS_HEADROOM = 1.25;
const TYPICAL_HEADROOM = 1.5;
const TRIM_FLOOR = 0.4;

type PlanFlow = Extract<BudgetFlow, { kind: "plan" }>;
type TrimFlow = Extract<BudgetFlow, { kind: "trim" }>;

const yearOf = (key: MonthKey) => monthKeyParts(key).year;

function useLetters() {
    const months = usePlanMonths();
    return (key: MonthKey) => months.short(key).charAt(0);
}

function PlanChart({
    actuals,
    axisTop,
    color,
    label,
    months,
    onPick,
    onValue,
    selected,
    step,
}: {
    actuals: ReadonlyMap<MonthKey, number>;
    axisTop: number;
    color: string;
    label: string;
    months: readonly EditorMonth[];
    onPick: (key: MonthKey) => void;
    onValue: (key: MonthKey, value: number) => void;
    selected: MonthKey | null;
    step: number;
}) {
    const [ref, { width }] = useBox();
    const letter = useLetters();
    const names = usePlanMonths();
    const dragging = useRef<MonthKey | null>(null);
    const column = width / months.length;
    const barWidth = Math.max(0, column - COLUMN_GAP);
    const y = (value: number) => BASELINE - (Math.min(value, axisTop) / axisTop) * PLOT;
    const valueAt = (offsetY: number) => {
        const raw = ((BASELINE - offsetY) / PLOT) * axisTop;
        return Math.min(Math.floor(axisTop / step) * step, Math.max(0, Math.round(raw / step) * step));
    };
    const monthAt = (offsetX: number) => months[Math.min(months.length - 1, Math.max(0, Math.floor(offsetX / column)))];
    const press = (event: ReactPointerEvent<SVGSVGElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        const month = monthAt(event.clientX - box.left);
        if (!month || month.locked) {
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = month.key;
        onPick(month.key);
        onValue(month.key, valueAt(event.clientY - box.top));
    };
    const drag = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (dragging.current === null) {
            return;
        }
        const box = event.currentTarget.getBoundingClientRect();
        onValue(dragging.current, valueAt(event.clientY - box.top));
    };
    const release = () => {
        dragging.current = null;
    };
    return (
        <div className="relative" ref={ref}>
            {width > 0 ? (
                <svg
                    aria-label={label}
                    className="block touch-none overflow-visible select-none"
                    height={CHART_HEIGHT}
                    onPointerCancel={release}
                    onPointerDown={press}
                    onPointerMove={drag}
                    onPointerUp={release}
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the months over it are focusable, so it is a group.
                    role="group"
                    width={width}
                >
                    {months.map((month, index) => {
                        const x = index * column + COLUMN_GAP / 2;
                        const actual = actuals.get(month.key);
                        const planned = month.locked ? month.planned : month.value;
                        const active = month.key === selected;
                        const top = y(planned);
                        return (
                            <g className={month.locked ? undefined : "cursor-ns-resize"} key={month.key}>
                                {actual === undefined ? null : (
                                    <rect
                                        fill={`color-mix(in oklab, ${color} 34%, transparent)`}
                                        height={BASELINE - y(actual)}
                                        rx={3}
                                        width={barWidth}
                                        x={x}
                                        y={y(actual)}
                                    />
                                )}
                                {planned > 0 || active ? (
                                    <rect
                                        fill="none"
                                        height={Math.max(0, BASELINE - top - 1)}
                                        rx={3}
                                        stroke={active ? TINT : "var(--color-muted-foreground)"}
                                        strokeDasharray={actual === undefined ? "3 3" : undefined}
                                        strokeOpacity={actual === undefined || active ? 1 : 0.35}
                                        strokeWidth={active ? 2 : 1}
                                        width={Math.max(0, barWidth - 1)}
                                        x={x + 0.5}
                                        y={top + 0.5}
                                    />
                                ) : null}
                                <text
                                    className="dash-figure"
                                    fill={active ? "var(--color-foreground)" : "var(--color-muted-foreground)"}
                                    fontSize={11}
                                    textAnchor="middle"
                                    x={x + barWidth / 2}
                                    y={CHART_HEIGHT - 4}
                                >
                                    {letter(month.key)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            ) : (
                <div style={{ height: CHART_HEIGHT }} />
            )}
            <div className="absolute inset-x-0 top-0 flex" style={{ height: CHART_HEIGHT }}>
                {months.map((month) => (
                    <button
                        aria-label={names.month(month.key)}
                        aria-pressed={month.key === selected}
                        className="pointer-events-none flex-1 rounded-sm opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--color-app-tint)]"
                        disabled={month.locked}
                        key={month.key}
                        onClick={() => onPick(month.key)}
                        type="button"
                    />
                ))}
            </div>
        </div>
    );
}

interface Choice {
    color: string;
    id: string;
    name: string;
}

function PlanCategoryPick({ choices, onPick }: { choices: readonly Choice[]; onPick: (id: string) => void }) {
    const { dialog } = useIntlayer("dashboard-budgets-plan");
    return (
        <Field>
            <Field.Label className={LABEL}>{dialog.category}</Field.Label>
            <Select
                items={choices.map((choice) => ({ label: choice.name, value: choice.id }))}
                onValueChange={(next) => next !== null && onPick(next)}
                value={null}
            >
                <Select.Trigger aria-label={dialog.category.value}>
                    <Select.Value placeholder={dialog.choose.value} />
                </Select.Trigger>
                <Select.Content className={POPUP}>
                    {choices.map((choice) => (
                        <Select.Item icon={<Dot color={choice.color} />} key={choice.id} value={choice.id}>
                            {choice.name}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </Field>
    );
}

function actualsOf(months: readonly MonthProjection[], categoryId: string) {
    const actuals = new Map<MonthKey, number>();
    for (const month of months) {
        if (month.status !== "ahead") {
            const entry = month.categories.find((candidate) => candidate.categoryId === categoryId);
            actuals.set(month.key, entry?.actual ?? 0);
        }
    }
    return actuals;
}

function PlanEditor({
    flow,
    meta,
    onClose,
    plan,
}: {
    flow: PlanFlow;
    meta: PlanCategoryMeta;
    onClose: () => void;
    plan: YearPlan;
}) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { dialog } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const months = usePlanMonths();
    const planName = usePlanName();
    const shortRun = useShortRunSentence();
    const formId = useId();
    const { input, projection } = plan;
    const { year } = projection;
    const categoryId = meta.id;
    const opened = useMemo(() => editorMonths(projection, categoryId), [categoryId, projection]);
    const editable = opened.filter((month) => !month.locked);
    const typical = projection.typical.get(categoryId) ?? null;
    const [values, setValues] = useState(() => new Map(opened.map((month) => [month.key, month.value])));
    const [selected, setSelected] = useState<MonthKey | null>(
        () => (editable.find((month) => month.key >= flow.month) ?? editable[0])?.key ?? null
    );
    const [text, setText] = useState(() =>
        selected === null ? "" : plainAmount(values.get(selected) ?? 0, ledger.currency)
    );
    const [same, setSame] = useState(false);
    const [axisTop] = useState(() =>
        Math.max(
            10,
            ...opened.map((month) => Math.max(month.value, month.planned) * AXIS_HEADROOM),
            (typical ?? 0) * TYPICAL_HEADROOM
        )
    );
    const step = planStep(axisTop);
    const decimals = decimalsFor(ledger.currency);
    const current = opened.map((month) => ({ ...month, value: values.get(month.key) ?? month.value }));
    const write = (key: MonthKey, value: number) =>
        setValues((last) => {
            const next = new Map(last);
            for (const month of same ? editable : editable.filter((each) => each.key === key)) {
                next.set(month.key, value);
            }
            return next;
        });
    const pick = (key: MonthKey) => {
        setSelected(key);
        setText(plainAmount(values.get(key) ?? 0, ledger.currency));
    };
    const changed = new Map<MonthKey, number>();
    for (const month of editable) {
        const value = values.get(month.key) ?? month.value;
        if (value !== month.value || month.source !== "plan") {
            changed.set(month.key, value);
        }
    }
    const after = projectYear(withPlannedMonths(input, categoryId, changed));
    const high = aboveTypical(current, typical);
    const over = overPlan(opened);
    const run = shortRun(after, plan.categories);
    const selectedIndex = selected === null ? -1 : editable.findIndex((month) => month.key === selected);
    const canCopy = selectedIndex !== -1 && selectedIndex < editable.length - 1;
    const copyForward = () => {
        if (selected === null) {
            return;
        }
        const value = values.get(selected) ?? 0;
        setValues((last) => {
            const next = new Map(last);
            for (const month of editable.slice(selectedIndex)) {
                next.set(month.key, value);
            }
            return next;
        });
    };
    const save = () => {
        onClose();
        if (changed.size === 0) {
            return;
        }
        const rows = plannedMonths(ledgerBooks(db), categoryId, ledger.currency, changed, Date.now());
        void committer.commit(rows, { failed: dialog.failed.value });
    };
    return (
        <FlowDialog
            head={<Dot color={meta.color} size={10} />}
            label={dialog.planTitle({ name: planName(meta), year })}
        >
            <Dialog.Body>
                <form
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <div className="text-muted-foreground mb-2 flex items-center justify-between text-[13px]">
                        <span>{dialog.outlines}</span>
                        {typical === null ? null : (
                            <span className="dash-figure">{dialog.typical({ amount: money(typical) })}</span>
                        )}
                    </div>
                    <PlanChart
                        actuals={actualsOf(projection.months, categoryId)}
                        axisTop={axisTop}
                        color={meta.color}
                        label={dialog.chart({ name: planName(meta) }).value}
                        months={current}
                        onPick={pick}
                        onValue={(key, value) => {
                            write(key, value);
                            setText(plainAmount(value, ledger.currency));
                        }}
                        selected={selected}
                        step={step}
                    />
                    {selected === null ? null : (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <Field>
                                <Field.Label>{months.month(selected)}</Field.Label>
                                <MoneyField
                                    currency={ledger.currency}
                                    label={months.month(selected)}
                                    onText={(next) => {
                                        setText(next);
                                        write(selected, next.trim() === "" ? 0 : Math.abs(parseAmount(next, decimals)));
                                    }}
                                    text={text}
                                />
                            </Field>
                            <Field>
                                <Field.Label>{dialog.fill}</Field.Label>
                                <Button disabled={!canCopy} onClick={copyForward} type="button" variant="outline">
                                    {dialog.copyForward({ month: months.month(selected) })}
                                </Button>
                            </Field>
                        </div>
                    )}
                </form>
                <div className="mt-3.5">
                    {high ? (
                        <Note icon={ArrowUpRight01Icon}>
                            {dialog.aboveTypical({ amount: money(high.by), month: months.month(high.key) })}
                        </Note>
                    ) : null}
                    {over ? (
                        <Note icon={Alert02Icon}>
                            {dialog.overPlan({ amount: money(over.by), month: months.month(over.key) })}
                        </Note>
                    ) : null}
                    {run ? <Note icon={Calendar03Icon}>{run}</Note> : null}
                </div>
            </Dialog.Body>
            <Dialog.Footer>
                <Button
                    aria-pressed={same}
                    className={`me-auto ${FOOTER_PILL} ${same ? "ring-2 ring-[var(--color-app-tint)]" : ""}`}
                    onClick={() => {
                        const next = !same;
                        setSame(next);
                        if (next && selected !== null) {
                            const value = values.get(selected) ?? 0;
                            setValues(
                                (last) => new Map([...last, ...editable.map((month) => [month.key, value] as const)])
                            );
                        }
                    }}
                    variant="secondary"
                >
                    {dialog.same}
                </Button>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {dialog.cancel}
                </Button>
                <Button className={FOOTER_PILL} form={formId} type="submit">
                    {dialog.save({ year })}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

function PlanDialog({ flow, onClose }: { flow: PlanFlow; onClose: () => void }) {
    const { dialog } = useIntlayer("dashboard-budgets-plan");
    const planName = usePlanName();
    const plan = useYearPlan(yearOf(flow.month));
    const [categoryId, setCategoryId] = useState(flow.categoryId);
    const meta = categoryId === null ? undefined : plan.categories.get(categoryId);
    if (meta) {
        return <PlanEditor flow={flow} key={meta.id} meta={meta} onClose={onClose} plan={plan} />;
    }
    const choices = [...plan.categories.values()]
        .filter((each) => each.plannable && each.income === flow.income)
        .map((each) => ({ color: each.color, id: each.id, name: planName(each) }))
        .toSorted((a, b) => a.name.localeCompare(b.name));
    return (
        <FlowDialog label={flow.income ? dialog.addIncomeTitle : dialog.addTitle}>
            <Dialog.Body>
                <PlanCategoryPick choices={choices} onPick={setCategoryId} />
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {dialog.cancel}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

const plannedOf = (month: MonthProjection | undefined, categoryId: string) =>
    month?.categories.find((entry) => entry.categoryId === categoryId)?.planned ?? 0;

function TrimDialog({ flow, onClose }: { flow: TrimFlow; onClose: () => void }) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { dialog } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const months = usePlanMonths();
    const planName = usePlanName();
    const formId = useId();
    const plan = useYearPlan(yearOf(flow.month));
    const { input, projection } = plan;
    const { categoryId } = flow;
    const meta = plan.categories.get(categoryId);
    const open = projection.months.filter((month) => month.status !== "closed");
    const fromKey = open[0]?.key ?? flow.month;
    const viewed = open.find((month) => month.key >= flow.month) ?? open[0];
    const was = plannedOf(viewed, categoryId);
    const [opening] = useState(() => {
        const run = firstShortRun(projection);
        const viewedKey = viewed?.key ?? fromKey;
        const through = run && run.to >= viewedKey ? run.to : viewedKey;
        const deficit = Math.max(
            0,
            ...open.filter((month) => month.key <= through && isShort(month)).map((month) => -month.left)
        );
        const step = planStep(was);
        // Closing a large gap from one category would suggest zero; a trim someone would accept keeps some of it.
        const floor = Math.floor((was * TRIM_FLOOR) / step) * step;
        return { amount: Math.max(floor, Math.floor((was - deficit) / step) * step), through };
    });
    const [text, setText] = useState(() => plainAmount(opening.amount, ledger.currency));
    const amount = text.trim() === "" ? 0 : Math.abs(parseAmount(text, decimalsFor(ledger.currency)));
    const { through } = opening;
    const effect = useMemo(
        () => trimEffect(input, projection, categoryId, amount, fromKey, through),
        [amount, categoryId, fromKey, input, projection, through]
    );
    const saves = was - amount;
    const ready = saves > 0;
    const month = months.month(through);
    const name = planName(meta);
    const save = () => {
        if (!ready) {
            return;
        }
        onClose();
        const rows = plannedMonths(
            ledgerBooks(db),
            categoryId,
            ledger.currency,
            trimMonths(fromKey, through, amount),
            Date.now()
        );
        void committer.commit(rows, { failed: dialog.failed.value });
    };
    const [first] = effect.fixed;
    return (
        <FlowDialog label={dialog.trimTitle({ month, name })}>
            <Dialog.Body>
                <form
                    id={formId}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <Field>
                        <Field.Label>{dialog.trimTo}</Field.Label>
                        <MoneyField
                            autoFocus
                            currency={ledger.currency}
                            label={dialog.trimTo.value}
                            onText={setText}
                            text={text}
                        />
                    </Field>
                </form>
                <div className="my-3.5 grid grid-cols-2 overflow-hidden rounded-xl border">
                    <div className="px-3.5 py-3">
                        <div className="text-muted-foreground text-[13px]">{dialog.was}</div>
                        <div className="dash-figure mt-0.5 text-sm font-medium">{money(was)}</div>
                    </div>
                    <div className="border-s px-3.5 py-3">
                        <div className="text-muted-foreground text-[13px]">{dialog.saves}</div>
                        <div
                            className="dash-figure mt-0.5 text-sm font-medium"
                            style={{ color: saves > 0 ? OK : undefined }}
                        >
                            {money(Math.max(0, saves))}
                        </div>
                    </div>
                </div>
                {first !== undefined && effect.fixed.length === 1 ? (
                    <Note icon={Tick02Icon} iconTone="text-app-income">
                        {dialog.fixes({ month: months.month(first) })}
                    </Note>
                ) : null}
                {effect.fixed.length > 1 ? (
                    <Note icon={Tick02Icon} iconTone="text-app-income">
                        {dialog.fixesMany({ count: effect.fixed.length })}
                    </Note>
                ) : null}
                {effect.stillShort ? (
                    <Note icon={Alert02Icon}>{dialog.stillShort({ amount: money(effect.stillShort.by) })}</Note>
                ) : null}
                {effect.fixed.length === 0 && !effect.stillShort && open.some(isShort) && ready ? (
                    <Note icon={Alert02Icon}>{dialog.notEnough}</Note>
                ) : null}
            </Dialog.Body>
            <Dialog.Footer>
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {dialog.cancel}
                </Button>
                <Button
                    className={`${ready ? "" : "opacity-50"} ${FOOTER_PILL}`}
                    disabled={!ready}
                    form={formId}
                    type="submit"
                >
                    {dialog.trimConfirm({ amount: money(amount), month })}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function PlanDialogs({ flow, onClose }: { flow: BudgetFlow; onClose: () => void }) {
    if (flow.kind === "plan") {
        return <PlanDialog flow={flow} onClose={onClose} />;
    }
    if (flow.kind === "trim") {
        return <TrimDialog flow={flow} onClose={onClose} />;
    }
    return null;
}
