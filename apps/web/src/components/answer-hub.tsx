import { Link } from "@tanstack/react-router";
import { getPrefix } from "intlayer";
import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import { Icon } from "./icon";
import { Page } from "./page";
import { StoreBadges } from "./store-badges";

export interface AnswerItem {
    kicker?: ReactNode;
    name: ReactNode;
    slug: string;
    text: ReactNode;
    to: "/{-$locale}/compare/$slug" | "/{-$locale}/guides/$slug" | "/{-$locale}/tools/$slug";
}

const SPANS = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"] as const;

export function AnswerCard({ heading: Heading, item }: { heading: "h2" | "h3"; item: AnswerItem }) {
    const { locale } = useLocale();
    return (
        <div
            className="fluid bg-surface group flex h-full flex-col justify-between gap-8 rounded-3xl p-6 md:min-h-56 md:gap-12 md:p-8"
            data-spot
        >
            <div>
                {item.kicker ? (
                    <p className="text-muted mb-4 font-mono text-xs tracking-widest uppercase" data-kicker>
                        {item.kicker}
                    </p>
                ) : null}
                <Heading className="text-2xl font-semibold tracking-tight">
                    <Link
                        className="focus-visible:after:outline-tint after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-solid"
                        params={{ locale: getPrefix(locale).localePrefix, slug: item.slug }}
                        to={item.to}
                    >
                        {item.name}
                    </Link>
                </Heading>
                <p className="text-muted mt-3 line-clamp-2 max-w-md">{item.text}</p>
            </div>
            <span
                aria-hidden="true"
                className="bg-raised flex size-10 items-center justify-center self-end rounded-full"
            >
                <Icon className="fluid group-hover:translate-x-0.5" name="arrow-right" />
            </span>
        </div>
    );
}

export function AnswerHub({ items, lead, title }: { items: readonly AnswerItem[]; lead: ReactNode; title: ReactNode }) {
    const lone = items.length % 2 === 1 ? items.length - 1 : -1;
    return (
        <Page lead={lead} title={title}>
            <div className="mt-10 delay-300" data-reveal>
                <StoreBadges placement="answer" />
            </div>
            <ul className="mt-16 grid gap-4 md:mt-24 md:grid-cols-2 lg:grid-cols-12">
                {items.map((item, index) => (
                    <li
                        className={`${index === lone ? "md:col-span-2 lg:col-span-12" : SPANS[index % SPANS.length]} ${index % 2 === 1 ? "delay-100" : ""}`}
                        data-reveal
                        key={item.slug}
                    >
                        <AnswerCard heading="h2" item={item} />
                    </li>
                ))}
            </ul>
        </Page>
    );
}
