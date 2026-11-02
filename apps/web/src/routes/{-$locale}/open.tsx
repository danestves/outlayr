import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Page } from "@/components/page";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { getOpenStats } from "@/lib/open-stats";
import type { OpenStats } from "@/lib/open-stats";
import { ldJson, pageMeta, webPage } from "@/lib/seo";
import { SOURCE_URL } from "@/lib/site";

const SECTION = "py-24";
const HEADING = "text-4xl font-semibold tracking-tight md:text-5xl";
const SOURCE_LINK =
    "fluid text-muted hover:text-foreground decoration-border mt-2 inline-block font-mono text-xs underline underline-offset-4";
const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 32;

export const Route = createFileRoute("/{-$locale}/open")({
    component: Open,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { meta } = getIntlayer("open", locale);
        return {
            meta: pageMeta(meta.title, meta.description),
            scripts: [ldJson(webPage(locale, "/open", { name: meta.title }))],
        };
    },
    loader: () => getOpenStats(),
});

interface Row {
    readonly delta: number | null;
    readonly description: ReactNode;
    readonly file: string;
    readonly id: string;
    readonly label: ReactNode;
    readonly series: readonly number[] | null;
    readonly source: string;
    readonly value: number;
}

const change = (series: readonly number[]) => (series.at(-1) ?? 0) - (series.at(-2) ?? 0);

const valueIn = <K extends string>(list: readonly ({ month: string } & Record<K, number>)[] | undefined, key: K) =>
    new Map((list ?? []).map((item) => [item.month, item[key]]));

