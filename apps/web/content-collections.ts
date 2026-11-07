import path from "node:path";

import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import * as Schema from "effect/Schema";
import GithubSlugger from "github-slugger";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

const HEADING = /^(#{1,6})\s+(.+)$/;
const WHITESPACE = /\s+/u;

const decodeLocale = Schema.decodeUnknownSync(Schema.Literals(["en", "es", "pt", "fr"]));
const decodeSlug = Schema.decodeUnknownSync(Schema.Literals(["terms", "privacy", "delete-account"]));
const IsoDay = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));
const Figure = Schema.Struct({ label: Schema.String, value: Schema.String });
const WORDS_PER_MINUTE = 220;

const legal = defineCollection({
    directory: "content/legal",
    include: "**/*.mdx",
    name: "legal",
    schema: Schema.toStandardSchemaV1(
        Schema.Struct({
            content: Schema.String,
            description: Schema.String,
            intro: Schema.String,
            title: Schema.String,
        })
    ),
    transform: async (document, context) => {
        const { _meta, content, ...frontmatter } = document;
        const slugger = new GithubSlugger();
        const toc = content.split("\n").flatMap((line) => {
            const [, level, title] = HEADING.exec(line) ?? [];
            if (!(level && title)) {
                return [];
            }
            const id = slugger.slug(title);
            return level === "##" ? [{ id, title }] : [];
        });
        return {
            ...frontmatter,
            locale: decodeLocale(_meta.directory),
            mdx: await compileMDX(context, document, { rehypePlugins: [rehypeSlug], remarkPlugins: [remarkGfm] }),
            slug: decodeSlug(path.basename(_meta.fileName, ".mdx")),
            toc,
        };
    },
});

const posts = defineCollection({
    directory: "content/posts",
    include: "**/*.mdx",
    name: "posts",
    schema: Schema.toStandardSchemaV1(
        Schema.Struct({
            content: Schema.String,
            date: IsoDay,
            description: Schema.String,
            figure: Schema.optionalKey(Schema.Struct({ from: Figure, to: Figure })),
            lead: Schema.String,
            published: Schema.optionalKey(IsoDay),
            shipped: Schema.Array(Schema.Struct({ date: IsoDay, pr: Schema.Int, title: Schema.String })),
            title: Schema.String,
        })
    ),
    transform: async (document, context) => {
        const { _meta, content, ...frontmatter } = document;
        const locale = decodeLocale(_meta.directory);
        for (const day of [frontmatter.date, frontmatter.published ?? frontmatter.date]) {
            const parsed = new Date(`${day}T00:00:00Z`);
            if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
                throw new Error(`content/posts/${_meta.filePath} has an impossible date, ${day}`);
            }
        }
        const siblings = await context.collection.documents();
        if (!siblings.some((other) => other._meta.fileName === _meta.fileName && other._meta.directory !== locale)) {
            throw new Error(`content/posts/${_meta.filePath} has no translation; write it in both en and es`);
        }
        return {
            ...frontmatter,
            locale,
            mdx: await compileMDX(context, document, { rehypePlugins: [rehypeSlug], remarkPlugins: [remarkGfm] }),
            minutes: Math.max(1, Math.round(content.split(WHITESPACE).length / WORDS_PER_MINUTE)),
            slug: path.basename(_meta.fileName, ".mdx"),
        };
    },
});

export default defineConfig({ content: [legal, posts] });
