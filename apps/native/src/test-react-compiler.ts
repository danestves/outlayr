import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, sep } from "node:path";

import { describe, expect, it } from "@jest/globals";

interface CompilerEvent {
    data?: string;
    detail?: { options?: { category?: string; loc?: { start?: { line?: number } } | null; reason?: string } };
    kind: string;
}

const KNOWN_BAILOUTS = [
    "src/components/transaction-form/index.tsx",
    "src/components/transaction-form/stage/step-account-installments.tsx",
    "src/components/transaction-form/use-installment-order.tsx",
    "src/data/live-query.ts",
    "src/hooks/use-receipt-scan.ts",
    "src/lib/ledger-adoption.tsx",
    "src/screens/debts/new-debt-form.tsx",
    "src/screens/debts/use-owe-form.ts",
    "src/screens/installments/pay-form.tsx",
    "src/screens/installments/use-fee-editor.ts",
    "src/screens/paywall/index.tsx",
];

const COVERAGE_SHARDS = 4;
const NATIVE_ROOT = join(__dirname, "..");
const SOURCE = /\.tsx?$/;
const NOT_SHIPPED = /\.(?:test\.tsx?|d\.ts)$/;
const BAILOUT_KINDS = new Set(["CompileError", "CompileSkip", "PipelineError"]);

const presetPath = createRequire(join(NATIVE_ROOT, "package.json")).resolve("babel-preset-expo");

let events: CompilerEvent[] = [];
const options = {
    babelrc: false,
    caller: {
        bundler: "metro",
        isDev: false,
        isNodeModule: false,
        isServer: false,
        name: "metro",
        platform: "ios",
        supportsReactCompiler: true,
        supportsStaticESM: true,
    },
    code: false,
    configFile: join(NATIVE_ROOT, "babel.config.js"),
    cwd: NATIVE_ROOT,
    envName: "production",
    presets: [
        [
            presetPath,
            {
                "react-compiler": {
                    logger: {
                        logEvent: (_file: string, event: CompilerEvent) => {
                            events.push(event);
                        },
                    },
                },
            },
        ],
    ],
};

const babel: { transformFileSync: (file: string, babelOptions: typeof options) => unknown } =
    createRequire(presetPath)("@babel/core");

function compilerBailouts(file: string): string[] {
    events = [];
    babel.transformFileSync(join(NATIVE_ROOT, file), options);
    return events
        .filter((event) => BAILOUT_KINDS.has(event.kind))
        .map((event) => {
            const { category = event.kind, loc, reason = event.data ?? "" } = event.detail?.options ?? {};
            return `line ${loc?.start?.line ?? "?"}: ${category} ${reason}`;
        });
}

const sourceFiles = readdirSync(join(NATIVE_ROOT, "src"), { encoding: "utf-8", recursive: true })
    .filter((file) => SOURCE.test(file) && !NOT_SHIPPED.test(file))
    .map((file) => `src/${file.split(sep).join("/")}`)
    .sort();

export function describeCompilerCoverage(shard: number) {
    const inShard = (_file: string, index: number) => index % COVERAGE_SHARDS === shard;
    const compiled = sourceFiles.filter(inShard).filter((file) => !KNOWN_BAILOUTS.includes(file));

    describe("React Compiler coverage", () => {
        it.each(compiled)("compiles %s", (file) => {
            expect(compilerBailouts(file)).toEqual([]);
        });

        it.each(KNOWN_BAILOUTS.filter(inShard))("still bails out on %s, or it leaves KNOWN_BAILOUTS", (file) => {
            expect(compilerBailouts(file)).not.toEqual([]);
        });
    });
}