function Open() {
    const stats = Route.useLoaderData();
    const { empty, lead, title, updated } = useIntlayer("open");
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    const when = stats
        ? new Date(stats.computedAt).toLocaleString(date, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
        : null;
    return (
        <Page lead={lead} meta={when ? updated({ date: when }) : undefined} title={title}>
            {stats ? (
                <>
                    <Ledger stats={stats} />
                    <Months stats={stats} />
                    <Cant />
                </>
            ) : (
                <p className="text-muted mt-24 text-lg">{empty}</p>
            )}
        </Page>
    );
}

function useNumbers() {
    const { locale } = useLocale();
    const { lang } = LANGUAGES[localeFromParam(locale)];
    return {
        count: new Intl.NumberFormat(lang),
        delta: new Intl.NumberFormat(lang, { signDisplay: "exceptZero" }),
        lang,
        money: new Intl.NumberFormat(lang, { currency: "USD", maximumFractionDigits: 0, style: "currency" }),
    };
}

function Ledger({ stats }: { stats: OpenStats }) {
    const { rows } = useIntlayer("open");
    const weeks = stats.posthog?.weeks ?? [];
    const pick = (key: "countries" | "entries" | "people") => weeks.map((week) => week[key]);
    const posthogRow = (id: "countries" | "entries" | "people"): Row => ({
        delta: change(pick(id)),
        description: rows[id].description,
        file: "openStats.ts",
        id,
        label: rows[id].label,
        series: pick(id),
        source: "PostHog",
        value: pick(id).at(-1) ?? 0,
    });
    const shown: Row[] = [
        ...(stats.posthog ? [posthogRow("people"), posthogRow("entries"), posthogRow("countries")] : []),
        {
            delta: change(stats.accounts.weeks),
            description: rows.accounts.description,
            file: "openStats.impl.ts",
            id: "accounts",
            label: rows.accounts.label,
            series: stats.accounts.weeks,
            source: "Convex",
            value: stats.accounts.weeks.at(-1) ?? 0,
        },
        ...(stats.revenue
            ? [
                  {
                      delta: null,
                      description: rows.pro.description,
                      file: "openStats.ts",
                      id: "pro",
                      label: rows.pro.label,
                      series: null,
                      source: "RevenueCat",
                      value: stats.revenue.activeSubscriptions,
                  },
              ]
            : []),
        ...(stats.github
            ? [
                  {
                      delta: null,
                      description: rows.stars.description({ count: stats.github.contributors }),
                      file: "openStats.ts",
                      id: "stars",
                      label: rows.stars.label,
                      series: null,
                      source: "GitHub",
                      value: stats.github.stars,
                  },
              ]
            : []),
    ];
    return (
        <section className="border-border mt-16 border-t delay-300 md:mt-24" data-reveal>
            {shown.map((row, index) => (
                <LedgerRow first={index === 0} key={row.id} row={row} />
            ))}
        </section>
    );
}

function LedgerRow({ first, row }: { first: boolean; row: Row }) {
    const { delta: deltaLabel, same } = useIntlayer("open");
    const numbers = useNumbers();
    return (
        <div className="border-border grid items-center gap-4 border-b py-6 md:grid-cols-[minmax(0,1fr)_8rem_14rem] md:gap-8">
            <div>
                <h2 className="text-lg font-medium">{row.label}</h2>
                <p className="text-muted mt-1 max-w-md">{row.description}</p>
                <a className={SOURCE_LINK} href={`${SOURCE_URL}/blob/main/packages/backend/confect/${row.file}`}>
                    {row.source} · {row.file}
                </a>
            </div>
            <div className={`hidden md:block ${first ? "text-tint" : "text-foreground"}`}>
                {row.series ? <Sparkline series={row.series} /> : null}
            </div>
            <div className="md:text-right">
                <p className="font-mono text-3xl font-medium tracking-tight tabular-nums md:text-4xl">
                    {numbers.count.format(row.value)}
                </p>
                {row.delta === null ? null : (
                    <p className="text-muted mt-1 font-mono text-xs">
                        {row.delta === 0 ? same : deltaLabel({ delta: numbers.delta.format(row.delta) })}
                    </p>
                )}
            </div>
        </div>
    );
}

function Sparkline({ series }: { series: readonly number[] }) {
    const low = Math.min(...series);
    const span = Math.max(...series) - low || 1;
    const step = SPARK_WIDTH / Math.max(series.length - 1, 1);
    const points = series
        .map((value, index) => `${index * step},${SPARK_HEIGHT - 2 - ((value - low) / span) * (SPARK_HEIGHT - 4)}`)
        .join(" ");
    return (
        <svg aria-hidden="true" className="h-8 w-32" viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}>
            <polyline fill="none" points={points} stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function Months({ stats }: { stats: OpenStats }) {
    const { months } = useIntlayer("open");
    const numbers = useNumbers();
    const current = new Date(stats.computedAt).toISOString().slice(0, 7);
    const people = valueIn(stats.posthog?.months, "people");
    const entries = valueIn(stats.posthog?.months, "entries");
    const added = valueIn(stats.accounts.months, "added");
    const proceeds = valueIn(stats.revenue?.months, "proceeds");
    const merged = valueIn(stats.github?.months, "mergedPrs");
    const columns = [
        ...(stats.posthog
            ? [
                  { id: "people", name: months.people, values: people, format: numbers.count },
                  { id: "entries", name: months.entries, values: entries, format: numbers.count },
              ]
            : []),
        { id: "accounts", name: months.accounts, values: added, format: numbers.count },
        ...(stats.revenue ? [{ id: "revenue", name: months.revenue, values: proceeds, format: numbers.money }] : []),
        ...(stats.github ? [{ id: "prs", name: months.prs, values: merged, format: numbers.count }] : []),
    ];
    const shown = stats.accounts.months
        .map(({ month }) => month)
        .filter((month) => [people, entries, added, proceeds, merged].some((values) => (values.get(month) ?? 0) > 0))
        .toReversed();
    if (shown.length === 0) {
        return null;
    }
    const monthName = (month: string) => {
        const name = new Date(`${month}-01T00:00:00Z`).toLocaleDateString(numbers.lang, {
            month: "long",
            timeZone: "UTC",
            year: "numeric",
        });
        return `${name.charAt(0).toLocaleUpperCase(numbers.lang)}${name.slice(1)}`;
    };
    return (
        <section className={SECTION}>
            <h2 className={HEADING} data-reveal>
                {months.title}
            </h2>
            <div className="mt-10 overflow-x-auto delay-100" data-reveal>
                <table className="w-full min-w-[40rem] border-collapse text-left">
                    <thead>
                        <tr className="border-border text-muted border-b font-mono text-xs">
                            <th className="py-3 pr-6 font-normal" scope="col">
                                {months.month}
                            </th>
                            {columns.map((column) => (
                                <th className="py-3 pl-6 text-right font-normal" key={column.id} scope="col">
                                    {column.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map((month) => (
                            <tr className="border-border border-b" key={month}>
                                <th className="py-4 pr-6 font-medium" scope="row">
                                    {month === current ? months.soFar({ month: monthName(month) }) : monthName(month)}
                                </th>
                                {columns.map((column) => (
                                    <td className="py-4 pl-6 text-right font-mono tabular-nums" key={column.id}>
                                        {column.format.format(column.values.get(month) ?? 0)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Cant() {
    const { cant } = useIntlayer("open");
    return (
        <section className="grid gap-8 md:grid-cols-2 md:gap-12">
            <h2 className={HEADING} data-reveal>
                {cant.title}
            </h2>
            <div className="text-muted space-y-4 text-lg delay-100" data-reveal>
                {cant.body.map((paragraph) => (
                    <p key={paragraph.value}>{paragraph}</p>
                ))}
            </div>
        </section>
    );
}
