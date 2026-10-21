// Lists every function React Compiler bails out on in `src`, with the plugin and options babel-preset-expo uses.
//   node --import tsx scripts/perf/compiler-bailouts.ts [--only <path suffix>,...]
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

interface SourceLocation {
    start?: { line?: number };
}

interface Diagnostic {
    category?: string;
    description?: string | null;
    details?: Diagnostic[];
    loc?: SourceLocation | null;
    options?: Diagnostic;
    reason?: string;
}

interface CompilerEvent {
    detail?: Diagnostic;
    fnLoc?: SourceLocation | null;
    kind: string;
    reason?: string;
}

interface TransformOptions {
    babelrc: false;
    configFile: false;
    filename: string;
    parserOpts: { plugins: string[] };
    plugins: unknown[];
    sourceType: "module";
}

interface Babel {
    transformSync: (source: string, options: TransformOptions) => unknown;
}

const BAILOUT_KINDS = new Set(["CompileError", "CompileSkip", "PipelineError"]);
const SOURCE_FILE = /\.tsx?$/;
const NOT_APP_CODE = /\.test\.|\.d\.ts$/;

const { values: args } = parseArgs({ options: { only: { type: "string" } } });
const only = args.only?.split(",");

const nativeRoot = resolve(import.meta.dirname, "../..");
const requireFromPreset = createRequire(
    join(realpathSync(join(nativeRoot, "node_modules/babel-preset-expo")), "package.json")
);
const babel: Babel = requireFromPreset("@babel/core");
const compiler: unknown = requireFromPreset("babel-plugin-react-compiler");

// getReactCompilerPlugin in babel-preset-expo, as it runs for a release build.
const compilerOptions = {
    customOptOutDirectives: ["widget", "use no memo", "use no forget"],
    environment: { enableResetCacheOnSourceFileChanges: false },
    panicThreshold: "NONE",
    target: "19",
};

const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true })
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .flatMap((entry) => {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) {
                return walk(path);
            }
            return SOURCE_FILE.test(entry.name) && !NOT_APP_CODE.test(entry.name) ? [path] : [];
        });

const describe = (diagnostic: Diagnostic) => {
    const { category = "", description, reason = "" } = diagnostic.options ?? diagnostic;
    return `${category}: ${reason}${description ? ` (${description})` : ""}`;
};

const files = walk(join(nativeRoot, "src")).filter(
    (file) => only === undefined || only.some((suffix) => file.endsWith(suffix))
);
const bailouts = new Map<string, Set<string>>();
let compiled = 0;

const report = (where: string, reasons: string[]) => {
    const known = bailouts.get(where) ?? new Set<string>();
    for (const reason of reasons) {
        known.add(reason);
    }
    bailouts.set(where, known);
};

const logger = {
    logEvent(filename: string, event: CompilerEvent) {
        if (event.kind === "CompileSuccess") {
            compiled += 1;
            return;
        }
        if (!BAILOUT_KINDS.has(event.kind)) {
            return;
        }
        const line = event.fnLoc?.start?.line ?? event.detail?.loc?.start?.line ?? "?";
        report(
            `${relative(nativeRoot, filename)}:${line}`,
            event.detail === undefined
                ? [event.reason ?? event.kind]
                : (event.detail.details ?? [event.detail]).map(describe)
        );
    },
};

for (const file of files) {
    try {
        babel.transformSync(readFileSync(file, "utf-8"), {
            babelrc: false,
            configFile: false,
            filename: file,
            parserOpts: { plugins: ["typescript", "jsx"] },
            plugins: [[compiler, { ...compilerOptions, logger }]],
            sourceType: "module",
        });
    } catch (error) {
        report(relative(nativeRoot, file), [
            `BabelError: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
        ]);
    }
}

const lines = [...bailouts].map(([where, reasons]) => `${where}\t${[...reasons].join(" | ")}`);
process.stdout.write(
    `${lines.join("\n")}\n\n${bailouts.size} functions bail out in ${files.length} files, ${compiled} compiled\n`
);
