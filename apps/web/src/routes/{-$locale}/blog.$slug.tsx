import { MDXContent } from "@content-collections/mdx/react";
import { Link, createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import type { Post } from "content-collections";
import { getLocalizedUrl, getPrefix } from "intlayer";
import type { ComponentProps } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { HubTrail } from "@/components/hub-trail";
import { Icon } from "@/components/icon";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { CONTAINER } from "@/lib/layout";
import { scanMotion } from "@/lib/motion";
import { getPost, postDay } from "@/lib/posts";
import { answerTrail, article, ldJson, pageMeta } from "@/lib/seo";
import { SOURCE_URL } from "@/lib/site";

export const Route = createFileRoute("/{-$locale}/blog/$slug")({
    component: BlogPost,
    loader: async ({ params }) => {
        const post = await getPost({ data: { locale: localeFromParam(params.locale), slug: params.slug } });
        if (!post) {
            throw notFound({ routeId: rootRouteId });
        }
        return post;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return {};
        }
        const locale = localeFromParam(params.locale);
        const published = postDay(loaderData.published);
        return {
            meta: [
                ...pageMeta(`${loaderData.title} · Outlayr`, loaderData.description),
                { content: loaderData.published, property: "article:published_time" },
            ],
            scripts: [
                ldJson(
                    article(locale, `/blog/${loaderData.slug}`, {
                        dateModified: published,
                        datePublished: published,
                        description: loaderData.description,
                        headline: loaderData.title,
                    })
                ),
                ldJson(answerTrail(locale, "blog", loaderData.slug, loaderData.title)),
            ],
        };
    },
});

function MdxLink({ children, href = "" }: ComponentProps<"a">) {
    const { locale } = useLocale();
    return href.startsWith("/") ? (
        <Link to={getLocalizedUrl(href, locale)}>{children}</Link>
    ) : (
        <a href={href}>{children}</a>
    );
}

function MdxTable(props: ComponentProps<"table">) {
    return (
        <div>
            <table {...props} />
        </div>
    );
}

const COMPONENTS = { a: MdxLink, table: MdxTable };

function Shift({ figure }: { figure: NonNullable<Post["figure"]> }) {
    return (
        <p className="mt-12 flex flex-wrap items-end gap-x-8 gap-y-4 font-mono">
            <span>
                <del className="text-muted text-4xl tracking-tighter decoration-2 md:text-5xl">{figure.from.value}</del>
                <span className="text-muted mt-2 block text-xs">{figure.from.label}</span>
            </span>
            <span>
                <ins className="text-tint text-6xl font-medium tracking-tighter no-underline md:text-8xl">
                    {figure.to.value}
                </ins>
                <span className="text-muted mt-2 block text-xs">{figure.to.label}</span>
            </span>
        </p>
    );
}

function BlogPost() {
    const post = Route.useLoaderData();
    const blog = useIntlayer("blog");
    const { locale } = useLocale();
    const { date } = LANGUAGES[locale];
    const day = postDay(post.date);

    return (
        <main className={`${CONTAINER} pt-24 pb-24`} id="main" ref={scanMotion}>
            <article className="mx-auto mt-16 max-w-[680px]">
                <header data-reveal>
                    <HubTrail hub="/blog" />
                    <h1 className="mt-6 text-4xl font-semibold tracking-tighter text-balance md:text-5xl">
                        {post.title}
                    </h1>
                    <p className="text-muted mt-6 font-mono text-xs">
                        Daniel Esteves ·{" "}
                        <time dateTime={post.date}>
                            {day.toLocaleDateString(date, {
                                day: "numeric",
                                month: "short",
                                timeZone: "UTC",
                                weekday: "short",
                                year: "numeric",
                            })}
                        </time>{" "}
                        · {blog.minutes({ minutes: String(post.minutes) })}
                    </p>
                    {post.figure ? <Shift figure={post.figure} /> : null}
                </header>
                <div className="post-body mt-12">
                    <MDXContent code={post.mdx} components={COMPONENTS} />
                </div>
                {post.shipped.length > 0 ? (
                    <section aria-labelledby="shipped" className="border-foreground mt-16 border-t">
                        <h2 className="text-muted py-4 font-mono text-xs font-normal" id="shipped">
                            {blog.shipped}
                        </h2>
                        <ul>
                            {post.shipped.map((change) => (
                                <li key={change.pr}>
                                    <a
                                        className="fluid border-border hover:text-tint grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-4 border-b py-3"
                                        href={`${SOURCE_URL}/pull/${change.pr}`}
                                    >
                                        <span className="font-mono text-sm">#{change.pr}</span>
                                        <span>{change.title}</span>
                                        <time className="text-muted font-mono text-xs" dateTime={change.date}>
                                            {postDay(change.date).toLocaleDateString(date, {
                                                day: "numeric",
                                                month: "short",
                                                timeZone: "UTC",
                                            })}
                                        </time>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}
                {post.next ? (
                    <Link
                        className="fluid border-border group mt-16 flex items-center justify-between gap-6 border-y py-5"
                        params={{ locale: getPrefix(locale).localePrefix, slug: post.next.slug }}
                        to="/{-$locale}/blog/$slug"
                    >
                        <span>
                            <span className="text-muted block font-mono text-xs">{blog.next}</span>
                            <span className="fluid group-hover:text-tint mt-1 block text-lg font-semibold tracking-tight">
                                {post.next.title}
                            </span>
                        </span>
                        <Icon className="fluid text-muted group-hover:translate-x-0.5" name="arrow-right" />
                    </Link>
                ) : null}
            </article>
        </main>
    );
}
