import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { BUDGET_TYPE, periodsBackTo } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";
import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";
import type { CSSProperties, ReactNode } from "react";

import add from "../../../../native/assets/toolbar-symbols/add.svg?url";
import { amountHeroFontSize } from "../../../../native/src/domain/amount-hero-size";
import { FlowFigure } from "./amount";
import {
    burndownVerdict,
    categoryBudgets,
    categoryLabel,
    contributions,
    daysLeftInWindow,
    formatMoney,
    formatWhole,
    heroVerdict,
    leftPerDay,
    mainBudget,
    timeLeftLabel,
} from "./budgets-data";
import type { CategoryBudget, MainBudget } from "./budgets-data";
import { AppFragment, AppScreen, SCREEN, useLedger, useReplica } from "./canvas";
import type { AppTheme, CanvasProps } from "./canvas";
import { BurndownChart } from "./chart-burndown";
import { GlassCircle, SymbolMask, SystemText, TabBar } from "./chrome";
import { dayMonth, monthLongTitle } from "./dates";
import { DEMO_NOW } from "./ledger";
import type { Ledger } from "./ledger";
import { amountParts, formatAmount } from "./money";
import { appTranslator, interpolate } from "./strings";
import type { AppKey, AppT } from "./strings";
import { fontAscent, textLineHeight } from "./type";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const GUTTER = 20;
const CONTENT_TOP = 116;
const CONTENT_WIDTH = SCREEN.width - 2 * GUTTER;
const BLEED = 8;
const CHART_HEIGHT = 168;
const SPARK_HEIGHT = 40;
const HERO = { gutter: 40, size: 40 } as const;
const BAR_BUTTON = { iconSize: 22, left: 342, size: 44, top: 62 } as const;
const TITLE = { baseline: 90.3, size: 17, weight: 590 } as const;
const SEGMENTED = { gap: 4, height: 32, inset: 2, label: 13, layout: 31 } as const;
const SEGMENT_COLORS = {
    dark: { thumb: "#666567", track: "#2d2c2a" },
    light: { thumb: "#ffffff", track: "#e3e1dd" },
} as const satisfies Record<AppTheme, { thumb: string; track: string }>;
const STEP_DISABLED = 0.3;
const SERIF: CustomStyle = {
    "--app-ascent": "0.99",
    "--app-descent": "0.31",
    "--app-trak": "0em",
    fontFamily: '"App Serif", serif',
};
const FRAGMENT_PAD = 20;
const VERDICT_LINES = { de: 3, en: 2, es: 2, fr: 3, pt: 2 } as const satisfies Record<Locale, number>;
const VERDICT_LINE = 27.5;

export type BalancesView = "accounts" | "categories";

export function BalancesHeader() {
    const { t } = useReplica();
    return (
        <>
            <div
                className="absolute inset-x-0 items-center"
                style={{ color: "var(--title-ink)", top: TITLE.baseline - fontAscent(TITLE.size) }}
            >
                <SystemText size={TITLE.size} weight={TITLE.weight}>
                    {t("balances.title")}
                </SystemText>
            </div>
            <GlassCircle left={BAR_BUTTON.left} size={BAR_BUTTON.size} top={BAR_BUTTON.top}>
                <SymbolMask color="var(--glass-ink)" size={BAR_BUTTON.iconSize} src={add} />
            </GlassCircle>
        </>
    );
}

const VIEWS = [
    ["accounts", "balances.view.accounts"],
    ["categories", "balances.view.categories"],
] as const satisfies readonly (readonly [BalancesView, AppKey])[];

export function BalancesViewToggle({ view }: { view: BalancesView }) {
    const { t, theme } = useReplica();
    const colors = SEGMENT_COLORS[theme];
    return (
        <div
            className="flex-row"
            style={{
                background: colors.track,
                borderRadius: SEGMENTED.height / 2,
                gap: SEGMENTED.gap,
                height: SEGMENTED.height,
                marginBottom: SEGMENTED.layout - SEGMENTED.height,
                padding: SEGMENTED.inset,
            }}
        >
            {VIEWS.map(([key, label]) => (
                <div
                    className="flex-1 items-center justify-center"
                    key={key}
                    style={{
                        background: key === view ? colors.thumb : undefined,
                        borderRadius: SEGMENTED.height / 2 - SEGMENTED.inset,
                        color: "var(--title-ink)",
                    }}
                >
                    <SystemText size={SEGMENTED.label} weight={key === view ? 510 : 400}>
                        {t(label)}
                    </SystemText>
                </div>
            ))}
        </div>
    );
}

