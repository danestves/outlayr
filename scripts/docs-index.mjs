import { globSync, readFileSync } from "node:fs";

const index = readFileSync("docs/README.md", "utf-8");
const missing = globSync("docs/{internals,operations}/**/*.md").filter(
    (file) => !index.includes(`(./${file.slice("docs/".length)})`)
);
if (missing.length > 0) {
    console.error(`List these in docs/README.md:\n${missing.join("\n")}`);
    process.exitCode = 1;
}
