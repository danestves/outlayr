import { Link, createFileRoute } from "@tanstack/react-router";
import { getIntlayer, getPrefix } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import { Page } from "@/components/page";
import { LANGUAGES, localeFromParam, pageUrl } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { listPosts, postDay } from "@/lib/posts";
import { hubTrail, itemList, ldJson, pageMeta } from "@/lib/seo";
import { SOURCE_URL, X_URL } from "@/lib/site";

type Listed = Awaited<ReturnType<typeof listPosts>>[number];

const LINK = "fluid hover:text-foreground underline decoration-current/25 underline-offset-4 hover:decoration-tint";

export const Route = createFileRoute("/{-$locale}/blog/")({
    component: Blog,
    loader: ({ params }) => listPosts({ data: localeFromParam(params.locale) }),
    head: ({ loaderData = [], params }) => {
        const locale = localeFromParam(params.locale);
        const blog = getIntlayer("blog", locale);
        const items = loaderData.map((post) => ({ name: post.title, url: pageUrl(`/blog/${post.slug}`, locale) }));
        return {
            links: [
                {
                    href: pageUrl("/blog/rss.xml", locale),
                    rel: "alternate",
                    title: blog.title,
                    type: "application/rss+xml",
                },
            ],
            meta: pageMeta(blog.meta.title, blog.lead),
            scripts: [ldJson(itemList(items)), ldJson(hubTrail(locale, "blog"))],
        };
    },
});

function byMonth(posts: readonly Listed[], locale: Locale) {
    const months = Map.groupBy(posts, (post) => post.date.slice(0, 7));
    return [...months].map(([key, entries]) => {
        const label = postDay(`${key}-01`).toLocaleDateString(LANGUAGES[locale].date, {
            month: "long",
            timeZone: "UTC",
            year: "numeric",
        });
        return { entries, key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
}

function Blog() {
    const posts = Route.useLoaderData();
    const blog = useIntlayer("blog");
    const { locale } = useLocale();
    const { localePrefix } = getPrefix(locale);

    return (
        <Page lead={blog.lead} title={blog.title}>
            <p className="text-muted mt-6 font-mono text-xs delay-200" data-reveal>
                <a className={LINK} href={pageUrl("/blog/rss.xml", locale)}>
                    RSS
                </a>
                {" · "}
                <a className={LINK} href={X_URL}>
                    X
                </a>
                {" · "}
                <a className={LINK} href={SOURCE_URL}>
                    GitHub
                </a>
            </p>
            {byMonth(posts, locale).map((month) => (
                <section
                    aria-labelledby={`month-${month.key}`}
                    className="border-foreground mt-16 grid gap-6 border-t pt-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16"
                    data-reveal
                    key={month.key}
                >
                    <h2 className="font-mono text-sm font-medium" id={`month-${month.key}`}>
                        {month.label}
                    </h2>
                    <ol>
                        {month.entries.map((post) => (
                            <li
                                className="border-border grid gap-x-6 gap-y-2 border-b py-7 first:pt-0 last:border-b-0 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
                                key={post.slug}
                            >
                                <time className="text-muted pt-1.5 font-mono text-xs" dateTime={post.date}>
                                    {postDay(post.date).toLocaleDateString(LANGUAGES[locale].date, {
                                        day: "numeric",
                                        timeZone: "UTC",
                                        weekday: "short",
                                    })}
                                </time>
                                <div className="group relative">
                                    <h3 className="text-xl font-semibold tracking-tight text-balance md:text-2xl">
                                        <Link
                                            className="fluid group-hover:text-tint focus-visible:after:outline-tint after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-solid"
                                            params={{ locale: localePrefix, slug: post.slug }}
                                            to="/{-$locale}/blog/$slug"
                                        >
                                            {post.title}
                                        </Link>
                                    </h3>
                                    <p className="text-muted mt-2 max-w-[65ch]">{post.lead}</p>
                                    <p className="text-muted mt-3 font-mono text-xs">
                                        {post.shipped.map((change) => (
                                            <span className="text-foreground mr-2" key={change.pr}>
                                                #{change.pr}
                                            </span>
                                        ))}
                                        {post.shipped.length > 0 ? "· " : null}
                                        {blog.minutes({ minutes: String(post.minutes) })}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}
        </Page>
    );
}
