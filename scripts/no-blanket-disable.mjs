import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import ts from "typescript";

// Codegen output carries a blanket directive upstream and is rewritten by its generator.
const GENERATED = /(?:^|\/)_generated\/|\.gen\.ts$/u;
const EXTENSIONS = ["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"];
const DIRECTIVE = /^(?:oxlint|eslint)-disable(?:-next-line|-line)?(?<rest>.*)$/u;

const lines = (text) => text.split(/\r\n|[\n\r\u2028\u2029]/u);

const blanketApplies = (rest) => {
    const trimmed = rest.trim();
    return trimmed === "" || trimmed.startsWith("--");
};

// Disabling the lock turns it off too, so it can't report the directive that waives a locked rule.
const namesLock = (rest) => /(?:^|[\s,])outlayr\/locked-rules(?:[\s,]|$)/u.test(rest.split("--")[0]);

const KINDS = { ".jsx": ts.ScriptKind.JSX, ".ts": ts.ScriptKind.TS, ".tsx": ts.ScriptKind.TSX };

// A parser's comment ranges, so a "/*" inside a string or regex can't swallow a real directive.
const commentsOf = (file, text) => {
    const extension = file.slice(file.lastIndexOf("."));
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, KINDS[extension] ?? ts.ScriptKind.JS);
    const found = new Map();
    const jsxText = [];
    const collect = (pos, end) => found.set(pos, text.slice(pos, end));
    const visit = (node) => {
        if (node.kind === ts.SyntaxKind.JsxText) {
            jsxText.push(node);
        }
        ts.forEachLeadingCommentRange(text, node.pos, collect);
        ts.forEachTrailingCommentRange(text, node.end, collect);
        for (const child of node.getChildren(source)) {
            visit(child);
        }
    };
    visit(source);
    return [...found]
        .filter(([pos]) => !jsxText.some((node) => pos >= node.pos && pos < node.end))
        .map(([pos, comment]) => ({ comment, line: source.getLineAndCharacterOfPosition(pos).line + 1 }));
};

const reports = (file) => {
    const found = [];
    for (const { comment, line } of commentsOf(file, readFileSync(file, "utf-8"))) {
        const block = comment.startsWith("/*");
        const body = block ? comment.slice(2, -2) : comment.slice(2);
        const entries = lines(body).map((raw) => raw.replace(/^\s*\*?\s*/u, ""));
        for (const [offset, entry] of entries.entries()) {
            const directive = DIRECTIVE.exec(entry);
            if (directive === null) {
                continue;
            }
            // A block directive can carry its rules and reason on the lines after it.
            const rest = [directive.groups.rest, ...entries.slice(offset + 1)].join(" ");
            if (blanketApplies(rest) || namesLock(rest)) {
                found.push(`${file}:${line + offset}`);
            }
        }
    }
    return found;
};

const files = execFileSync("git", ["ls-files", "-z", ...EXTENSIONS], { encoding: "utf-8" })
    .split("\0")
    .filter((file) => file !== "" && !GENERATED.test(file));
const hits = files.flatMap(reports);
if (hits.length > 0) {
    console.error(
        `Name the rules in a disable directive, or delete it. A blanket one silences every rule, and naming outlayr/locked-rules silences the lock:\n${hits.join("\n")}`
    );
    process.exitCode = 1;
}
