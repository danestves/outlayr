import { LANGUAGES, localeFromParam, pageUrl } from "@outlayr/shared/i18n";
import type { Locale } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer, validatePrefix } from "intlayer";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { postDay, postsIn } from "@/lib/posts";

const XML_SPECIAL = /[&<>"]/gu;
const XML_ENTITIES = new Map([
    ['"', "&quot;"],
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
]);

function escapeXml(text: string): string {
    return text.replaceAll(XML_SPECIAL, (char) => XML_ENTITIES.get(char) ?? char);
}

function cdata(html: string): string {
    return `<![CDATA[${html.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

async function postHtml(code: string, locale: Locale): Promise<string> {
    const { MDXContent } = await import("@content-collections/mdx/react");
    const a = ({ href = "", ...props }: ComponentProps<"a">) =>
        createElement("a", { ...props, href: href.startsWith("/") ? pageUrl(href, locale) : href });
    return renderToStaticMarkup(createElement(MDXContent, { code, components: { a } }));
}

async function feed(locale: Locale): Promise<string> {
    const blog = getIntlayer("blog", locale);
    const self = pageUrl("/blog/rss.xml", locale);
    const items = await Promise.all(
        postsIn(locale).map(async (post) => {
            const url = pageUrl(`/blog/${post.slug}`, locale);
            return [
                "<item>",
                `<title>${escapeXml(post.title)}</title>`,
                `<link>${url}</link>`,
                `<guid isPermaLink="true">${url}</guid>`,
                `<pubDate>${postDay(post.published ?? post.date).toUTCString()}</pubDate>`,
                `<description>${escapeXml(post.lead)}</description>`,
                `<content:encoded>${cdata(await postHtml(post.mdx, locale))}</content:encoded>`,
                "</item>",
            ].join("");
        })
    );
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
        "<channel>",
        `<title>${escapeXml(blog.title)} · Outlayr</title>`,
        `<link>${pageUrl("/blog", locale)}</link>`,
        `<description>${escapeXml(blog.lead)}</description>`,
        `<language>${LANGUAGES[locale].lang}</language>`,
        `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
        ...items,
        "</channel>",
        "</rss>",
    ].join("\n");
}

export const Route = createFileRoute("/{-$locale}/blog/rss.xml")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                const { isValid, localePrefix } = validatePrefix(params.locale);
                if (!isValid || localePrefix !== params.locale) {
                    return new Response("Not found", { status: 404 });
                }
                return new Response(await feed(localeFromParam(params.locale)), {
                    headers: {
                        "cache-control": "public, max-age=3600",
                        "content-type": "application/rss+xml; charset=utf-8",
                    },
                });
            },
        },
    },
});
