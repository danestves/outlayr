import { addDays, startOfDay } from "@outlayr/money/calendar";
import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";

import type { CanvasProps } from "./canvas";
import { useLedger, useReplica } from "./canvas";
import { dayMonth } from "./dates";
import { savedRows } from "./entry-state";
import { DEMO_NOW } from "./ledger";
import { appTranslator, interpolate } from "./strings";
import {
    BOTTOM_INSET,
    CategoryMark,
    Clock,
    Compact,
    CONTENT_TOP,
    GLYPHS,
    Glyph,
    GRID,
    Hairline,
    Kicker,
    kickerWidth,
    Mono,
    MonoFit,
    NavTitle,
    SAFE_INSET,
    ScrollIndicator,
    ToolbarButton,
    WATCH_SIZE,
    WatchFragment,
} from "./watch-parts";
import { demoEntry, entryDisplay, entryUnits, formatUnits, recentCategories, watchSnapshot } from "./watch-snapshot";
import type { AmountEntry, WatchCategory, WatchEntry, WatchMoney, WatchSnapshot } from "./watch-snapshot";
import { clamp01 } from "./widget-props";

const SCROLL_PAD = 6;
const SCROLL_WIDTH = WATCH_SIZE.width - 2 * (SAFE_INSET + SCROLL_PAD);
const AMOUNT_PAD = 2;
const AMOUNT_WIDTH = WATCH_SIZE.width - 2 * (SAFE_INSET + AMOUNT_PAD);
const BACKSPACE = { height: 30, width: 34 } as const;
const KEY_ROWS = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
] as const;
const ROW_GAP = 8;
const SPACER_MIN = 6;
const MARK_FRAME = 20;
const STACK_GAP = 4;

interface WatchProps extends CanvasProps {
    now?: Date;
    snapshot?: WatchSnapshot;
    withSaved?: boolean;
}

interface EntryProps extends WatchProps {
    entry?: AmountEntry;
}

interface DayGroup {
    entries: WatchEntry[];
    header: string | null;
}

function dayGroups(snapshot: WatchSnapshot, now: Date): DayGroup[] {
    const today = startOfDay(now).getTime();
    const yesterday = startOfDay(addDays(now, -1)).getTime();
    const headerOf = (entry: WatchEntry) => {
        const day = startOfDay(new Date(entry.at)).getTime();
        if (day === today) {
            return null;
        }
        return day === yesterday ? snapshot.labels.yesterday : entry.date;
    };
    const groups: DayGroup[] = [];
    for (const entry of snapshot.entries) {
        const header = headerOf(entry);
        const last = groups.at(-1);
        if (last?.header === header) {
            last.entries.push(entry);
        } else {
            groups.push({ entries: [entry], header });
        }
    }
    return groups;
}

function EntryRow({ entry }: { entry: WatchEntry }) {
    const amount = `${entry.income ? "+" : "−"}${entry.amount}`;
    return (
        <div>
            <div style={{ alignItems: "center", flexDirection: "row", gap: ROW_GAP, paddingBlock: 7 }}>
                <CategoryMark color={entry.color} frame={MARK_FRAME} />
                <Compact size={16}>{entry.note === "" ? entry.category : entry.note}</Compact>
                <div style={{ flexGrow: 1, minWidth: SPACER_MIN }} />
                <MonoFit
                    available={SCROLL_WIDTH - MARK_FRAME - 3 * ROW_GAP - SPACER_MIN}
                    color={entry.income ? GRID.income : GRID.ink}
                    minScale={0.7}
                    size={15}
                    text={amount}
                />
            </div>
            <Hairline />
        </div>
    );
}

function PaceBar({ elapsed, over, spent }: { elapsed: number; over: boolean; spent: number }) {
    return (
        <div style={{ height: 8, justifyContent: "center" }}>
            <div style={{ background: GRID.hairline, height: 2 }} />
            <div
                style={{
                    background: over ? GRID.over : GRID.ink,
                    height: 2,
                    left: 0,
                    position: "absolute",
                    top: 3,
                    width: SCROLL_WIDTH * clamp01(spent),
                }}
            />
            <div
                style={{
                    background: GRID.accent,
                    height: 8,
                    left: SCROLL_WIDTH * clamp01(elapsed) - 1,
                    position: "absolute",
                    top: 0,
                    width: 2,
                }}
            />
        </div>
    );
}

function BudgetBlock({ budget, spent }: { budget: WatchSnapshot["budget"]; spent: string }) {
    return (
        <div style={{ gap: 6, paddingBlock: 4 }}>
            <div style={{ alignItems: "baseline", flexDirection: "row", gap: ROW_GAP }}>
                <MonoFit
                    available={SCROLL_WIDTH - ROW_GAP - kickerWidth(budget.remainingCaption)}
                    color={budget.over ? GRID.over : GRID.ink}
                    minScale={0.6}
                    size={24}
                    text={budget.remaining}
                />
                <Kicker>{budget.remainingCaption}</Kicker>
            </div>
            <PaceBar elapsed={budget.elapsedFraction} over={budget.over} spent={budget.spentFraction} />
            <Kicker>{`${budget.percent} ${spent} · ${budget.isOverall ? budget.periodLabel : budget.name}`}</Kicker>
        </div>
    );
}

