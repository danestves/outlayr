import path from "node:path";

import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import * as Schema from "effect/Schema";
import GithubSlugger from "github-slugger";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

const HEADING = /^(#{1,6})\s+(.+)$/;

const decodeLocale = Schema.decodeUnknownSync(Schema.Literals(["en", "es"]));
const decodeSlug = Schema.decodeUnknownSync(Schema.Literals(["terms", "privacy", "delete-account"]));

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

export default defineConfig({ content: [legal] });
