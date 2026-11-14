import type { Locale } from "@outlayr/shared/i18n";
import { createServerFn } from "@tanstack/react-start";
import { allPosts } from "content-collections";
import type { Post } from "content-collections";

export function postsIn(locale: Locale): Post[] {
    return allPosts
        .filter((post) => post.locale === locale)
        .toSorted((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function postDay(date: string): Date {
    return new Date(`${date}T00:00:00Z`);
}

export const listPosts = createServerFn({ method: "GET" })
    .validator((locale: Locale) => locale)
    .handler(({ data }) =>
        postsIn(data).map(({ date, lead, minutes, shipped, slug, title }) => ({
            date,
            lead,
            minutes,
            shipped,
            slug,
            title,
        }))
    );

export const getPost = createServerFn({ method: "GET" })
    .validator((input: Pick<Post, "locale" | "slug">) => input)
    .handler(({ data }) => {
        const posts = postsIn(data.locale);
        const index = posts.findIndex((post) => post.slug === data.slug);
        const post = posts[index];
        if (!post) {
            return null;
        }
        const next = posts[index + 1] ?? posts[index - 1];
        const { date, description, figure, lead, mdx, minutes, published = date, shipped, slug, title } = post;
        return {
            date,
            description,
            figure,
            lead,
            mdx,
            minutes,
            next: next ? { slug: next.slug, title: next.title } : null,
            published,
            shipped,
            slug,
            title,
        };
    });
