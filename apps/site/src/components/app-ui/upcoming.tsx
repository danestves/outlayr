import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { startOfDay } from "@outlayr/money/calendar";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";

import { daysBetween } from "../../../../native/src/domain/local-day";
import { groupByMonth } from "../../../../native/src/domain/upcoming";
import { AppFragment, AppScreen, SCREEN, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { GlassCircle, SystemText } from "./chrome";
import { dayOfMonth, MONTHS, MONTHS_LONG, WEEKDAYS, WEEKDAYS_LONG } from "./dates";
import { categoryStyle, DEMO_CURRENCY, DEMO_NOW, imageColor, upcoming } from "./ledger";
import type { UpcomingCharge } from "./ledger";
import { currencyFor, formatAmount, formatDayTotal } from "./money";
import { SettingsSection } from "./parts";
import { appTranslator, interpolate } from "./strings";
import type { AppKey, AppT } from "./strings";
import { CategoryIconTile } from "./tile";
import { fontAscent } from "./type";

const GUTTER = 20;
const CONTENT_TOP = 116;
const TITLE = { baseline: 90.3, size: 17, weight: 590 } as const;
const BACK = { left: 16, size: 44, top: 62 } as const;
const TILE = { radius: 9, size: 36 } as const;
const BADGE_OFFSET = -5;
const ROW_HEIGHT = 16 + 23 + 1 / 3 + 2 + 21 + 1 / 3;
const MONTH_HEADER_HEIGHT = 10 + 15 + 1 / 3 + 5 + 1.3;
const TOTAL_PAD = 16;
const TOTAL_HEIGHT = 2 * TOTAL_PAD + 22 + 1 / 3;
const LIST_PAD = { bottom: 8, top: 6 } as const;
const FEATURED_MONTH = 9;

const weekdayKey = (date: Date) => WEEKDAYS[date.getDay()] ?? WEEKDAYS[0];
const weekdayLongKey = (date: Date) => WEEKDAYS_LONG[date.getDay()] ?? WEEKDAYS_LONG[0];
const monthKey = (date: Date) => MONTHS[date.getMonth()] ?? MONTHS[0];
const monthLongKey = (date: Date) => MONTHS_LONG[date.getMonth()] ?? MONTHS_LONG[0];

const CADENCE = new Map<number, AppKey>([
    [RECURRING_TYPE.monthly, "transaction.cadence.monthly"],
    [RECURRING_TYPE.yearly, "transaction.cadence.yearly"],
]);

function chargeDate(date: Date, now: Date, locale: Locale, t: AppT): string {
    const base = `${t(weekdayKey(date))}, ${dayOfMonth(date, locale)} ${t(monthKey(date))}`;
    return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

function dueDay(date: Date, now: Date, locale: Locale, t: AppT): string {
    const days = daysBetween(startOfDay(now).getTime(), startOfDay(date).getTime());
    if (days === 0) {
        return t("common.today");
    }
    if (days === 1) {
        return t("common.tomorrow");
    }
    return days > 1 && days < 7 ? t(weekdayLongKey(date)) : chargeDate(date, now, locale, t);
}

function upcomingLabel({ landing, row }: UpcomingCharge, now: Date, locale: Locale, t: AppT): string {
    const day = dueDay(landing, now, locale, t);
    const cadence = t(CADENCE.get(row.recurringType) ?? "transaction.cadence.monthly");
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${cadence}`;
}

const monthTitle = (month: Date, now: Date, t: AppT) =>
    month.getFullYear() === now.getFullYear()
        ? t(monthLongKey(month))
        : `${t(monthLongKey(month))} ${month.getFullYear()}`;

const chargeAmount = ({ row }: UpcomingCharge, locale: Locale) =>
    `${row.income ? "+" : "-"}${formatAmount(row.amount, currencyFor(locale), locale)}`;

const perMonth = (now: Date) =>
    monthlySubscriptionCost(
        upcoming(now).map(({ row }) => row),
        DEMO_CURRENCY,
        undefined,
        now
    ).filter((bucket) => bucket.transactionCount > 0);

const months = (now: Date) => groupByMonth(upcoming(now), ({ landing }) => landing);

function featuredMonth(now: Date) {
    const group = months(now).find(({ month }) => month.getMonth() === FEATURED_MONTH);
    if (!group) {
        throw new Error("No upcoming charges in the featured month.");
    }
    return group;
}

function chargeByNote(note: string, now: Date): UpcomingCharge {
    const charge = upcoming(now).find(({ row }) => row.note === note);
    if (!charge) {
        throw new Error(`No upcoming charge for ${note}.`);
    }
    return charge;
}

const labels = (locale: Locale) => getIntlayer("appUi", locale).labels;

function entryText(charge: UpcomingCharge, now: Date, locale: Locale, t: AppT) {
    return `${charge.row.note}, ${chargeAmount(charge, locale)}, ${upcomingLabel(charge, now, locale, t)}`;
}

function MonoLabel({ children }: { children: string }) {
    return <span className="text-eyebrow tracking-eyebrow text-muted font-mono uppercase">{children}</span>;
}

function UpcomingEntryRow({ charge, now }: { charge: UpcomingCharge; now: Date }) {
    const { locale, t } = useReplica();
    const identity = categoryStyle(charge.row.category);
    return (
        <div className="bg-background flex-row items-center gap-3 py-2">
            <div>
                <CategoryIconTile
                    color={imageColor(charge.row.logo) ?? identity.color}
                    future
                    icon={identity.icon}
                    logo={charge.row.logo}
                    radius={TILE.radius}
                    size={TILE.size}
                />
                {charge.row.recurringType > 0 ? (
                    <div
                        className="bg-surface-secondary text-foreground absolute rounded-md"
                        style={{ bottom: BADGE_OFFSET, padding: 3, right: BADGE_OFFSET }}
                    >
                        <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
                    </div>
                ) : null}
            </div>
            <div className="flex-1 gap-0.5">
                <div className="flex-row items-center gap-1.5">
                    <span className="font-sans-medium text-callout text-future shrink truncate">{charge.row.note}</span>
                </div>
                <div className="flex-row flex-wrap items-center gap-1.25">
                    <span className="font-sans-medium text-subtitle text-subtle truncate">
                        {upcomingLabel(charge, now, locale, t)}
                    </span>
                </div>
            </div>
            <div className="items-end">
                <span className="font-sans-medium text-title text-future tabular-nums">
                    {chargeAmount(charge, locale)}
                </span>
            </div>
        </div>
    );
}

function MonthGroup({
    first,
    month,
    now,
    rows,
}: {
    first: boolean;
    month: Date;
    now: Date;
    rows: readonly UpcomingCharge[];
}) {
    const { t } = useReplica();
    return (
        <div>
            <div className={`gap-1.25 ${first ? "pt-2.5" : "pt-7"}`}>
                <MonoLabel>{monthTitle(month, now, t)}</MonoLabel>
                <div className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
            </div>
            {rows.map((charge) => (
                <UpcomingEntryRow charge={charge} key={charge.row.id} now={now} />
            ))}
        </div>
    );
}

function PerMonthRow({ now }: { now: Date }) {
    const { locale, t } = useReplica();
    return (
        <div className="flex-row items-baseline justify-between gap-2 pb-4">
            <MonoLabel>{t("log.upcoming.perMonth")}</MonoLabel>
            <div className="flex-row items-baseline gap-1.5">
                {perMonth(now).map((bucket) => (
                    <span className="font-sans-semibold text-muted text-body tabular-nums" key={bucket.currencyCode}>
                        {formatDayTotal(bucket.amount, currencyFor(locale), locale)}
                    </span>
                ))}
            </div>
        </div>
    );
}

function BackHeader() {
    const { t } = useReplica();
    return (
        <>
            <div
                className="absolute inset-x-0 items-center"
                style={{ color: "var(--title-ink)", top: TITLE.baseline - fontAscent(TITLE.size) }}
            >
                <SystemText size={TITLE.size} weight={TITLE.weight}>
                    {t("nav.settings.upcoming")}
                </SystemText>
            </div>
            <GlassCircle left={BACK.left} size={BACK.size} top={BACK.top}>
                <svg fill="none" height={BACK.size} viewBox={`0 0 ${BACK.size} ${BACK.size}`} width={BACK.size}>
                    <path
                        d="M24.67 14 16.33 22.17 24.67 30.33"
                        stroke="var(--glass-ink)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.67}
                    />
                </svg>
            </GlassCircle>
        </>
    );
}

function LogSection() {
    const { t } = useReplica();
    return <SettingsSection title={t("settings.upcoming.section")}>{null}</SettingsSection>;
}

const perMonthText = (now: Date, locale: Locale) =>
    perMonth(now)
        .map((bucket) => formatAmount(Math.abs(bucket.amount), currencyFor(locale), locale))
        .join(" / ");

function upcomingScreenLabel(now: Date, locale: Locale): string {
    const t = appTranslator(locale);
    return interpolate(labels(locale).upcomingScreen, {
        entries: upcoming(now)
            .map((charge) => entryText(charge, now, locale, t))
            .join("; "),
        perMonth: perMonthText(now, locale),
    });
}

type UpcomingProps = CanvasProps & { now?: Date };

export function UpcomingScreen({ now = DEMO_NOW, ...canvas }: UpcomingProps) {
    return (
        <AppScreen {...canvas} label={upcomingScreenLabel(now, canvas.locale)}>
            <div className="absolute inset-x-0" style={{ paddingInline: GUTTER, top: CONTENT_TOP }}>
                <div className="pt-2.5">
                    <PerMonthRow now={now} />
                    {months(now).map(({ month, rows }, index) => (
                        <MonthGroup first={index === 0} key={month.getTime()} month={month} now={now} rows={rows} />
                    ))}
                </div>
                <LogSection />
            </div>
            <BackHeader />
        </AppScreen>
    );
}

export function UpcomingListFragment({ now = DEMO_NOW, ...canvas }: UpcomingProps) {
    const { month, rows } = featuredMonth(now);
    const t = appTranslator(canvas.locale);
    const label = interpolate(labels(canvas.locale).upcomingList, {
        entries: rows.map((charge) => entryText(charge, now, canvas.locale, t)).join("; "),
        month: t(monthLongKey(month)),
    });
    const height = LIST_PAD.top + MONTH_HEADER_HEIGHT + rows.length * ROW_HEIGHT + LIST_PAD.bottom;
    return (
        <AppFragment {...canvas} height={height} label={label} width={SCREEN.width}>
            <div
                className="bg-background absolute inset-0"
                style={{ paddingBottom: LIST_PAD.bottom, paddingInline: GUTTER, paddingTop: LIST_PAD.top }}
            >
                <MonthGroup first month={month} now={now} rows={rows} />
            </div>
        </AppFragment>
    );
}

export function UpcomingRowFragment({
    entry = "Verizon",
    now = DEMO_NOW,
    ...canvas
}: UpcomingProps & { entry?: string }) {
    const charge = chargeByNote(entry, now);
    const t = appTranslator(canvas.locale);
    const label = interpolate(labels(canvas.locale).upcomingRow, {
        amount: chargeAmount(charge, canvas.locale),
        name: charge.row.note,
        when: upcomingLabel(charge, now, canvas.locale, t),
    });
    return (
        <AppFragment {...canvas} height={ROW_HEIGHT} label={label} width={SCREEN.width}>
            <div className="bg-background absolute inset-0" style={{ paddingInline: GUTTER }}>
                <UpcomingEntryRow charge={charge} now={now} />
            </div>
        </AppFragment>
    );
}

export function UpcomingTotalFragment({ now = DEMO_NOW, ...canvas }: UpcomingProps) {
    const label = interpolate(labels(canvas.locale).upcomingTotal, { amount: perMonthText(now, canvas.locale) });
    return (
        <AppFragment {...canvas} height={TOTAL_HEIGHT} label={label} width={SCREEN.width}>
            <div className="bg-background absolute inset-0" style={{ paddingInline: GUTTER, paddingTop: TOTAL_PAD }}>
                <PerMonthRow now={now} />
            </div>
        </AppFragment>
    );
}
