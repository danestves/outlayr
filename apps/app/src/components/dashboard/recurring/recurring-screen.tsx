import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import TickDouble02Icon from "@hugeicons/core-free-icons/TickDouble02Icon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { decimalsFor } from "@outlayr/money/currency";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Kpi } from "panelui-web/kpi";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { monthEvents, upcomingOf } from "@/lib/recurring";
import type { Candidate, Charge, RecurringModel, Schedule } from "@/lib/recurring";
import {
    confirmedCandidate,
    createdSchedule,
    deletedSchedule,
    dismissedCandidate,
    editedSchedule,
    loggedAgain,
    loggedCharge,
    pausedSchedule,
    restartedSchedule,
    resumedSchedule,
    skippedDue,
    stoppedSchedule,
} from "@/lib/recurring-writes";
import type { ScheduleDraft } from "@/lib/recurring-writes";

import { Glyph } from "../accounts/glyph";
import { KpiBand, Trend } from "../accounts/parts";
import { QuietTable } from "../home/setup";
import { csvOf } from "../transactions/model";
import { AllTable, nextDayOf } from "./all";
import { CalendarGrid, CalendarSide } from "./calendar";
import { useRecurringData, useRecurringWrites } from "./data";
import type { RecurringData, RecurringWrites } from "./data";
import { CandidateDetail, DetectedEmpty, DetectedTable } from "./detected";
import { ConfirmDialog, DeleteDialog, LogDialog, PauseDialog } from "./dialogs";
import { ScheduleDrawer } from "./drawer";
import type { ScheduleActions } from "./menu";
import { LivePhotos, useCategoryLook, useDay, useRepeatText } from "./parts";
import { PausedTable } from "./paused";
import { ScheduleForm } from "./schedule-form";
import { NEW_SCHEDULE, RECURRING_TABS, dayOf, monthOf, sortOf, tabOf } from "./search";
import type { RecurringSearch, RecurringTab, SetRecurringSearch } from "./search";
import { DetectedCard, PerMonthCard, UpcomingTable } from "./upcoming";

type Dialogs =
    | { candidate: Candidate; kind: "confirm" }
    | { charge: Charge; kind: "log"; schedule: Schedule }
    | { kind: "pause"; schedule: Schedule }
    | { kind: "remove"; schedule: Schedule };

const now = () => Date.now();

const MIN_CHANGE = 0.05;

const SIDE_TABS = new Set<RecurringTab>(["calendar", "upcoming"]);

function download(name: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}

function Figure({
    children,
    label,
    muted,
    sub,
}: {
    children: ReactNode;
    label: ReactNode;
    muted: boolean;
    sub?: ReactNode;
}) {
    return (
        <Kpi className="gap-0">
            <Kpi.Header>
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value
                className={`dash-figure mt-1 truncate leading-[30px] font-semibold tracking-[-0.04em] ${muted ? "text-muted-foreground" : ""}`}
            >
                {children}
            </Kpi.Value>
            <div className="text-muted-foreground mt-2 flex h-5 min-w-0 items-center gap-2 truncate text-xs">{sub}</div>
        </Kpi>
    );
}

const FLAT_CHIP = "dash-figure bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium";