export function MonoLabel({ children, className = "text-muted" }: { children: ReactNode; className?: string }) {
    return (
        <span className={`text-eyebrow tracking-eyebrow font-mono whitespace-nowrap uppercase ${className}`}>
            {children}
        </span>
    );
}

function StepButton({ disabled, icon }: { disabled: boolean; icon: IconSvgElement }) {
    return (
        <div className="size-9 items-center justify-center" style={{ opacity: disabled ? STEP_DISABLED : 1 }}>
            <HugeiconsIcon className="text-foreground" icon={icon} size={18} strokeWidth={2} />
        </div>
    );
}

function PeriodStepper({ main, now }: { main: MainBudget; now: Date }) {
    const { ledger, t } = useReplica();
    const earliest = contributions(ledger, now).reduce<Date | null>(
        (first, row) => (first === null || row.date < first ? row.date : first),
        null
    );
    return (
        <div className="flex-row items-center justify-between">
            <StepButton
                disabled={periodsBackTo(main.window.start, BUDGET_TYPE.month, earliest) === 0}
                icon={ArrowLeft01Icon}
            />
            <MonoLabel className="text-foreground">{monthLongTitle(main.window.start, t)}</MonoLabel>
            <StepButton disabled icon={ArrowRight01Icon} />
        </div>
    );
}

function HeroNumber({ amount, over }: { amount: number; over: boolean }) {
    const { ledger, locale } = useReplica();
    const parts = amountParts(amount, ledger.currency, locale);
    const fitted = Math.min(
        HERO.size,
        Math.floor(amountHeroFontSize(amount, parts.minorUnits, SCREEN.width - HERO.gutter))
    );
    const small = (Math.round(HERO.size * 0.5) * fitted) / HERO.size;
    return (
        <div className="flex-row items-baseline">
            <span
                className="tracking-hero text-muted font-sans whitespace-nowrap tabular-nums"
                style={{ fontSize: small, lineHeight: `${textLineHeight(small)}px` }}
            >
                {parts.symbol}
            </span>
            <FlowFigure className={`font-sans ${over ? "text-over-budget" : "text-foreground"}`} size={fitted}>
                {parts.integer}
            </FlowFigure>
            {parts.fraction ? (
                <FlowFigure className="text-muted font-sans" size={small}>
                    {`${parts.decimal}${parts.fraction}`}
                </FlowFigure>
            ) : null}
        </div>
    );
}

function LeftBlock({ main, now }: { main: MainBudget; now: Date }) {
    const { t } = useReplica();
    const period = t("budgets.period.month");
    const over = main.leftover < 0;
    return (
        <div>
            <div className="flex-row flex-wrap items-baseline justify-between gap-x-3">
                <MonoLabel>{t("budgets.hero.eyebrow", { period: period.toUpperCase() })}</MonoLabel>
                <MonoLabel>{timeLeftLabel(main.window, now, t).toUpperCase()}</MonoLabel>
            </div>
            <div className="pt-2">
                <HeroNumber amount={Math.abs(main.leftover)} over={over} />
            </div>
            <span className="text-footnote text-muted pt-0.5">
                {over ? t("budgets.hero.overBudget") : t("budgets.hero.leftPeriod", { period })}
            </span>
        </div>
    );
}

function PaceChartBlock({ main }: { main: MainBudget }) {
    return (
        <div style={{ marginInline: -BLEED }}>
            <BurndownChart
                burndown={main.burndown}
                height={CHART_HEIGHT}
                limit={main.amount}
                name="pace"
                width={CONTENT_WIDTH + BLEED * 2}
            />
        </div>
    );
}

interface MeasureCell {
    figure: string;
    key: string;
    label: string;
}

