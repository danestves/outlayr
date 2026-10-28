import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vite-plus/test";

import { PRIVACY_SECTIONS } from "./legal-url";

const LEGAL_DIR = join(import.meta.dirname, "..", "..", "..", "web", "content", "legal");
const HEADING = /^#{2,6}\s+(.+)$/gm;

const headingIds = (markdown: string) =>
    [...markdown.matchAll(HEADING)].map(([, title]) =>
        title
            .toLowerCase()
            .replaceAll(/[^\p{L}\p{N}\s-]/gu, "")
            .replaceAll(/\s/g, "-")
    );

test.each(["en", "es"] as const)("links to privacy sections that exist on the %s page", (language) => {
    const ids = headingIds(readFileSync(join(LEGAL_DIR, language, "privacy.mdx"), "utf-8"));
    for (const section of Object.values(PRIVACY_SECTIONS)) {
        expect(ids).toContain(section[language]);
    }
});