function Kpis({ data, tab }: { data: RecurringData; tab: RecurringTab }) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const days = useDay();
    const { kpis } = data;
    const cash = (amount: number) => money(amount, ledger.currency);
    const muted = data.model.schedules.length === 0 && data.model.candidates.length === 0;
    const second =
        tab === "detected" ? (
            <Figure
                label={copy.kpi.ifConfirmed}
                muted={muted}
                sub={
                    <>
                        <span className={FLAT_CHIP}>{`+${cash(kpis.detected)}`}</span>
                        {copy.kpi.aMonth}
                    </>
                }
            >
                {cash(kpis.perMonth + kpis.detected)}
            </Figure>
        ) : (
            <Figure
                label={days.month(ledger.today.slice(0, 7))}
                muted={muted}
                sub={kpis.monthCount === 1 ? copy.chargesOne : copy.charges({ count: String(kpis.monthCount) })}
            >
                {cash(kpis.month)}
            </Figure>
        );
    const dueBadges = (
        <>
            {kpis.missed > 0 ? (
                <Badge className="h-6 rounded-md px-2 text-xs font-medium tracking-normal" variant="destructive">
                    {copy.kpi.missed({ count: String(kpis.missed) })}
                </Badge>
            ) : null}
            {kpis.today > 0 ? (
                <Badge
                    className="bg-app-warn/14 text-app-warn h-6 rounded-md px-2 text-xs font-medium tracking-normal"
                    variant="secondary"
                >
                    {copy.kpi.today({ count: String(kpis.today) })}
                </Badge>
            ) : null}
        </>
    );
    const third =
        tab === "paused" ? (
            <Figure label={copy.kpi.pausedSaves} muted={muted} sub={copy.kpi.aMonth}>
                {cash(kpis.pausedSaves)}
            </Figure>
        ) : (
            <Figure label={copy.kpi.dueNow} muted={muted} sub={kpis.due > 0 ? dueBadges : copy.kpi.nothingDue}>
                {cash(kpis.due)}
            </Figure>
        );
    return (
        <KpiBand>
            <Figure
                label={copy.kpi.perMonth}
                muted={muted}
                sub={
                    <>
                        {kpis.change === null || Math.abs(kpis.change) < MIN_CHANGE ? null : (
                            <Trend goodWhenUp={false} value={kpis.change}>
                                {`${kpis.change > 0 ? "+" : "-"}${Math.abs(kpis.change).toFixed(1)}%`}
                            </Trend>
                        )}
                        {copy.kpi.ofIncome({ share: String(kpis.ofIncome ?? 0) })}
                    </>
                }
            >
                {cash(kpis.perMonth)}
            </Figure>
            {second}
            {third}
            <Figure
                label={copy.kpi.detected}
                muted={muted}
                sub={
                    kpis.detectedCount > 0
                        ? copy.kpi.toConfirm({ count: String(kpis.detectedCount) })
                        : copy.kpi.nothingToConfirm
                }
            >
                {cash(kpis.detected)}
            </Figure>
        </KpiBand>
    );
}

function Count({ pill, value }: { pill: boolean; value: number }) {
    if (pill) {
        return <Tabs.Badge className="dash-figure">{value}</Tabs.Badge>;
    }
    return <span className="dash-figure text-muted-foreground text-xs">{value}</span>;
}

function Empty({ onAdd }: { onAdd: () => void }) {
    const copy = useIntlayer("dashboard-recurring");
    const navigate = useNavigate();
    return (
        <div className="dash-empty relative isolate h-full min-h-[299px]">
            <QuietTable />
            <b className="text-[15px] font-semibold">{copy.empty.title}</b>
            <p className="text-muted-foreground max-w-sm text-[13px]">{copy.empty.line}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button onClick={onAdd}>
                    <Glyph icon={Add01Icon} size={17} />
                    {copy.add}
                </Button>
                <Button onClick={() => navigate({ to: "/settings/data" })} variant="outline">
                    <Glyph icon={Upload04Icon} size={16} />
                    {copy.empty.import}
                </Button>
            </div>
        </div>
    );
}

const unique = (schedules: readonly Schedule[]) => [...new Map(schedules.map((each) => [each.id, each])).values()];

function useExport(data: RecurringData) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const repeat = useRepeatText();
    const categoryLook = useCategoryLook();
    return () => {
        const header = [
            copy.columns.name.value,
            copy.columns.repeats.value,
            copy.columns.nextDate.value,
            copy.columns.amount.value,
            copy.columns.perMonth.value,
            copy.columns.category.value,
            copy.columns.account.value,
        ];
        const rows = data.model.schedules.map((schedule) => [
            schedule.name,
            repeat.short(schedule.chain.type, schedule.chain.every),
            schedule.state === "active" ? (nextDayOf(schedule, ledger.today) ?? "") : copy.badge[schedule.state].value,
            (schedule.seed.income ? schedule.worth : -schedule.worth).toFixed(decimalsFor(ledger.currency)),
            schedule.perMonth.toFixed(2),
            categoryLook(schedule.seed.categoryId)?.name ?? "",
            schedule.seed.accountId === null
                ? ""
                : (ledger.books.accounts.find((row) => row.localId === schedule.seed.accountId)?.name ?? ""),
        ]);
        download(`${copy.exportFile.value}-${ledger.today}.csv`, csvOf([header, ...rows]));
    };
}

