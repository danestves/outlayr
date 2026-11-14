import { capture } from "@outlayr/shared/analytics";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { SUPPORT_EMAIL } from "@outlayr/shared/urls";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useId, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { Page } from "@/components/page";
import { fold } from "@/lib/fold";
import { faqPage, ldJson, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/support")({
    component: Support,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { answers, meta } = getIntlayer("support", locale);
        return {
            meta: pageMeta(meta.title, meta.description),
            scripts: [ldJson(faqPage(answers, LANGUAGES[locale].lang))],
        };
    },
});

function EmailButton() {
    return (
        <a
            className="fluid bg-foreground text-background inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold hover:-translate-y-0.5 active:translate-y-px"
            href={`mailto:${SUPPORT_EMAIL}`}
            onClick={() => capture("support_email_clicked")}
        >
            <Icon name="envelope-simple" />
            {SUPPORT_EMAIL}
        </a>
    );
}

function Support() {
    const { answers, filter, intro, title } = useIntlayer("support");
    const [query, setQuery] = useState("");
    const inputId = useId();
    const words = fold(query).split(" ").filter(Boolean);
    const shown = answers.map((item) => {
        const text = fold(`${item.question.value} ${item.answer.value}`);
        return words.every((word) => text.includes(word));
    });
    const none = !shown.includes(true);
    return (
        <Page lead={intro} title={title}>
            <div className="mt-10 delay-300" data-reveal>
                <EmailButton />
            </div>
            <section className="mt-24">
                <search className="relative block max-w-md" data-reveal>
                    <label className="sr-only" htmlFor={inputId}>
                        {filter.label}
                    </label>
                    <Icon
                        className="text-muted pointer-events-none absolute top-1/2 left-5 -translate-y-1/2"
                        name="magnifying-glass"
                    />
                    <input
                        autoComplete="off"
                        className="fluid bg-surface placeholder:text-muted focus-visible:bg-raised w-full rounded-full py-3 pr-5 pl-12 text-base outline-offset-0"
                        id={inputId}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={filter.placeholder.value}
                        type="search"
                        value={query}
                    />
                </search>
                <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
                    {answers.map((item, index) => (
                        <div
                            className={index % 2 === 1 ? "delay-100" : undefined}
                            data-reveal
                            hidden={!shown[index]}
                            key={item.question.value}
                        >
                            <dt className="text-lg font-semibold">{item.question}</dt>
                            <dd className="text-muted mt-2 text-base">{item.answer}</dd>
                        </div>
                    ))}
                </dl>
                <div aria-live="polite">
                    {none ? (
                        <div className="bg-surface flex flex-col items-start gap-6 rounded-3xl p-6 md:flex-row md:items-center md:justify-between md:p-8">
                            <div className="flex gap-4">
                                <Icon className="text-tint mt-0.5 shrink-0 text-2xl" name="magnifying-glass" />
                                <div>
                                    <p className="text-lg font-semibold">{filter.empty({ query: query.trim() })}</p>
                                    <p className="text-muted mt-2">{filter.emptyHint}</p>
                                </div>
                            </div>
                            <EmailButton />
                        </div>
                    ) : null}
                </div>
            </section>
        </Page>
    );
}
