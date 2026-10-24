import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { AnswerCard } from "@/components/answer-hub";
import type { AnswerItem } from "@/components/answer-hub";
import { HubTrail } from "@/components/hub-trail";
import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { ASIDE, COLUMNS } from "@/components/page";
import { StoreBadges } from "@/components/store-badges";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES } from "@/lib/i18n";
import { CONTAINER } from "@/lib/layout";
import { useMotionScan } from "@/lib/motion";
import { longDate } from "@/lib/site";
import type { PageRef } from "@/lib/site";

export interface ArticleSection {
    body: ReactNode;
    id: string;
    title: ReactNode;
}

export const DELAYS = ["", "delay-100", "delay-150", "delay-200", "delay-300"] as const;

export const H2 = "text-3xl font-semibold tracking-tight md:text-4xl";

const FIGURE = /(\$?\d(?:[\d.,]*\d)?)/u;

export function Figures({ text }: { text: string }) {
    return text.split(FIGURE).map((part, index) =>
        index % 2 === 1 ? (
            <span className="font-mono" key={`${part}@${index}`}>
                {part}
            </span>
        ) : (
            part
        )
    );
}

const WWW = /^www\./u;

function Source({ href }: { href: string }) {
    return (
        <a
            className="fluid text-muted hover:text-foreground ml-2 inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap"
            href={href}
        >
            {new URL(href).hostname.replace(WWW, "")}
            <Icon name="arrow-up-right" />
        </a>
    );
}

