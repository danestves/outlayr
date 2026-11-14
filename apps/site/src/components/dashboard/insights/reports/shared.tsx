import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { Button } from "panelui-web/button";
import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { LocalizedLink } from "@/components/localized-link";
import { LogoMark } from "@/components/logo-mark";
import { money } from "@/lib/ledger";

import { ReportCard, reportFigures, riseFigure } from "./card";
import type { Figure } from "./card";
import type { Measure } from "./model";
import { monthsOf, reportWords } from "./reading";
import type { Reading } from "./reading";
import { reportOf } from "./share";
import type { SharedReport } from "./share";

const COLUMN = "mx-auto w-full max-w-[1192px] px-4";

// The web frames read "Oct 28"; the site's en-GB date locale would flip it.
const datedLocale = (locale: string) => {
    const { date } = LANGUAGES[localeFromParam(locale)];
    return date === "en-GB" ? "en-US" : date;
};

function useSharedReading({ currency, unit }: Pick<SharedReport, "currency" | "unit">): Reading {
    const copy = useIntlayer("dashboard-insights-reports");
    const { locale } = useLocale();
    return useMemo(() => {
        const dated = datedLocale(locale);
        const monthDay = new Intl.DateTimeFormat(dated, { day: "numeric", month: "short", timeZone: "UTC" });
        const shortMonth = new Intl.DateTimeFormat(dated, { month: "short", timeZone: "UTC" });
        const compact = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" });
        const share = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
        const percent = unit === "percent";
        const words = reportWords({
            categoryName: ({ name }) => name,
            copy,
            fmt: {
                axis: (value) => (percent ? `${value}%` : compact.format(value).toLowerCase()),
                date: (day) => monthDay.format(wallNoon(day)).replace(".", ""),
                month: (key) => shortMonth.format(wallNoon(`${key}-15`)),
                whole: (value) => money(value, currency, "auto", false),
            },
            locale,
            uncategorized: "",
        });
        return percent
            ? { ...words, measureValue: (_measure: Measure, value: number) => `${share.format(value)}%` }
            : words;
    }, [copy, currency, locale, unit]);
}

function TopBar() {
    const page = useIntlayer("shared-report");
    return (
        <header className="border-border h-14 border-b sm:h-16">
            <div className={`${COLUMN} flex h-full items-center justify-between`}>
                <LocalizedLink
                    aria-label={page.home.value}
                    className="flex items-center gap-[9px] text-[15px] font-semibold"
                    to="/"
                >
                    <LogoMark className="text-app-tint size-6" />
                    Outlayr
                </LocalizedLink>
                <Button render={<LocalizedLink to="/" />}>{page.try}</Button>
            </div>
        </header>
    );
}

export function SharedReportPage({ shared, updatedAt }: { shared: SharedReport; updatedAt: number }) {
    const page = useIntlayer("shared-report");
    const { locale } = useLocale();
    const words = useSharedReading(shared);
    const { definition, report } = useMemo(() => reportOf(shared), [shared]);
    const { copy } = words;
    const percent = shared.unit === "percent";
    const date = new Intl.DateTimeFormat(datedLocale(locale), {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
    }).format(updatedAt);
    const [largest] = report.rows.toSorted((a, b) => b.total - a.total);
    const figures: readonly Figure[] = percent
        ? [
              {
                  label: page.largest({ dimension: copy.dimensions[definition.rows].value.toLocaleLowerCase() }),
                  value: largest
                      ? `${largest.label.name} ${words.measureValue(definition.measure, largest.total)}`
                      : "–",
              },
              riseFigure({ definition, report, words }),
          ]
        : reportFigures({ definition, empty: false, report, words });
    const subtitle = [
        copy.measures[definition.measure].value,
        words.rowsBy(definition),
        words.rangeName(monthsOf(report.columns, "")),
        ...(percent ? [page.percentages.value] : []),
    ].join(" · ");
    return (
        <div className="app-shell ph-no-capture flex min-h-dvh flex-col">
            <TopBar />
            <main className={COLUMN} id="main">
                <div className="flex flex-col pt-6 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pt-8 sm:pb-5">
                    <div className="min-w-0">
                        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.02em] sm:text-2xl sm:leading-8">
                            {shared.name}
                        </h1>
                        <p className="text-muted-foreground mt-0.5">{subtitle}</p>
                    </div>
                    <span className="dash-figure text-muted-foreground shrink-0 text-[13px] max-sm:mt-2">
                        {page.updated({ date })}
                    </span>
                </div>
                <ReportCard averages definition={definition} figures={figures} report={report} words={words} />
                <footer className="text-muted-foreground flex flex-col gap-1.5 pt-4 pb-8 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:pt-5">
                    <span>{page.footer({ date })}</span>
                    <LocalizedLink className="text-app-tint font-medium" to="/">
                        tryoutlayr.com
                    </LocalizedLink>
                </footer>
            </main>
        </div>
    );
}

export function SharedReportOff() {
    const { off } = useIntlayer("shared-report");
    return (
        <div className="app-shell flex min-h-dvh flex-col">
            <TopBar />
            <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center" id="main">
                <Glyph className="text-muted-foreground mb-4" icon={Unlink01Icon} size={32} />
                <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">{off.title}</h1>
                <p className="text-muted-foreground mt-1 mb-5">{off.body}</p>
                <Button render={<LocalizedLink to="/" />} variant="outline">
                    {off.home}
                </Button>
            </main>
        </div>
    );
}
