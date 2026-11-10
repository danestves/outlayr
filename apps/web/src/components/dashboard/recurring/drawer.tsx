import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import PauseIcon from "@hugeicons/core-free-icons/PauseIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Sheet } from "panelui-web/sheet";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { nextCharges } from "@/lib/recurring";
import type { HistoryEntry, RecurringModel, Schedule } from "@/lib/recurring";

import { Glyph } from "../accounts/glyph";
import { useCatalog } from "../home/catalog";
import { useWide } from "../insights/use-wide";
import { CategoryBadge } from "../rules/parts";
import { HeldBadge, nextDayOf } from "./all";
import type { ScheduleActions } from "./menu";
import { ScheduleMenu } from "./menu";
import { ScheduleTile, useAccountName, useChargeMoney, useDay, useRepeatText } from "./parts";
import { heldSince } from "./paused";

const HISTORY_MONTHS = 6;
const NEXT_SHOWN = 3;
const CENT = 0.005;

function Row({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className="flex min-h-[53px] items-center gap-3 border-b text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto flex min-w-0 items-center gap-2 text-right">{children}</span>
        </div>
    );
}

function Section({ children, title }: { children: ReactNode; title: ReactNode }) {
    return (
        <section className="mt-6">
            <h3 className="text-muted-foreground mb-1.5 text-[13px] font-medium">{title}</h3>
            {children}
        </section>
    );
}

const monthsEnding = (month: string, count: number) =>
    Array.from({ length: count }, (_, index) => {
        const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - count + index, 1));
        return date.toISOString().slice(0, 7);
    });

function HistoryBars({ entries, months }: { entries: readonly HistoryEntry[]; months: readonly string[] }) {
    const totals = months.map((month) =>
        entries.filter((entry) => entry.day.startsWith(month)).reduce((sum, entry) => sum + entry.worth, 0)
    );
    const max = Math.max(...totals, 0);
    const lastFilled = totals.findLastIndex((total) => total > 0);
    return (
        <div aria-hidden className="flex h-14 items-end gap-1.5">
            {totals.map((total, index) => (
                <i
                    className={`flex-1 rounded-[3px] ${index === lastFilled ? "bg-primary" : "bg-muted"}`}
                    key={months[index]}
                    style={{ height: max > 0 && total > 0 ? `${Math.max(0.2, total / max) * 100}%` : "6%" }}
                />
            ))}
        </div>
    );
}