function TodayBody({ now, snapshot }: { now: Date; snapshot: WatchSnapshot }) {
    return (
        <div
            style={{
                gap: 8,
                left: SAFE_INSET + SCROLL_PAD,
                position: "absolute",
                right: SAFE_INSET + SCROLL_PAD,
                top: CONTENT_TOP.toolbar,
            }}
        >
            <Kicker>{`${snapshot.todayLabel} · ${snapshot.dateLabel}`}</Kicker>
            <MonoFit
                available={SCROLL_WIDTH}
                color={GRID.ink}
                medium
                minScale={0.5}
                size={40}
                text={snapshot.todaySpent}
            />
            {snapshot.budget.present ? <BudgetBlock budget={snapshot.budget} spent={snapshot.labels.spent} /> : null}
            <div style={{ paddingTop: 4 }}>
                <Hairline />
                {dayGroups(snapshot, now).map((group) => (
                    <div key={group.header ?? ""}>
                        {group.header === null ? null : (
                            <div style={{ paddingBottom: 2, paddingTop: 10 }}>
                                <Kicker>{group.header}</Kicker>
                            </div>
                        )}
                        {group.entries.map((entry) => (
                            <EntryRow entry={entry} key={entry.id} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function useSnapshot({ locale, now = DEMO_NOW, snapshot, withSaved = false }: WatchProps): WatchSnapshot {
    const ledger = useLedger();
    return snapshot ?? watchSnapshot(ledger, now, locale, withSaved ? savedRows(ledger) : []);
}

export function WatchToday({ now = DEMO_NOW, snapshot, withSaved, ...canvas }: WatchProps) {
    const data = useSnapshot({ ...canvas, now, snapshot, withSaved });
    const label = interpolate(getIntlayer("appUi", canvas.locale).labels.watchToday, {
        caption: data.budget.remainingCaption.toLowerCase(),
        date: dayMonth(now, canvas.locale, appTranslator(canvas.locale)),
        percent: data.budget.percent,
        remaining: data.budget.remaining,
        spent: data.todaySpent,
    });
    return (
        <WatchFragment {...canvas} label={label}>
            <TodayBody now={now} snapshot={data} />
            <ScrollIndicator />
            <Clock centered now={now} />
            <ToolbarButton fill={GRID.paper} side="trailing">
                <Glyph color={GRID.inkOnPaper} {...GLYPHS.plus} />
            </ToolbarButton>
        </WatchFragment>
    );
}

function Key({ children, fill = GRID.key }: { children: ReactNode; fill?: string }) {
    return (
        <div style={{ alignItems: "center", background: fill, borderRadius: 10, flex: 1, justifyContent: "center" }}>
            {children}
        </div>
    );
}

function AmountBody({ entry, money }: { entry: AmountEntry; money: WatchMoney }) {
    const shown = entryDisplay(entry, money);
    const empty = entryUnits(entry, money) === 0;
    return (
        <div
            style={{
                bottom: BOTTOM_INSET,
                gap: STACK_GAP,
                left: SAFE_INSET + AMOUNT_PAD,
                position: "absolute",
                right: SAFE_INSET + AMOUNT_PAD,
                top: CONTENT_TOP.toolbar,
            }}
        >
            <div style={{ alignItems: "center", flexDirection: "row", gap: STACK_GAP }}>
                <div style={{ flexGrow: 1, flexShrink: 1 }}>
                    <MonoFit
                        available={AMOUNT_WIDTH - STACK_GAP - BACKSPACE.width}
                        color={GRID.ink}
                        ghost={shown.ghost}
                        medium
                        minScale={0.5}
                        size={30}
                        text={shown.typed}
                    />
                </div>
                <div style={{ alignItems: "center", justifyContent: "center", ...BACKSPACE }}>
                    <Glyph color={GRID.muted} {...GLYPHS.deleteLeft} />
                </div>
            </div>
            {KEY_ROWS.map((row) => (
                <div key={row.join("")} style={{ flex: 1, flexDirection: "row", gap: STACK_GAP }}>
                    {row.map((digit) => (
                        <Key key={digit}>
                            <Mono color={GRID.ink} medium size={20}>
                                {digit}
                            </Mono>
                        </Key>
                    ))}
                </div>
            ))}
            <div style={{ flex: 1, flexDirection: "row", gap: STACK_GAP }}>
                {money.minorUnits > 0 ? (
                    <Key>
                        <Mono color={GRID.muted} medium size={20}>
                            {money.decimal}
                        </Mono>
                    </Key>
                ) : (
                    <div style={{ flex: 1 }} />
                )}
                <Key>
                    <Mono color={GRID.ink} medium size={20}>
                        0
                    </Mono>
                </Key>
                <div style={{ flex: 1, opacity: empty ? 0.4 : 1 }}>
                    <Key fill={GRID.paper}>
                        <Glyph color={GRID.inkOnPaper} {...GLYPHS.checkmark} />
                    </Key>
                </div>
            </div>
        </div>
    );
}

export function WatchAmount({ entry: given, now = DEMO_NOW, snapshot, withSaved, ...canvas }: EntryProps) {
    const { money } = useSnapshot({ ...canvas, now, snapshot, withSaved });
    const ledger = useLedger();
    const entry = given ?? demoEntry(ledger);
    const label = interpolate(getIntlayer("appUi", canvas.locale).labels.watchAmount, {
        amount: formatUnits(money, entryUnits(entry, money)),
    });
    return (
        <WatchFragment {...canvas} label={label}>
            <AmountBody entry={entry} money={money} />
            <ToolbarButton side="leading">
                <Glyph color="#fff" {...GLYPHS.xmark} />
            </ToolbarButton>
            <Clock now={now} />
        </WatchFragment>
    );
}

function CategoryRow({ category }: { category: WatchCategory }) {
    return (
        <div>
            <div style={{ alignItems: "center", flexDirection: "row", gap: 10, paddingBlock: 11 }}>
                <CategoryMark color={category.color} frame={22} />
                <Compact size={17}>{category.name}</Compact>
                <div style={{ flexGrow: 1 }} />
            </div>
            <Hairline />
        </div>
    );
}

function CategoryBody({ snapshot }: { snapshot: WatchSnapshot }) {
    const recents = recentCategories(snapshot);
    const recentIds = new Set(recents.map((category) => category.id));
    const sections = [
        { categories: recents, name: snapshot.labels.recent },
        {
            categories: snapshot.categories.filter((category) => !category.income && !recentIds.has(category.id)),
            name: snapshot.labels.all,
        },
        { categories: snapshot.categories.filter((category) => category.income), name: snapshot.labels.income },
    ].filter((section) => section.categories.length > 0);
    return (
        <div
            style={{
                left: SAFE_INSET + SCROLL_PAD,
                position: "absolute",
                right: SAFE_INSET + SCROLL_PAD,
                top: CONTENT_TOP.titled,
            }}
        >
            {sections.map((section) => (
                <div key={section.name}>
                    <div style={{ paddingBottom: 4, paddingTop: 10 }}>
                        <Kicker>{section.name}</Kicker>
                    </div>
                    <Hairline />
                    {section.categories.map((category) => (
                        <CategoryRow category={category} key={category.id} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function WatchCategory({ entry: given, now = DEMO_NOW, snapshot, withSaved, ...canvas }: EntryProps) {
    const data = useSnapshot({ ...canvas, now, snapshot, withSaved });
    const ledger = useLedger();
    const entry = given ?? demoEntry(ledger);
    const amount = formatUnits(data.money, entryUnits(entry, data.money));
    const label = interpolate(getIntlayer("appUi", canvas.locale).labels.watchCategory, {
        amount,
        recent: recentCategories(data)
            .map((category) => category.name)
            .join(", "),
    });
    return (
        <WatchFragment {...canvas} label={label}>
            <CategoryBody snapshot={data} />
            <ScrollIndicator />
            <ToolbarButton side="leading">
                <Glyph color="#fff" {...GLYPHS.chevronLeft} />
            </ToolbarButton>
            <Clock now={now} />
            <NavTitle>{amount}</NavTitle>
        </WatchFragment>
    );
}

function WaitingBody() {
    const { locale } = useReplica();
    return (
        <div
            style={{
                bottom: BOTTOM_INSET,
                gap: 10,
                justifyContent: "center",
                left: SAFE_INSET + 8,
                position: "absolute",
                right: SAFE_INSET + 8,
                top: CONTENT_TOP.bare,
            }}
        >
            <Kicker>Outlayr</Kicker>
            <Compact size={16} wraps>
                {getIntlayer("appUi", locale).labels.watch.waiting}
            </Compact>
        </div>
    );
}

export function WatchWaiting({ now = DEMO_NOW, ...canvas }: Omit<WatchProps, "withSaved" | "snapshot">) {
    const label = interpolate(getIntlayer("appUi", canvas.locale).labels.watchWaiting, {
        message: getIntlayer("appUi", canvas.locale).labels.watch.waiting,
    });
    return (
        <WatchFragment {...canvas} label={label}>
            <WaitingBody />
            <Clock now={now} />
        </WatchFragment>
    );
}

const SCREENS = {
    amount: WatchAmount,
    category: WatchCategory,
    today: WatchToday,
    waiting: WatchWaiting,
};

export type WatchScreenKind = keyof typeof SCREENS;

export function WatchScreen({
    screen,
    withSaved,
    ...canvas
}: CanvasProps & Pick<WatchProps, "withSaved"> & { screen: WatchScreenKind }) {
    if (screen === "waiting") {
        return <WatchWaiting {...canvas} />;
    }
    const Screen = SCREENS[screen];
    return <Screen {...canvas} withSaved={withSaved} />;
}