interface ScreenProps {
    data: RecurringData;
    search: RecurringSearch;
    setSearch: SetRecurringSearch;
    writes: RecurringWrites;
}

function ScreenDialogs({
    dialog,
    model,
    onClose,
    onRemoved,
    writes,
}: {
    dialog: Dialogs;
    model: RecurringModel;
    onClose: () => void;
    onRemoved: (id: string) => void;
    writes: RecurringWrites;
}) {
    const { toast } = useIntlayer("dashboard-recurring");
    return (
        <>
            {dialog?.kind === "pause" ? (
                <PauseDialog
                    onClose={onClose}
                    onPause={(mode, until) => {
                        writes.run(
                            toast.paused({ name: dialog.schedule.name }).value,
                            pausedSchedule(writes.current(), dialog.schedule, mode, until, now())
                        );
                        onClose();
                    }}
                    schedule={dialog.schedule}
                />
            ) : null}
            {dialog?.kind === "log" ? (
                <LogDialog
                    charge={dialog.charge}
                    onClose={onClose}
                    onLog={(override) => {
                        writes.run(
                            toast.logged({ name: dialog.schedule.name }).value,
                            loggedCharge(writes.current(), dialog.schedule, dialog.charge, override, now())
                        );
                        onClose();
                    }}
                    onSkip={() => {
                        writes.run(
                            toast.skipped({ name: dialog.schedule.name }).value,
                            skippedDue(writes.current(), dialog.schedule, now())
                        );
                        onClose();
                    }}
                    schedule={dialog.schedule}
                />
            ) : null}
            {dialog?.kind === "remove" ? (
                <DeleteDialog
                    entries={(model.history.get(dialog.schedule.id) ?? []).map((entry) => entry.id)}
                    onClose={onClose}
                    onDelete={(also) => {
                        const entries = also
                            ? (model.history.get(dialog.schedule.id) ?? []).map((entry) => entry.id)
                            : [];
                        writes.run(
                            toast.deleted({ name: dialog.schedule.name }).value,
                            deletedSchedule(writes.current(), dialog.schedule, entries, now())
                        );
                        onRemoved(dialog.schedule.id);
                        onClose();
                    }}
                    schedule={dialog.schedule}
                />
            ) : null}
            {dialog?.kind === "confirm" ? (
                <ConfirmDialog
                    candidate={dialog.candidate}
                    onClose={onClose}
                    onConfirm={(linkPast, changed) => {
                        writes.run(
                            toast.confirmed({ name: dialog.candidate.name }).value,
                            confirmedCandidate(writes.current(), dialog.candidate, linkPast, now(), changed)
                        );
                        onClose();
                    }}
                    onDismiss={() => {
                        writes.run(toast.dismissed({ name: dialog.candidate.name }).value, {
                            book: dismissedCandidate(dialog.candidate.key),
                            rows: [],
                        });
                        onClose();
                    }}
                />
            ) : null}
        </>
    );
}

