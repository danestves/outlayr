import { expect, test } from "vite-plus/test";

import index from "../public/.well-known/agent-skills/index.json";

const files = import.meta.glob<string>("../public/.well-known/agent-skills/*/SKILL.md", {
    eager: true,
    import: "default",
    query: "?raw",
});

async function sha256(text: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

test("every published SKILL.md is indexed with its frontmatter and digest", async () => {
    expect(index.skills.map((skill) => `../public${skill.url}`).toSorted()).toEqual(Object.keys(files).toSorted());

    for (const skill of index.skills) {
        const text = files[`../public${skill.url}`] ?? "";
        expect(text).toContain(`\nname: ${skill.name}\n`);
        expect(text).toContain(`\ndescription: ${skill.description}\n`);
        expect(skill.digest).toBe(`sha256:${await sha256(text)}`);
    }
});
