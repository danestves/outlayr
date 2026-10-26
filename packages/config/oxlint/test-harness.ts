import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Diagnostic {
    code: string;
    message: string;
}

const PLUGIN = fileURLToPath(new URL("plugin.mjs", import.meta.url));
const require = createRequire(import.meta.url);
const OXLINT_BIN = join(
    dirname(createRequire(require.resolve("vite-plus/package.json")).resolve("oxlint/package.json")),
    "bin",
    "oxlint"
);

export function lint(rule: string, filename: string, source: string): Diagnostic[] {
    const dir = mkdtempSync(join(tmpdir(), "outlayr-rule-"));
    try {
        const config = join(dir, ".oxlintrc.json");
        writeFileSync(
            config,
            JSON.stringify({
                categories: { correctness: "off" },
                jsPlugins: [{ name: "outlayr", specifier: PLUGIN }],
                options: { reportUnusedDisableDirectives: "error" },
                rules: { [`outlayr/${rule}`]: "error" },
            })
        );
        const file = join(dir, filename);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, source);
        let stdout: string;
        try {
            stdout = execFileSync(process.execPath, [OXLINT_BIN, "--config", config, "--format", "json", file], {
                cwd: dir,
                encoding: "utf-8",
                stdio: ["ignore", "pipe", "pipe"],
            });
        } catch (error) {
            if (!(error instanceof Error && "stdout" in error && typeof error.stdout === "string")) {
                throw error;
            }
            ({ stdout } = error);
        }
        const report: { diagnostics: Diagnostic[] } = JSON.parse(stdout);
        return report.diagnostics;
    } finally {
        rmSync(dir, { force: true, recursive: true });
    }
}