export function RecurringScreen({ data, search, setSearch, writes }: ScreenProps) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const exportCsv = useExport(data);
    const [dialog, setDialog] = useState<Dialogs | null>(null);
    const { model } = data;
    const tab = tabOf(search);
    const month = monthOf(search, ledger.today);
    const { toast } = copy;
    const close = () => setDialog(null);

    const byId = new Map(model.schedules.map((schedule) => [schedule.id, schedule]));
    const opened = tab === "detected" || search.item === undefined ? null : (byId.get(search.item) ?? null);
    const editing = search.edit === undefined ? null : (byId.get(search.edit) ?? null);
    const formOpen = search.edit === NEW_SCHEDULE || editing !== null;
    const { candidates } = model;
    const picked =
        tab === "detected" ? (candidates.find((each) => each.key === search.item) ?? candidates.at(0) ?? null) : null;

    const order = (): readonly Schedule[] => {
        if (tab === "upcoming") {
            return unique(upcomingOf(model, ledger).map((row) => row.schedule));
        }
        if (tab === "calendar") {
            return unique(monthEvents(model, ledger, month).map((event) => event.schedule));
        }
        if (tab === "paused") {
            return model.schedules.filter((schedule) => schedule.state !== "active");
        }
        return model.schedules;
    };
    const list = opened ? order() : [];
    const at = opened ? list.findIndex((each) => each.id === opened.id) : -1;
    const step =
        list.length > 1 && at !== -1
            ? (by: 1 | -1) => {
                  const next = list[(at + by + list.length) % list.length];
                  if (next) {
                      setSearch({ item: next.id }, { replace: true });
                  }
              }
            : null;

    const actions: ScheduleActions = {
        confirm: (candidate) => setDialog({ candidate, kind: "confirm" }),
        dismiss: (candidate) =>
            writes.run(toast.dismissed({ name: candidate.name }).value, {
                book: dismissedCandidate(candidate.key),
                rows: [],
            }),
        edit: (schedule) => setSearch({ edit: schedule.id }),
        log: (schedule, charge) => setDialog({ charge, kind: "log", schedule }),
        logAgain: (schedule) =>
            writes.run(toast.logged({ name: schedule.name }).value, loggedAgain(writes.current(), schedule, now())),
        open: (schedule) => setSearch({ item: schedule.id }),
        pause: (schedule) => setDialog({ kind: "pause", schedule }),
        remove: (schedule) => setDialog({ kind: "remove", schedule }),
        restart: (schedule) =>
            writes.run(
                toast.restarted({ name: schedule.name }).value,
                restartedSchedule(writes.current(), schedule, now())
            ),
        resume: (schedule) =>
            writes.run(
                toast.resumed({ name: schedule.name }).value,
                resumedSchedule(writes.current(), schedule, now())
            ),
        stop: (schedule) => writes.run(toast.stopped({ name: schedule.name }).value, stoppedSchedule(schedule, now())),
    };

    const save = (schedule: Schedule | null, draft: ScheduleDraft) => {
        const name = draft.note.trim();
        if (schedule) {
            writes.run(toast.saved({ name }).value, editedSchedule(writes.current(), schedule, draft, now()));
        } else {
            writes.run(toast.added({ name }).value, createdSchedule(writes.current(), draft, now()));
        }
        setSearch({ edit: null });
    };
    const confirmAll = () => {
        const current = writes.current();
        const stamp = now();
        const rows = candidates.flatMap((candidate) => confirmedCandidate(current, candidate, true, stamp));
        writes.run(toast.confirmedAll({ count: String(candidates.length) }).value, rows);
        setSearch({ item: null });
    };

    const fresh = model.schedules.length === 0 && candidates.length === 0;
    const paused = model.schedules.filter((schedule) => schedule.state !== "active").length;
    const badges: Record<RecurringTab, number | null> = {
        all: model.schedules.length,
        calendar: null,
        detected: candidates.length,
        paused,
        upcoming: null,
    };
    const tabs = (
        <Tabs
            className="min-w-0 flex-1"
            onValueChange={(value) =>
                setSearch({ day: null, item: null, tab: value === "upcoming" ? null : String(value) })
            }
            value={tab}
            variant="underline"
        >
            <Tabs.List aria-label={copy.title.value}>
                {RECURRING_TABS.map((each) => (
                    <Tabs.Trigger key={each} value={each}>
                        {copy.tabs[each]}
                        {badges[each] === null ? null : (
                            <Count pill={each === "detected" && badges[each] > 0} value={badges[each]} />
                        )}
                    </Tabs.Trigger>
                ))}
                {tab === "detected" && candidates.length > 1 ? (
                    <Button className="ml-auto self-center" onClick={confirmAll} size="sm" variant="ghost">
                        <Glyph icon={TickDouble02Icon} size={15} />
                        {copy.detected.confirmAll}
                    </Button>
                ) : null}
            </Tabs.List>
        </Tabs>
    );

    const calendar = {
        actions,
        day: dayOf(search),
        model,
        month,
        onDay: (day: string) => setSearch({ day: search.day === day ? null : day }, { replace: true }),
        onMonth: (next: string | null) => setSearch({ day: null, month: next }, { replace: true }),
    };
    const body = () => {
        if (fresh && (tab === "upcoming" || tab === "all")) {
            return <Empty onAdd={() => setSearch({ edit: NEW_SCHEDULE })} />;
        }
        if (tab === "calendar") {
            return <CalendarGrid {...calendar} />;
        }
        if (tab === "all") {
            return (
                <AllTable actions={actions} model={model} search={search} setSearch={setSearch} sort={sortOf(search)} />
            );
        }
        if (tab === "detected") {
            return candidates.length === 0 ? (
                <DetectedEmpty />
            ) : (
                <DetectedTable
                    actions={actions}
                    candidates={candidates}
                    onSelect={(key) => setSearch({ item: key }, { replace: true })}
                    selected={picked?.key ?? null}
                />
            );
        }
        if (tab === "paused") {
            return <PausedTable actions={actions} lit={opened?.id ?? null} model={model} />;
        }
        return <UpcomingTable actions={actions} model={model} />;
    };
    const side = SIDE_TABS.has(tab) && !fresh;
    const hugs = tab === "detected" && picked !== null;

    return (
        <main className="@container flex h-[calc(100dvh-52px-env(safe-area-inset-top))] min-w-0 flex-col px-4 pb-5 sm:px-6 lg:h-dvh">
            <div className="flex min-h-16 flex-wrap items-center gap-2 py-3">
                <h1 className="mr-auto text-lg leading-6 font-semibold tracking-[-0.02em]">{copy.title}</h1>
                {fresh ? null : (
                    <>
                        <Button onClick={exportCsv} variant="outline">
                            <Glyph icon={Download01Icon} size={16} />
                            <span className="max-sm:hidden">{copy.export}</span>
                        </Button>
                        <Button onClick={() => setSearch({ edit: NEW_SCHEDULE })}>
                            <Glyph icon={Add01Icon} size={17} />
                            {copy.add}
                        </Button>
                    </>
                )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:overflow-visible">
                {tab === "calendar" ? null : <Kpis data={data} tab={tab} />}
                <div className="flex min-h-0 flex-1 gap-4 max-lg:flex-col">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                        <Frame
                            className={`flex min-w-0 flex-col ${hugs ? "max-h-[50%] shrink-0" : "min-h-0 flex-1"}`}
                            variant="plain"
                        >
                            <Frame.Panel className="min-h-0 flex-1 rounded-2xl">
                                <div className="border-border border-b">{tabs}</div>
                                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{body()}</div>
                            </Frame.Panel>
                        </Frame>
                        {hugs ? <CandidateDetail candidate={picked} /> : null}
                    </div>
                    {side ? (
                        <aside className="flex min-h-0 shrink-0 flex-col gap-4 overflow-y-auto lg:w-[300px]">
                            {tab === "calendar" ? (
                                <CalendarSide {...calendar} />
                            ) : (
                                <>
                                    <DetectedCard
                                        actions={actions}
                                        model={model}
                                        onSeeAll={() => setSearch({ item: null, tab: "detected" })}
                                    />
                                    <PerMonthCard model={model} />
                                </>
                            )}
                        </aside>
                    ) : null}
                </div>
            </div>
            <ScheduleDrawer
                actions={actions}
                model={model}
                onClose={() => setSearch({ item: null })}
                onStep={step}
                schedule={opened}
            />
            <ScheduleForm
                onClose={() => setSearch({ edit: null })}
                onSave={save}
                onStop={(schedule) => {
                    actions.stop(schedule);
                    setSearch({ edit: null });
                }}
                target={formOpen ? { key: search.edit ?? NEW_SCHEDULE, schedule: editing } : null}
            />
            {dialog ? (
                <ScreenDialogs
                    dialog={dialog}
                    model={model}
                    onClose={close}
                    onRemoved={(id) => (search.item === id ? setSearch({ item: null }) : undefined)}
                    writes={writes}
                />
            ) : null}
        </main>
    );
}

export function LiveRecurring({ search, setSearch }: Pick<ScreenProps, "search" | "setSearch">) {
    const data = useRecurringData();
    return (
        <LivePhotos model={data.model}>
            <RecurringScreen data={data} search={search} setSearch={setSearch} writes={useRecurringWrites()} />
        </LivePhotos>
    );
}
