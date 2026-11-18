import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";
import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";
import type { CSSProperties } from "react";

import { MonoLabel } from "./budgets";
import { dayMonth, dayOfMonth, formatWhole } from "./budgets-data";
import { AppScreen, SCREEN, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { PaceLineChart } from "./chart-pace";
import type { PaceTick } from "./chart-pace";
import { GLASS_EDGE, SystemText, TabBar } from "./chrome";
import { subscriptions, weekAnswers } from "./insights-data";
import type { Subscriptions, WeekAnswers } from "./insights-data";
import { DEMO_NOW } from "./ledger";
import { currencyFor, formatAmount } from "./money";
import { appTranslator, interpolate } from "./strings";
import type { AppKey, AppT } from "./strings";
import { fontAscent, roundedTrak } from "./type";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const GUTTER = 20;
const CONTENT_TOP = 168;
const CONTENT_WIDTH = SCREEN.width - 2 * GUTTER;
const LARGE_TITLE = { baseline: 152, left: 16, size: 34, weight: 700 } as const;
const PERIOD_PILL = { height: 44, padding: 16, right: 16, size: 16.5, top: 62, weight: 590 } as const;
const GLASS_RING = 0.67;
const STEP_DISABLED = 0.4;
const CARD_SHADOW = "0 1px 4px rgba(23, 21, 15, 0.08)";
const SUBSCRIPTION_ROWS = 4;
const HEADLINE_TRAK: CustomStyle = { "--app-trak": roundedTrak(26) };

const WEEKDAY_INITIAL = [
    "dates.weekdayInitial.0",
    "dates.weekdayInitial.1",
    "dates.weekdayInitial.2",
    "dates.weekdayInitial.3",
    "dates.weekdayInitial.4",
    "dates.weekdayInitial.5",
    "dates.weekdayInitial.6",
] as const satisfies readonly AppKey[];

const HEADLINE_KEYS = {
    asUsual: "insights.answers.asUsual",
    faster: "insights.answers.faster",
    less: "insights.answers.less",
} as const satisfies Record<Exclude<WeekAnswers["headline"], "soFar">, AppKey>;

interface Money {
    exact: (amount: number) => string;
    rounded: (amount: number) => string;
}

function moneyFor(locale: Locale): Money {
    const code = currencyFor(locale);
    return {
        exact: (amount) => formatAmount(amount, code, locale),
        rounded: (amount) => formatWhole(amount, code, locale),
    };
}

function weekLabel({ start }: BudgetWindow, locale: Locale, t: AppT): string {
    const end = addDays(start, 6);
    const from = start.getMonth() === end.getMonth() ? dayOfMonth(start, locale) : dayMonth(start, locale, t);
    return `${from} - ${dayMonth(end, locale, t)}`;
}

function headlineText({ headline, spent }: WeekAnswers, money: Money, t: AppT): string {
    return headline === "soFar"
        ? t("insights.answers.total", { amount: money.exact(spent) })
        : t(HEADLINE_KEYS[headline]);
}

function subSentence({ forecast, usualByNow }: WeekAnswers, money: Money, t: AppT): string {
    const pace = money.rounded(forecast);
    return usualByNow != null && usualByNow > 0
        ? t("insights.answers.paceUsual", { pace, usual: money.rounded(usualByNow) })
        : t("insights.answers.paceOnly", { pace });
}

function paceTicks({ progress }: WeekAnswers, t: AppT): PaceTick[] {
    return Array.from({ length: progress.days }, (_, day) => ({
        day,
        label: t(WEEKDAY_INITIAL[addDays(progress.window.start, day).getDay()] ?? "dates.weekdayInitial.0"),
    }));
}

function subscriptionsTitle(detail: Subscriptions, money: Money, t: AppT): string {
    return t("insights.answers.subs.title", { amount: money.exact(detail.perMonth), count: detail.items.length });
}

function LargeTitle() {
    const { t } = useReplica();
    return (
        <div
            className="absolute"
            style={{
                color: "var(--title-ink)",
                left: LARGE_TITLE.left,
                top: LARGE_TITLE.baseline - fontAscent(LARGE_TITLE.size),
            }}
        >
            <SystemText size={LARGE_TITLE.size} weight={LARGE_TITLE.weight}>
                {t("insights.title")}
            </SystemText>
        </div>
    );
}

function PeriodPill() {
    const { t } = useReplica();
    return (
        <div
            className="absolute items-center justify-center"
            style={{
                background: "var(--glass-fill)",
                borderRadius: PERIOD_PILL.height / 2,
                boxShadow: GLASS_EDGE,
                color: "var(--glass-ink)",
                height: PERIOD_PILL.height - 2 * GLASS_RING,
                paddingInline: PERIOD_PILL.padding - GLASS_RING,
                right: PERIOD_PILL.right + GLASS_RING,
                top: PERIOD_PILL.top + GLASS_RING,
            }}
        >
            <SystemText size={PERIOD_PILL.size} weight={PERIOD_PILL.weight}>
                {t("insights.period.week")}
            </SystemText>
        </div>
    );
}

function StepButton({ enabled, icon }: { enabled: boolean; icon: IconSvgElement }) {
    return (
        <div className="h-8 w-9 items-center justify-center" style={{ opacity: enabled ? 1 : STEP_DISABLED }}>
            <HugeiconsIcon
                className={enabled ? "text-foreground" : "text-muted"}
                icon={icon}
                size={15}
                strokeWidth={2.2}
            />
        </div>
    );
}

function WindowStepper({ title }: { title: string }) {
    return (
        <div className="flex-row flex-wrap gap-2">
            <div className="bg-surface-secondary flex-row items-center rounded-full">
                <StepButton enabled icon={ArrowLeft01Icon} />
                <div className="py-1.5">
                    <span className="font-sans-semibold text-foreground text-subtitle whitespace-nowrap">{title}</span>
                </div>
                <StepButton enabled={false} icon={ArrowRight01Icon} />
            </div>
        </div>
    );
}

function Answer({ answers, money }: { answers: WeekAnswers; money: Money }) {
    const { t } = useReplica();
    const period = t("insights.answers.thisWeek");
    return (
        <div className="pt-3.5">
            <MonoLabel>{`${t("insights.answers.eyebrow", { period })} · ${money.exact(answers.spent)}`}</MonoLabel>
            <span
                className="font-sans-bold text-foreground pt-1 text-[26px] leading-8 tracking-tight not-supports-[font:-apple-system-body]:tracking-[calc(var(--app-trak)+var(--tracking-tight))]"
                style={HEADLINE_TRAK}
            >
                {headlineText(answers, money, t)}
            </span>
            <span className="text-subtitle text-muted pt-2">{subSentence(answers, money, t)}</span>
        </div>
    );
}

function SubscriptionsCard({ detail, money }: { detail: Subscriptions; money: Money }) {
    const { locale, t } = useReplica();
    const unnamed = t("insights.answers.subs.unnamed");
    const rows = detail.items.slice(0, SUBSCRIPTION_ROWS);
    return (
        <div className="bg-card rounded-[22px] p-4" style={{ boxShadow: CARD_SHADOW }}>
            <MonoLabel>{t("insights.answers.subs.kicker")}</MonoLabel>
            <span className="font-sans-bold text-headline text-foreground pt-2">
                {subscriptionsTitle(detail, money, t)}
            </span>
            <span className="text-caption text-muted pt-1">
                {t("insights.answers.subs.evidence", {
                    date: dayMonth(detail.next.next, locale, t),
                    name: detail.next.name || unnamed,
                    yearly: money.rounded(detail.perMonth * 12),
                })}
            </span>
            <div className="pt-3">
                {rows.map((row, index) => (
                    <div
                        className={`border-border flex-row items-baseline justify-between gap-3 py-2 ${index === rows.length - 1 ? "" : "border-b"}`}
                        key={row.id}
                    >
                        <span className="text-subtitle text-foreground flex-1 truncate">{row.name || unnamed}</span>
                        <span className="text-subtitle text-foreground whitespace-nowrap tabular-nums">
                            {money.exact(row.perMonth)}
                        </span>
                    </div>
                ))}
            </div>
            <div className="border-border mt-3 flex-row items-center justify-between border-t pt-3">
                <span className="font-sans-medium text-subtitle text-foreground flex-1 truncate">
                    {t("insights.answers.seeSubscriptions")}
                </span>
                <HugeiconsIcon className="text-muted" icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
            </div>
        </div>
    );
}

function InsightsContent({ now }: { now: Date }) {
    const { locale, t } = useReplica();
    const money = moneyFor(locale);
    const answers = weekAnswers(now);
    const detail = subscriptions(now);
    return (
        <div className="absolute inset-x-0" style={{ top: CONTENT_TOP }}>
            <div style={{ paddingInline: GUTTER }}>
                <WindowStepper title={weekLabel(answers.progress.window, locale, t)} />
                <Answer answers={answers} money={money} />
                <div className="pt-4">
                    <PaceLineChart
                        cumulative={answers.cumulative}
                        days={answers.progress.days}
                        forecast={answers.forecast}
                        forecastLabel={`≈ ${money.rounded(answers.forecast)}`}
                        ticks={paceTicks(answers, t)}
                        todayLabel={t("insights.answers.chart.today")}
                        width={CONTENT_WIDTH}
                    />
                </div>
            </div>
            {detail ? (
                <div className="gap-2.5 pt-5" style={{ paddingInline: GUTTER }}>
                    <SubscriptionsCard detail={detail} money={money} />
                </div>
            ) : null}
        </div>
    );
}

export function insightsLabel(locale: Locale, now: Date = DEMO_NOW): string {
    const t = appTranslator(locale);
    const money = moneyFor(locale);
    const answers = weekAnswers(now);
    const detail = subscriptions(now);
    const sentence = subSentence(answers, money, t);
    return interpolate(getIntlayer("appUi", locale).labels.insightsScreen, {
        answer: `${headlineText(answers, money, t)}. ${sentence}${sentence.endsWith(".") ? "" : "."}`,
        spent: money.exact(answers.spent),
        subscriptions: detail ? subscriptionsTitle(detail, money, t) : "",
        window: weekLabel(answers.progress.window, locale, t),
    });
}

export interface InsightsScreenProps extends CanvasProps {
    now?: Date;
}

export function InsightsScreen({ now = DEMO_NOW, ...canvas }: InsightsScreenProps) {
    return (
        <AppScreen {...canvas} label={insightsLabel(canvas.locale, now)}>
            <InsightsContent now={now} />
            <LargeTitle />
            <PeriodPill />
            <TabBar badges={{ balances: 1 }} selected="insights" />
        </AppScreen>
    );
}