function MeasureStrip({ cells }: { cells: readonly MeasureCell[] }) {
    return (
        <div className="border-border flex-row border-t">
            {cells.map((cell, index) => (
                <div className={index > 0 ? "flex-1 pl-3.5" : "flex-1"} key={cell.key}>
                    {index > 0 ? <div className="bg-border absolute inset-y-0 left-0 w-px" /> : null}
                    <div className="gap-0.75 py-2.5">
                        <MonoLabel>{cell.label}</MonoLabel>
                        <span className="font-sans-semibold text-body text-foreground whitespace-nowrap tabular-nums">
                            {cell.figure}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function heroMeasures(main: MainBudget, now: Date, code: string, locale: Locale, t: AppT): MeasureCell[] {
    const cells: MeasureCell[] = [
        { figure: formatWhole(main.amount, code, locale), key: "limit", label: t("budgets.measure.limit") },
        { figure: formatWhole(main.spent, code, locale), key: "spent", label: t("budgets.measure.spent") },
    ];
    if (main.leftover >= 0) {
        const perDay = leftPerDay(main.leftover, main.window, now);
        cells.push({
            figure: formatMoney(perDay, code, locale, perDay < 10),
            key: "perDay",
            label: t("budgets.measure.perDay"),
        });
    }
    return cells;
}

function Verdict({ children }: { children: string }) {
    return (
        <div className="px-1">
            <span className="text-foreground text-title leading-snug" style={SERIF}>
                {children}
            </span>
        </div>
    );
}

function BudgetHero({ main, now }: { main: MainBudget; now: Date }) {
    const { ledger, locale, t } = useReplica();
    const verdict = heroVerdict(main, ledger.currency, locale, t);
    return (
        <div>
            <LeftBlock main={main} now={now} />
            <div className="pt-4">
                <PaceChartBlock main={main} />
            </div>
            <div className="pt-3.5">
                <MeasureStrip cells={heroMeasures(main, now, ledger.currency, locale, t)} />
            </div>
            {verdict ? (
                <div className="pt-4">
                    <Verdict>{verdict}</Verdict>
                </div>
            ) : null}
        </div>
    );
}

function BudgetRow({ budget, now }: { budget: CategoryBudget; now: Date }) {
    const { ledger, locale, t } = useReplica();
    const code = ledger.currency;
    const over = budget.overBudget;
    const verdict = burndownVerdict(budget.burndown, code, locale, t);
    const meta = [
        t("budgets.spentOfLimit", {
            limit: formatWhole(budget.amount, code, locale),
            spent: formatWhole(budget.spent, code, locale),
        }),
        over
            ? null
            : t("budgets.perDay", {
                  amount: formatWhole(leftPerDay(budget.leftover, budget.window, now), code, locale),
              }),
    ]
        .filter((part) => part !== null)
        .join(" · ");
    return (
        <div className="gap-2 py-3.5">
            <div className="flex-row items-center gap-2">
                <span className="font-sans-semibold text-body text-foreground flex-1 truncate">
                    {categoryLabel(budget.name, t)}
                </span>
                <span
                    className={`font-sans-semibold text-body whitespace-nowrap tabular-nums ${over ? "text-over-budget" : "text-foreground"}`}
                >
                    {formatAmount(Math.abs(budget.leftover), code, locale)}
                    <span className="font-sans-medium text-label text-muted">
                        {` ${t(over ? "budgets.suffix.over" : "budgets.suffix.left")}`}
                    </span>
                </span>
            </div>
            <div style={{ height: SPARK_HEIGHT }}>
                <BurndownChart
                    burndown={budget.burndown}
                    height={SPARK_HEIGHT}
                    limit={budget.amount}
                    name={budget.name}
                    thumbnail
                    width={CONTENT_WIDTH}
                />
            </div>
            <MonoLabel>{meta}</MonoLabel>
            {verdict ? <span className="text-foreground text-label">{verdict}</span> : null}
        </div>
    );
}

function WithLimit({ now }: { now: Date }) {
    const { ledger, locale, t } = useReplica();
    const code = ledger.currency;
    const budgets = categoryBudgets(ledger, now);
    const total = (pick: (budget: CategoryBudget) => number) =>
        formatWhole(
            budgets.reduce((sum, budget) => sum + pick(budget), 0),
            code,
            locale
        );
    return (
        <div className="pt-6">
            <div className="flex-row flex-wrap items-baseline justify-between gap-x-3 pb-2">
                <MonoLabel>{t("balances.withLimit")}</MonoLabel>
                <MonoLabel>
                    {t("budgets.spentOfLimit", {
                        limit: total((budget) => budget.amount),
                        spent: total((budget) => budget.spent),
                    })}
                </MonoLabel>
            </div>
            <div className="divide-border divide-y">
                {budgets.map((budget) => (
                    <BudgetRow budget={budget} key={budget.name} now={now} />
                ))}
            </div>
        </div>
    );
}

function BudgetsContent({ now }: { now: Date }) {
    const main = mainBudget(useReplica().ledger, now);
    return (
        <div className="absolute inset-x-0" style={{ paddingInline: GUTTER, top: CONTENT_TOP }}>
            <BalancesViewToggle view="categories" />
            <div className="pt-3">
                <PeriodStepper main={main} now={now} />
            </div>
            <BudgetHero main={main} now={now} />
            <WithLimit now={now} />
        </div>
    );
}

function labelFigures(ledger: Ledger, locale: Locale, now: Date) {
    const main = mainBudget(ledger, now);
    const code = ledger.currency;
    const t = appTranslator(locale);
    const last = main.burndown.points.at(-1);
    return {
        days: daysLeftInWindow(main.window, now),
        labels: getIntlayer("appUi", locale).labels,
        left: formatAmount(main.leftover, code, locale),
        limit: formatWhole(main.amount, code, locale),
        main,
        perDay: formatWhole(leftPerDay(main.leftover, main.window, now), code, locale),
        short: formatWhole(Math.abs(Math.min(0, main.burndown.projectedBalance ?? 0)), code, locale),
        spent: formatWhole(main.spent, code, locale),
        t,
        today: dayMonth(last ? addDays(main.window.start, last.day - 1) : now, locale, t),
    };
}

export function budgetsLabel(ledger: Ledger, locale: Locale, now: Date = DEMO_NOW): string {
    const { days, labels, left, limit, main, perDay, short, spent, t } = labelFigures(ledger, locale, now);
    return interpolate(labels.budgetsScreen, {
        days,
        left,
        limit,
        month: monthLongTitle(main.window.start, t),
        perDay,
        short,
        spent,
    });
}

export function paceChartLabel(ledger: Ledger, locale: Locale, now: Date = DEMO_NOW): string {
    const { labels, left, limit, short, today } = labelFigures(ledger, locale, now);
    return interpolate(labels.budgetPace, { date: today, left, limit, short });
}

export function budgetLeftLabel(ledger: Ledger, locale: Locale, now: Date = DEMO_NOW): string {
    const { days, labels, left } = labelFigures(ledger, locale, now);
    return interpolate(labels.budgetLeft, { days, left });
}

export function paceVerdictLabel(ledger: Ledger, locale: Locale, now: Date = DEMO_NOW): string {
    return heroVerdict(mainBudget(ledger, now), ledger.currency, locale, appTranslator(locale)) ?? "";
}

export interface BudgetsScreenProps extends CanvasProps {
    now?: Date;
}

export function BudgetsScreen({ now = DEMO_NOW, ...canvas }: BudgetsScreenProps) {
    const ledger = useLedger();
    return (
        <AppScreen {...canvas} label={budgetsLabel(ledger, canvas.locale, now)}>
            <BudgetsContent now={now} />
            <BalancesHeader />
            <TabBar badges={{ balances: 1 }} selected="balances" />
        </AppScreen>
    );
}

function FragmentSurface({ children }: { children: ReactNode }) {
    return (
        <>
            <div className="bg-background absolute inset-0" />
            <div className="absolute inset-0" style={{ padding: FRAGMENT_PAD }}>
                {children}
            </div>
        </>
    );
}

const PACE_CHART = { height: CHART_HEIGHT + 2 * (FRAGMENT_PAD - BLEED), width: SCREEN.width } as const;
const BUDGET_LEFT = { height: 131, width: SCREEN.width } as const;

export function PaceChartFragment({ now = DEMO_NOW, ...canvas }: BudgetsScreenProps) {
    const ledger = useLedger();
    return (
        <AppFragment {...canvas} label={paceChartLabel(ledger, canvas.locale, now)} {...PACE_CHART}>
            <div className="bg-background absolute inset-0" />
            <div className="absolute" style={{ left: FRAGMENT_PAD, top: FRAGMENT_PAD - BLEED }}>
                <PaceChartBlock main={mainBudget(ledger, now)} />
            </div>
        </AppFragment>
    );
}

export function BudgetLeftFragment({ now = DEMO_NOW, ...canvas }: BudgetsScreenProps) {
    const ledger = useLedger();
    return (
        <AppFragment {...canvas} label={budgetLeftLabel(ledger, canvas.locale, now)} {...BUDGET_LEFT}>
            <FragmentSurface>
                <LeftBlock main={mainBudget(ledger, now)} now={now} />
            </FragmentSurface>
        </AppFragment>
    );
}

export function PaceVerdictFragment({ now = DEMO_NOW, ...canvas }: BudgetsScreenProps) {
    const height = Math.ceil(VERDICT_LINES[canvas.locale] * VERDICT_LINE + 2 * FRAGMENT_PAD);
    const verdict = paceVerdictLabel(useLedger(), canvas.locale, now);
    return (
        <AppFragment {...canvas} height={height} label={verdict} width={SCREEN.width}>
            <FragmentSurface>
                <Verdict>{verdict}</Verdict>
            </FragmentSurface>
        </AppFragment>
    );
}
