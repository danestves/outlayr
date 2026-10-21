import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const nativeRoot = resolve(import.meta.dirname, "..");

// Builds the intlayer dictionaries first: `.intlayer/` is gitignored, so a fresh checkout's export fails without it.
export function readIosBundle<T>(read: (bundle: string, map: string) => T): T {
    const outDir = mkdtempSync(join(tmpdir(), "outlayr-bundle-"));
    try {
        execFileSync("npx", ["intlayer", "build"], { cwd: nativeRoot, stdio: ["ignore", "ignore", "inherit"] });
        execFileSync(
            "npx",
            ["expo", "export", "--platform", "ios", "--output-dir", outDir, "--source-maps", "--no-bytecode"],
            { cwd: nativeRoot, stdio: ["ignore", "ignore", "inherit"] }
        );
        const jsDir = join(outDir, "_expo", "static", "js", "ios");
        const bundleName = readdirSync(jsDir).find((name) => name.endsWith(".js"));
        if (!bundleName) {
            throw new Error(`expo export wrote no .js bundle under ${jsDir}`);
        }
        return read(
            readFileSync(join(jsDir, bundleName), "utf-8"),
            readFileSync(join(jsDir, `${bundleName}.map`), "utf-8")
        );
    } finally {
        rmSync(outDir, { force: true, recursive: true });
    }
}
