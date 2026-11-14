import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { allLegals } from "content-collections";
import type { Legal } from "content-collections";

export const getLegalDocument = createServerFn({ method: "GET" })
    .validator((input: Pick<Legal, "locale" | "slug">) => input)
    .handler(({ data }) => {
        const document = allLegals.find((entry) => entry.slug === data.slug && entry.locale === data.locale);
        if (!document) {
            throw notFound();
        }
        const { description, intro, mdx, slug, title, toc } = document;
        return { description, intro, mdx, slug, title, toc };
    });
