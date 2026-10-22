import { createFileRoute } from "@tanstack/react-router";
import { defaultLocale, getIntlayer, locales } from "intlayer";

import { LANGUAGES, pageUrl } from "@/lib/i18n";
import { LEGAL_DAYS, rivalChecked } from "@/lib/site";

function pages(): [path: string, updated: Date | null][] {
    const { compare, guides } = getIntlayer("answers");
    const { pages: tools } = getIntlayer("tools");
    const rivals = Object.keys(compare).map((slug): [string, Date] => [`/compare/${slug}`, rivalChecked(slug)]);
    return [
        ["/", null],
        ["/support", null],
        ["/about", null],
        ["/terms", LEGAL_DAYS.terms],
        ["/privacy", LEGAL_DAYS.privacy],
        ["/delete-account", LEGAL_DAYS["delete-account"]],
        ["/guides", null],
        ["/compare", new Date(Math.max(...rivals.map(([, checked]) => checked.getTime())))],
        ["/tools", null],
        ...Object.keys(guides).map((slug): [string, null] => [`/guides/${slug}`, null]),
        ...Object.keys(tools).map((slug): [string, null] => [`/tools/${slug}`, null]),
        ...rivals,
    ];
}

function sitemap(): string {
    const list = pages();
    const urls = locales.flatMap((locale) =>
        list.map(([path, updated]) => {
            const alternates = [
                ...locales.map((alternate) => [LANGUAGES[alternate].hreflang, pageUrl(path, alternate)]),
                ["x-default", pageUrl(path, defaultLocale)],
            ].map(([hreflang, href]) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`);
            return [
                "<url>",
                `<loc>${pageUrl(path, locale)}</loc>`,
                updated === null ? "" : `<lastmod>${updated.toISOString().slice(0, 10)}</lastmod>`,
                ...alternates,
                "</url>",
            ].join("");
        })
    );
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...urls,
        "</urlset>",
    ].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
    server: {
        handlers: {
            GET: () =>
                new Response(sitemap(), {
                    headers: {
                        "cache-control": "public, max-age=3600",
                        "content-type": "application/xml; charset=utf-8",
                    },
                }),
        },
    },
});
