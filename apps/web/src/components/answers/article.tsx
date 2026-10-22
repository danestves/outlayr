import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { AnswerCard } from "@/components/answer-hub";
import type { AnswerItem } from "@/components/answer-hub";
import { HubTrail } from "@/components/hub-trail";
import { ASIDE, COLUMNS } from "@/components/page";
import { StoreBadges } from "@/components/store-badges";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES } from "@/lib/i18n";
import { CONTAINER } from "@/lib/layout";
import { useMotionScan } from "@/lib/motion";
import { longDate } from "@/lib/site";

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

export function nextAfter<T extends object>(record: T, slug: string, count: number) {
    const slugs = Object.keys(record);
    const at = slugs.indexOf(slug);
    return [...slugs.slice(at + 1), ...slugs.slice(0, at)].filter((key) => hasKey(record, key)).slice(0, count);
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
    checked,
    children,
    hub,
    lead,
    related,
    sections,
    title,
}: {
    actions?: ReactNode;
    aside?: ReactNode;
    checked?: Date;
    children?: ReactNode;
    hub: "/compare" | "/guides" | "/tools";
    lead: ReactNode;
    related: readonly AnswerItem[];
    sections: readonly ArticleSection[];
    title: ReactNode;
}) {
    useMotionScan();
    const { labels } = useIntlayer("answers");
    const { locale } = useLocale();
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
                    {checked ? (
                        <p
                            className="text-muted mt-8 font-mono text-xs tracking-widest uppercase delay-300"
                            data-reveal
                        >
                            <time dateTime={checked.toISOString().slice(0, 10)}>
                                {labels.checkedOn({ date: longDate(checked, LANGUAGES[locale].date) })}
                            </time>
                        </p>
                    ) : null}
                    {actions ? (
                        <div className="mt-10 delay-300" data-reveal>
                            {actions}
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
                    {related.map((item, index) => (
                        <li className={DELAYS[index]} data-reveal key={item.slug}>
                            <AnswerCard heading="h3" item={item} />
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