export function FactList({
    facts,
}: {
    facts: readonly { label: ReactNode & { value: string }; source?: { value: string }; text: { value: string } }[];
}) {
    return (
        <dl className="border-border mt-8 border-t delay-150" data-reveal>
            {facts.map((fact) => (
                <div className="border-border grid gap-2 border-b py-4 sm:grid-cols-4 sm:gap-6" key={fact.label.value}>
                    <dt className="text-muted font-mono text-xs tracking-widest uppercase sm:pt-1">{fact.label}</dt>
                    <dd className="sm:col-span-3">
                        <Figures text={fact.text.value} />
                        {fact.source ? <Source href={fact.source.value} /> : null}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

export function Prose({ paragraphs }: { paragraphs: readonly (ReactNode & { value: string })[] }) {
    return (
        <div className="text-muted mt-8 flex max-w-2xl flex-col gap-4 text-lg">
            {paragraphs.map((paragraph) => (
                <p data-reveal key={paragraph.value}>
                    {paragraph}
                </p>
            ))}
        </div>
    );
}

export function Questions({
    items,
}: {
    items: readonly { answer: ReactNode; question: ReactNode & { value: string } }[];
}) {
    return (
        <div className="border-border divide-border mt-8 max-w-2xl divide-y border-y">
            {items.map((item) => (
                <div className="py-6" data-reveal key={item.question.value}>
                    <h3 className="text-lg font-semibold">{item.question}</h3>
                    <p className="text-muted mt-2">{item.answer}</p>
                </div>
            ))}
        </div>
    );
}

function useRelated(refs: readonly PageRef[]): AnswerItem[] {
    const { compare, guides } = useIntlayer("answers");
    const { pages } = useIntlayer("tools");
    const { footer } = useIntlayer("site");
    return refs.map((ref) => {
        const [, hub = "", slug = ""] = ref.split("/");
        if (hub === "guides" && hasKey(guides, slug)) {
            const guide = guides[slug];
            return { kicker: footer.guides, name: guide.title, slug, text: guide.lead, to: "/{-$locale}/guides/$slug" };
        }
        if (hub === "compare" && hasKey(compare, slug)) {
            const page = compare[slug];
            return {
                kicker: footer.compare,
                name: page.title,
                slug,
                text: page.summary,
                to: "/{-$locale}/compare/$slug",
            };
        }
        if (hub === "tools" && hasKey(pages, slug)) {
            const page = pages[slug];
            return { kicker: footer.tools, name: page.title, slug, text: page.lead, to: "/{-$locale}/tools/$slug" };
        }
        throw new Error(`No page for related link ${ref}`);
    });
}

export function CompareTable({
    columns,
    corner,
    rows,
}: {
    columns: readonly { id: string; muted?: boolean; name: ReactNode }[];
    corner: string;
    rows: readonly { cells: readonly string[]; id: string; label: ReactNode }[];
}) {
    const last = columns.length - 1;
    return (
        <div className="-mx-6 mt-8 overflow-x-auto overscroll-x-contain px-6 delay-100 md:mx-0 md:px-0" data-reveal>
            <table className="w-full min-w-xl border-collapse text-left tabular-nums">
                <thead>
                    <tr className="border-foreground border-b">
                        <th className="w-1/5 py-3 pr-6" scope="col">
                            <span className="sr-only">{corner}</span>
                        </th>
                        {columns.map((column, index) => (
                            <th
                                className={`py-3 font-semibold ${column.muted ? "text-muted" : ""} ${index < last ? "pr-6" : ""}`}
                                key={column.id}
                                scope="col"
                            >
                                {column.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr className="border-border border-b align-top" key={row.id}>
                            <th
                                className="text-muted py-4 pr-6 font-mono text-xs font-normal tracking-widest uppercase"
                                scope="row"
                            >
                                {row.label}
                            </th>
                            {columns.map((column, index) => (
                                <td
                                    className={`py-4 ${column.muted ? "text-muted" : ""} ${index < last ? "pr-6" : ""}`}
                                    key={column.id}
                                >
                                    <Figures text={row.cells[index] ?? ""} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Contents({ sections }: { sections: readonly ArticleSection[] }) {
    const { labels } = useIntlayer("answers");
    const [current, setCurrent] = useState<string>();
    const order = sections.map((section) => section.id).join(" ");
    useEffect(() => {
        const ids = order.split(" ");
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const { id } = entry.target;
                    if (entry.isIntersecting) {
                        setCurrent(id);
                    } else if (entry.boundingClientRect.top > 0) {
                        setCurrent((active) => (active === id ? ids[ids.indexOf(id) - 1] : active));
                    }
                }
            },
            { rootMargin: "-30% 0px -60% 0px" }
        );
        for (const section of document.querySelectorAll(ids.map((id) => `[id="${id}"]`).join(","))) {
            observer.observe(section);
        }
        return () => observer.disconnect();
    }, [order]);
    return (
        <nav aria-label={labels.contents.value} className={`${ASIDE} hidden lg:block`}>
            <p className="text-muted font-mono text-xs tracking-widest uppercase">{labels.contents}</p>
            <ol className="mt-4">
                {sections.map((section) => (
                    <li key={section.id}>
                        <a
                            aria-current={current === section.id ? "location" : undefined}
                            className="fluid text-muted hover:text-foreground aria-[current=location]:text-foreground border-border aria-[current=location]:border-tint block border-l py-2 pl-4 text-sm"
                            href={`#${section.id}`}
                        >
                            {section.title}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export function Article({
    actions,
    aside,
    badges = true,
    children,
    dated,
    hub,
    lead,
    related,
    sections,
    title,
}: {
    actions?: ReactNode;
    aside?: ReactNode;
    badges?: boolean;
    children?: ReactNode;
    dated?: { day: Date; label: "checkedOn" | "updatedOn" };
    hub: "/compare" | "/guides" | "/tools";
    lead: ReactNode;
    related: readonly PageRef[];
    sections: readonly ArticleSection[];
    title: ReactNode;
}) {
    useMotionScan();
    const { labels } = useIntlayer("answers");
    const { locale } = useLocale();
    const cards = useRelated(related);
    return (
        <main className={`${CONTAINER} pt-24 pb-24`} id="main">
            <header className="mt-16 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
                <div className={aside ? "lg:col-span-7" : "lg:col-span-12"}>
                    <p data-reveal>
                        <HubTrail hub={hub} />
                    </p>
                    <h1
                        className="hero-text mt-6 max-w-[680px] pb-2 text-4xl font-semibold tracking-tighter delay-100 md:text-6xl"
                        data-reveal
                    >
                        {title}
                    </h1>
                    <p className="text-muted mt-6 max-w-[680px] text-lg delay-200 md:text-xl" data-reveal>
                        {lead}
                    </p>
                    <p className="text-muted mt-8 font-mono text-xs tracking-widest uppercase delay-300" data-reveal>
                        <LocalizedLink className="fluid hover:text-foreground" hash="maker" to="/about">
                            {labels.byline}
                        </LocalizedLink>
                        {dated ? (
                            <>
                                {" · "}
                                <time dateTime={dated.day.toISOString().slice(0, 10)}>
                                    {labels[dated.label]({ date: longDate(dated.day, LANGUAGES[locale].date) })}
                                </time>
                            </>
                        ) : null}
                    </p>
                    {actions || badges ? (
                        <div className="mt-10 delay-300" data-reveal>
                            {actions ?? <StoreBadges placement="intro" />}
                        </div>
                    ) : null}
                </div>
                {aside ? (
                    <div className="delay-200 lg:col-span-5" data-reveal>
                        {aside}
                    </div>
                ) : null}
            </header>
            <div className={`${COLUMNS} mt-16 md:mt-24`}>
                <Contents sections={sections} />
                <div className="flex min-w-0 flex-col gap-16 md:gap-24">
                    {children ? <div>{children}</div> : null}
                    {sections.map((section) => (
                        <section className="scroll-mt-24" id={section.id} key={section.id}>
                            <h2 className={H2} data-reveal>
                                {section.title}
                            </h2>
                            {section.body}
                        </section>
                    ))}
                </div>
            </div>
            <section
                aria-labelledby="get-outlayr"
                className="bg-surface mt-24 rounded-3xl px-6 py-16 md:px-16 md:py-24"
            >
                <h2
                    className="hero-text max-w-[680px] pb-2 text-4xl font-semibold tracking-tighter md:text-6xl"
                    data-reveal
                    id="get-outlayr"
                >
                    {labels.cta.title}
                </h2>
                <p className="text-muted mt-6 max-w-[680px] text-lg delay-100 md:text-xl" data-reveal>
                    {labels.cta.lead}
                </p>
                <div className="mt-10 delay-200" data-reveal>
                    <StoreBadges placement="answer" />
                </div>
            </section>
            <section aria-labelledby="keep-reading" className="mt-24">
                <h2 className={H2} data-reveal id="keep-reading">
                    {labels.related}
                </h2>
                <ul className="mt-8 grid gap-4 md:grid-cols-3">
                    {cards.map((item, index) => (
                        <li className={DELAYS[index]} data-reveal key={item.slug}>
                            <AnswerCard heading="h3" item={item} />
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
