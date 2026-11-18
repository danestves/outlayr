import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";

import type { LogMeasure } from "../../../../native/src/domain/log-measure";
import { FlowFigure } from "./amount";
import { AppScreen, SCREEN, useReplica } from "./canvas";
import type { AppTheme } from "./canvas";
import { Fab, NavHeader, TabBar, TOOLBAR_SYMBOLS } from "./chrome";
import {
    accountsOverview,
    categoryStyle,
    DEMO_NOW,
    daySections,
    sparkline,
    upcoming,
    weekAhead,
    weekFigures,
    youOwe,
} from "./ledger";
import type { LogoName } from "./ledger";
import { DayList } from "./list";
import {
    amountHeroLength,
    amountParts,
    currencyFor,
    formatAmount,
    formatSignedAmount,
    formatTrend,
    symbolPrefix,
} from "./money";
import { sparklinePath } from "./sparkline";
import { interpolate } from "./strings";
import type { AppKey } from "./strings";
import { CategoryIconTile } from "./tile";

const GUTTER = 20;
const CONTENT_TOP = 116;
const LIST_BOTTOM = 100;
const SPARK = { height: 42, offset: 23, width: 96 } as const;
const HERO = { advance: 0.62, floor: 24, size: 44 } as const;
const HERO_WIDTH = SCREEN.width - 2 * GUTTER - 12 - SPARK.width;
const SPLIT_SIZE = 15;
const SHELF = { chip: 20, chipOverlap: -8, chips: 3, gap: 10, width: 160 } as const;
const CARD_SHADOW = "0 1px 4px rgba(23, 21, 15, 0.08)";
const SECTION_DAYS = 7;

const MEASURE_WORD = { in: "log.measure.in", net: "log.measure.net", out: "log.measure.out" } as const satisfies Record<
    LogMeasure,
    AppKey
>;

interface Trend {
    change: number;
    good: boolean;
}

function measureTrend(measure: LogMeasure, current: number, before: number): Trend | null {
    if (before === 0) {
        return null;
    }
    const change = (current - before) / Math.abs(before);
    return { change, good: measure === "out" ? change <= 0 : change >= 0 };
}

function HeadMenuLabel({ label }: { label: string }) {
    return (
        <div className="flex-row items-center gap-1 py-2.5">
            <span className="text-muted text-caption truncate font-sans">{label}</span>
            <HugeiconsIcon className="text-muted" icon={ArrowDown01Icon} size={14} strokeWidth={2} />
        </div>
    );
}

function SplitAmount({ magnitude, positive, size }: { magnitude: number; positive: boolean; size: number }) {
    const { locale } = useReplica();
    const parts = amountParts(magnitude, currencyFor(locale), locale);
    return (
        <div className="flex-row items-baseline">
            <FlowFigure className="font-sans-bold text-foreground" size={size}>
                {`${positive ? "+" : "-"}${symbolPrefix(parts.symbol)}${parts.integer}`}
            </FlowFigure>
            {parts.fraction ? (
                <FlowFigure className="font-sans-bold text-muted" flush size={size}>
                    {`${parts.decimal}${parts.fraction}`}
                </FlowFigure>
            ) : null}
        </div>
    );
}

function HeroNumber({ magnitude, positive }: { magnitude: number; positive: boolean }) {
    const { locale } = useReplica();
    const parts = amountParts(magnitude, currencyFor(locale), locale);
    const characters = amountHeroLength(magnitude, parts.minorUnits) + 1 + parts.symbol.length;
    const size = Math.max(HERO.floor, Math.min(HERO.size, Math.floor(HERO_WIDTH / (characters * HERO.advance))));
    return <SplitAmount magnitude={magnitude} positive={positive} size={size} />;
}

