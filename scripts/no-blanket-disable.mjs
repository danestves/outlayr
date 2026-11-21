import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Codegen output carries a blanket directive upstream and is rewritten by its generator.
const GENERATED = /(?:^|\/)_generated\/|\.gen\.ts$/u;
const EXTENSIONS = ["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"];
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu;
const DIRECTIVE = /^(?:oxlint|eslint)-disable(?:-next-line|-line)?(?<rest>.*)$/u;

const lines = (text) => text.split("\n");

const blanketApplies = (rest) => {
    const trimmed = rest.trim();
    return trimmed === "" || trimmed.startsWith("--");
};

const reports = (file) => {
    const text = readFileSync(file, "utf-8");
    const found = [];
    let line = 1;
    let cursor = 0;
    for (const commentMatch of text.matchAll(COMMENT)) {
        const [comment] = commentMatch;
        line += lines(text.slice(cursor, commentMatch.index)).length - 1;
        cursor = commentMatch.index + comment.length;
        const block = comment.startsWith("/*");
        const body = block ? comment.slice(2, -2) : comment.slice(2);
        for (const [offset, raw] of lines(body).entries()) {
            const entry = raw.replace(/^\s*\*?\s*/u, "");
            const directive = DIRECTIVE.exec(entry);
            if (directive && blanketApplies(directive.groups.rest)) {
                found.push(`${file}:${line + offset}`);
            }
        }
        line += lines(comment).length - 1;
    }
    return found;
};

const files = execFileSync("git", ["ls-files", "-z", ...EXTENSIONS], { encoding: "utf-8" })
    .split("\0")
    .filter((file) => file !== "" && !GENERATED.test(file));
const hits = files.flatMap(reports);
if (hits.length > 0) {
    console.error(
        `Name the rules in a disable directive, or delete it. A blanket one silences every rule:\n${hits.join("\n")}`
    );
    process.exitCode = 1;
}