function Body({
    actions,
    model,
    onClose,
    onStep,
    schedule,
}: {
    actions: ScheduleActions;
    model: RecurringModel;
    onClose: () => void;
    onStep: ((by: 1 | -1) => void) | null;
    schedule: Schedule;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const catalog = useCatalog(ledger);
    const navigate = useNavigate();
    const days = useDay();
    const repeat = useRepeatText();
    const cash = useChargeMoney();
    const accountName = useAccountName();
    const { chain, seed, state } = schedule;
    const dayText = (day: string) => days.day(day, ledger.today);
    const next = nextDayOf(schedule, ledger.today);
    const history = (model.history.get(schedule.id) ?? []).toSorted((a, b) => b.at - a.at);
    const months = monthsEnding(ledger.today.slice(0, 7), HISTORY_MONTHS);
    const recent = history.filter((entry) => entry.day >= `${months[0]}-01`);
    const account = catalog.account(seed.accountId);
    const repeats = repeat.short(chain.type, chain.every);
    const subtitle = () => {
        if (state === "paused") {
            return copy.drawer.paused({ repeats });
        }
        if (state === "stopped") {
            return copy.drawer.ended({ date: dayText(heldSince(model, schedule)), repeats });
        }
        return next === null ? repeats : copy.drawer.next({ date: dayText(next), repeats });
    };
    const shown = state === "paused" ? history : recent;
    return (
        <>
            <Sheet.Header className="flex-row items-center gap-1 border-b">
                <Sheet.Title className="me-auto text-base">{copy.drawer.title}</Sheet.Title>
                {onStep ? (
                    <>
                        <Button
                            aria-label={copy.drawer.previousItem.value}
                            className="text-muted-foreground"
                            onClick={() => onStep(-1)}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <Glyph icon={ArrowUp01Icon} size={17} />
                        </Button>
                        <Button
                            aria-label={copy.drawer.nextItem.value}
                            className="text-muted-foreground"
                            onClick={() => onStep(1)}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <Glyph icon={ArrowDown01Icon} size={17} />
                        </Button>
                    </>
                ) : null}
                <ScheduleMenu actions={actions} schedule={schedule} />
                <Button
                    aria-label={copy.close.value}
                    className="text-muted-foreground"
                    onClick={onClose}
                    size="icon-sm"
                    variant="ghost"
                >
                    <Glyph icon={Cancel01Icon} size={17} />
                </Button>
            </Sheet.Header>
            <Sheet.Body className="pb-6">
                <div className="flex items-center gap-4 pt-1">
                    <ScheduleTile name={schedule.name} seed={seed} size="xl" />
                    <div className="min-w-0">
                        <p className="flex items-center gap-2.5">
                            <span className="truncate text-base font-semibold">{schedule.name}</span>
                            {state === "active" ? null : <HeldBadge state={state} />}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">{subtitle()}</p>
                    </div>
                </div>
                <p className="dash-figure mt-4 mb-3 text-[28px] leading-9 font-semibold tracking-[-0.04em]">
                    {cash.signed(schedule.worth, seed.income)}
                </p>
                <Row label={copy.fields.category}>
                    <CategoryBadge id={seed.categoryId} />
                </Row>
                {seed.accountId === null ? null : (
                    <Row label={copy.fields.account}>
                        {account ? <AccountTile account={account} size="sm" /> : null}
                        <span className="truncate">{accountName(seed.accountId)}</span>
                    </Row>
                )}
                {state === "paused" ? (
                    <>
                        <Row label={copy.fields.pausedSince}>
                            <span className="dash-figure">{dayText(heldSince(model, schedule))}</span>
                        </Row>
                        <Row label={copy.fields.resumes}>
                            <span className="dash-figure">
                                {schedule.pause?.resumes ? dayText(schedule.pause.resumes) : copy.paused.whenIResume}
                            </span>
                        </Row>
                    </>
                ) : (
                    <>
                        <Row label={copy.fields.repeats}>
                            {repeat.long(chain.type, chain.every, next ?? schedule.startDay)}
                        </Row>
                        <Row label={copy.fields.ending}>
                            {chain.endDay === null ? (
                                copy.form.never
                            ) : (
                                <span className="dash-figure">{dayText(chain.endDay)}</span>
                            )}
                        </Row>
                    </>
                )}
                <Row label={copy.fields.perMonth}>
                    <span className="dash-figure">{cash.plain(schedule.perMonth)}</span>
                </Row>
                {state === "active" ? (
                    <Section title={copy.fields.nextCharges}>
                        {nextCharges(schedule, ledger, NEXT_SHOWN).map((charge) => (
                            <div className="flex h-11 items-center border-b text-sm last:border-0" key={charge.day}>
                                <span className="dash-figure">{dayText(charge.day)}</span>
                                <span className="dash-figure text-muted-foreground ml-auto">
                                    {cash.plain(schedule.worth)}
                                </span>
                            </div>
                        ))}
                    </Section>
                ) : null}
                <Section title={state === "paused" ? copy.drawer.historyAll : copy.drawer.history}>
                    {state === "paused" ? null : <HistoryBars entries={recent} months={months} />}
                    {shown.length === 0 ? (
                        <p className="text-muted-foreground py-3 text-[13px]">{copy.drawer.noHistory}</p>
                    ) : null}
                    {state !== "paused" && shown.length > 0 ? (
                        <div className="text-muted-foreground flex h-10 items-center text-sm">
                            {shown.length === 1 ? copy.chargesOne : copy.charges({ count: String(shown.length) })}
                            <span className="dash-figure text-foreground ml-auto font-medium">
                                {cash.plain(shown.reduce((sum, entry) => sum + entry.worth, 0))}
                            </span>
                        </div>
                    ) : null}
                    {shown.map((entry, index) => {
                        const older = shown[index + 1];
                        const change = older ? entry.worth - older.worth : 0;
                        return (
                            <div className="flex h-11 items-center gap-3 border-b text-sm last:border-0" key={entry.id}>
                                <span className="dash-figure">{dayText(entry.day)}</span>
                                {Math.abs(change) > CENT ? (
                                    <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
                                        {change > 0
                                            ? copy.drawer.priceUp({ amount: cash.plain(change) })
                                            : copy.drawer.priceDown({ amount: cash.plain(-change) })}
                                    </span>
                                ) : null}
                                <span className="dash-figure ml-auto">{cash.signed(entry.worth, seed.income)}</span>
                            </div>
                        );
                    })}
                </Section>
            </Sheet.Body>
            <Sheet.Footer className="flex-row items-center gap-2 border-t pt-4">
                {state === "stopped" ? null : (
                    <Button onClick={() => actions.edit(schedule)} variant="outline">
                        <Glyph icon={PencilEdit01Icon} size={16} />
                        {copy.actions.edit}
                    </Button>
                )}
                {state === "active" ? (
                    <Button onClick={() => actions.pause(schedule)} variant="outline">
                        <Glyph icon={PauseIcon} size={16} />
                        {copy.actions.pause}
                    </Button>
                ) : (
                    <Button
                        onClick={() => (state === "paused" ? actions.resume(schedule) : actions.restart(schedule))}
                        variant="outline"
                    >
                        <Glyph icon={PlayIcon} size={16} />
                        {state === "paused" ? copy.actions.resume : copy.actions.restart}
                    </Button>
                )}
                <Button
                    className="ml-auto"
                    onClick={() => navigate({ search: { q: schedule.name }, to: "/app/transactions" })}
                    variant="outline"
                >
                    {copy.drawer.allEntries}
                </Button>
            </Sheet.Footer>
        </>
    );
}

export function ScheduleDrawer({
    actions,
    model,
    onClose,
    onStep,
    schedule,
}: {
    actions: ScheduleActions;
    model: RecurringModel;
    onClose: () => void;
    onStep: ((by: 1 | -1) => void) | null;
    schedule: Schedule | null;
}) {
    const wide = useWide();
    const [shown, setShown] = useState(schedule);
    if (schedule && schedule !== shown) {
        setShown(schedule);
    }
    return (
        <Sheet
            onOpenChange={(open) => (open ? undefined : onClose())}
            open={schedule !== null}
            side={wide ? "right" : "bottom"}
        >
            <Sheet.Content
                className={`app-shell ph-no-capture ${wide ? "sm:w-[min(500px,calc(100vw-2*var(--sheet-gap)))]" : ""}`}
                showGrabber={false}
                size={wide ? "auto" : "full"}
            >
                {shown ? (
                    <Body actions={actions} model={model} onClose={onClose} onStep={onStep} schedule={shown} />
                ) : null}
            </Sheet.Content>
        </Sheet>
    );
}