function Sparkline({ values }: { values: readonly number[] }) {
    return (
        <div style={{ marginTop: SPARK.offset }}>
            <svg className="text-foreground" height={SPARK.height} width={SPARK.width}>
                <path
                    d={sparklinePath(values, SPARK.width, SPARK.height)}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
}

interface SplitCellProps {
    label: string;
    magnitude: number;
    positive: boolean;
    trend: Trend | null;
}

function SplitCell({ label, magnitude, positive, trend }: SplitCellProps) {
    const { locale } = useReplica();
    return (
        <div className="gap-0.5">
            <span className="font-sans-medium text-footnote text-muted">{label}</span>
            <div className="flex-row flex-wrap items-baseline gap-x-2">
                <SplitAmount magnitude={magnitude} positive={positive} size={SPLIT_SIZE} />
                {trend ? (
                    <span
                        className={`font-sans-medium text-footnote tabular-nums ${trend.good ? "text-income" : "text-expense"}`}
                    >
                        {formatTrend(trend.change, locale)}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function LogInsights({ now }: { now: Date }) {
    const { locale, t } = useReplica();
    const { current, previous } = weekFigures(now);
    const net = current.income - current.expense;
    const trend = measureTrend("net", net, previous.income - previous.expense);
    return (
        <div className="pb-2">
            <div className="flex-row items-center justify-between gap-2 pt-1">
                <HeadMenuLabel label={t("log.head.period.week")} />
                <div className="flex-row items-center">
                    <div className="h-9 w-11 items-center justify-center">
                        <HugeiconsIcon className="text-muted" icon={ViewIcon} size={18} strokeWidth={1.8} />
                    </div>
                    <HeadMenuLabel label={currencyFor(locale)} />
                </div>
            </div>
            <div className="flex-row gap-3 pt-0.5 pb-3">
                <div className="flex-1">
                    <span className="text-muted font-sans-medium text-footnote">{t(MEASURE_WORD.net)}</span>
                    <HeroNumber magnitude={Math.abs(net)} positive={net >= 0} />
                    {trend ? (
                        <span className="text-muted font-sans-medium text-footnote">
                            <span className={`tabular-nums ${trend.good ? "text-income" : "text-expense"}`}>
                                {formatTrend(trend.change, locale)}
                            </span>{" "}
                            {t("log.head.vs.week")}
                        </span>
                    ) : null}
                </div>
                <Sparkline values={sparkline(now, "net")} />
            </div>
            <div className="border-border flex-row border-t py-2.5">
                <div className="flex-1">
                    <SplitCell label={t(MEASURE_WORD.in)} magnitude={current.income} positive trend={null} />
                </div>
                <div className="border-border flex-1 border-l pl-4">
                    <SplitCell
                        label={t(MEASURE_WORD.out)}
                        magnitude={current.expense}
                        positive={false}
                        trend={measureTrend("out", current.expense, previous.expense)}
                    />
                </div>
            </div>
        </div>
    );
}

interface Chip {
    color: string;
    future?: boolean;
    icon: string | null;
    id: string;
    logo?: LogoName | null;
}

interface ShelfCardProps {
    chips?: readonly Chip[];
    figure: string;
    figureClass?: string;
    more?: number;
    title: string;
    unit: string;
}

function ShelfCard({ chips, figure, figureClass = "text-foreground", more = 0, title, unit }: ShelfCardProps) {
    return (
        <div className="bg-card rounded-[20px] px-3 py-2.5" style={{ boxShadow: CARD_SHADOW, width: SHELF.width }}>
            <div className="flex-row items-center justify-between gap-1">
                <span className="text-eyebrow tracking-eyebrow text-muted shrink truncate font-mono uppercase">
                    {title}
                </span>
                <HugeiconsIcon className="text-muted" icon={ArrowRight01Icon} size={14} strokeWidth={2} />
            </div>
            <div className="mt-0.5">
                <span
                    className={`font-sans-semibold text-headline truncate leading-[22px] tabular-nums ${figureClass}`}
                >
                    {figure}
                </span>
            </div>
            <div className="min-h-5 flex-row items-center justify-between gap-1.5">
                <span className="font-sans-medium text-label text-muted shrink truncate">{unit}</span>
                {chips && chips.length > 0 ? (
                    <div className="flex-row items-center gap-1">
                        <div className="flex-row">
                            {chips.map((chip, index) => (
                                <div
                                    className="bg-card rounded-full p-[1.5px]"
                                    key={chip.id}
                                    style={index > 0 ? { marginLeft: SHELF.chipOverlap } : undefined}
                                >
                                    <CategoryIconTile
                                        color={chip.color}
                                        future={chip.future}
                                        icon={chip.icon}
                                        logo={chip.logo}
                                        radius={SHELF.chip / 2}
                                        size={SHELF.chip}
                                    />
                                </div>
                            ))}
                        </div>
                        {more > 0 ? <span className="text-eyebrow text-muted font-mono">{`+${more}`}</span> : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function LogShelf({ now }: { now: Date }) {
    const { locale, t } = useReplica();
    const code = currencyFor(locale);
    const overview = accountsOverview();
    const next = upcoming(now).slice(0, SHELF.chips);
    const due = weekAhead(now);
    return (
        <div
            className="flex-row overflow-hidden"
            style={{ gap: SHELF.gap, marginInline: -GUTTER, paddingBlock: "4px 10px", paddingInline: GUTTER }}
        >
            <ShelfCard
                chips={overview.rows.slice(0, SHELF.chips).map((account) => ({
                    color: account.color,
                    icon: account.icon,
                    id: account.id,
                    logo: account.logo,
                }))}
                figure={formatSignedAmount(overview.total, code, locale)}
                more={overview.rows.length - SHELF.chips}
                title={t("accounts.overview.heading")}
                unit={t("log.shelf.accounts", { count: overview.count })}
            />
            <ShelfCard
                chips={next.map(({ row }) => ({ ...categoryStyle(row.category), future: true, id: row.id }))}
                figure={due === 0 ? formatAmount(0, code, locale) : formatSignedAmount(due, code, locale)}
                figureClass="text-muted"
                title={t("log.upcoming.heading")}
                unit={t("log.shelf.weekAhead")}
            />
            <ShelfCard
                figure={formatSignedAmount(youOwe(), code, locale)}
                title={t("debts.title")}
                unit={t("log.shelf.youOwe")}
            />
        </div>
    );
}

export function logLabel(locale: Locale, now: Date = DEMO_NOW): string {
    const { current } = weekFigures(now);
    const code = currencyFor(locale);
    return interpolate(getIntlayer("appUi", locale).log.label, {
        in: formatAmount(current.income, code, locale),
        net: formatSignedAmount(current.income - current.expense, code, locale),
        out: formatAmount(current.expense, code, locale),
    });
}

export interface LogScreenProps {
    className?: string;
    locale: Locale;
    now?: Date;
    scale?: number;
    scrollY?: number;
    theme: AppTheme;
}

export function LogScreen({ className, locale, now = DEMO_NOW, scale, scrollY = 0, theme }: LogScreenProps) {
    return (
        <AppScreen className={className} label={logLabel(locale, now)} locale={locale} scale={scale} theme={theme}>
            <div
                className="absolute inset-x-0"
                style={{ paddingBottom: LIST_BOTTOM, paddingInline: GUTTER, top: CONTENT_TOP - scrollY }}
            >
                <LogInsights now={now} />
                <LogShelf now={now} />
                <DayList now={now} sections={daySections(now, SECTION_DAYS)} />
            </div>
            <NavHeader end={TOOLBAR_SYMBOLS.filter} start={TOOLBAR_SYMBOLS.search} title="log.title" />
            <Fab />
            <TabBar badges={{ balances: 1 }} selected="log" />
        </AppScreen>
    );
}
