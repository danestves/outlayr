import { readFileSync } from "node:fs";

import { escalation, route } from "../src/route.ts";

interface Row {
    brandOk?: boolean | null;
    case: { name: string };
    categoryOk?: boolean | null;
    effort: string;
    error?: string;
    model: string;
    output?: { category: string | null; isNew: boolean };
    set: string;
    usage?: { inputTokens: number; outputTokens: number };
}

const PRICE = {
    "claude-haiku-5-5": { input: 0.1, output: 0.5 },
    "claude-sonnet-5-5": { input: 2, output: 10 },
} as const;
const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";
// Without measured usage a call costs its model's price ratio, which holds when both see the same prompt.
const FALLBACK_TOKENS = { inputTokens: 1_000_000, outputTokens: 0 };

const rows: Row[] = JSON.parse(readFileSync(process.argv[2] ?? "", "utf-8"));
const lowRows = rows.filter((row) => row.effort === "low" && row.error === undefined);

const dollars = (row: Row) => {
    const price = row.model === SONNET ? PRICE[SONNET] : PRICE[HAIKU];
    const usage = row.usage ?? FALLBACK_TOKENS;
    return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
};
const answerKey = (row: Row) => `${row.output?.category ?? "∅"}|${row.output?.isNew ?? false}`;

type Policy = (name: string, haiku: Row, sonnet: Row) => { answer: Row; calls: Row[]; reason: string };

const policies: Record<string, Policy> = {
    "all-haiku": (_name, haiku) => ({ answer: haiku, calls: [haiku], reason: "haiku" }),
    "all-sonnet": (_name, _haiku, sonnet) => ({ answer: sonnet, calls: [sonnet], reason: "sonnet" }),
    routed: (_name, haiku, sonnet) => {
        const second = escalation(
            { budget: "open", feature: "background_suggest" },
            { isNewCategory: haiku.output?.isNew ?? false }
        );
        return second === null
            ? { answer: haiku, calls: [haiku], reason: route({ feature: "background_suggest" }).reason }
            : { answer: sonnet, calls: [haiku, sonnet], reason: second.reason };
    },
};

const byCase = Map.groupBy(lowRows, (row) => `${row.set}\u0000${row.case.name}`);

for (const set of ["all", ...new Set(lowRows.map((row) => row.set))]) {
    const table = Object.entries(policies).map(([label, policy]) => {
        let graded = 0;
        let correct = 0;
        let usd = 0;
        let scenarios = 0;
        let stable = 0;
        let cases = 0;
        const reasons = new Map<string, number>();
        for (const [key, caseRows] of byCase) {
            const [caseSet, name = ""] = key.split("\u0000");
            if (set !== "all" && caseSet !== set) {
                continue;
            }
            const haikus = caseRows.filter((row) => row.model === HAIKU);
            const sonnets = caseRows.filter((row) => row.model === SONNET);
            if (haikus.length === 0 || sonnets.length === 0) {
                continue;
            }
            // Every Haiku run against every Sonnet run, so a policy is scored on each draw it could see.
            const answers = haikus.flatMap((haiku) => sonnets.map((sonnet) => policy(name, haiku, sonnet)));
            for (const { answer, calls, reason } of answers) {
                scenarios += 1;
                usd += calls.reduce((sum, call) => sum + dollars(call), 0);
                reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
                if (answer.categoryOk !== null && answer.categoryOk !== undefined) {
                    graded += 1;
                    correct += Number(answer.categoryOk);
                }
            }
            cases += 1;
            stable += Number(new Set(answers.map(({ answer }) => answerKey(answer))).size === 1);
        }
        return {
            category: graded === 0 ? "n/a" : `${((100 * correct) / graded).toFixed(1)}%`,
            policy: label,
            reasons: [...reasons]
                .map(([reason, count]) => `${reason} ${((100 * count) / scenarios).toFixed(0)}%`)
                .join(", "),
            stableCases: `${stable}/${cases}`,
            usdPerCall: usd / Math.max(scenarios, 1),
        };
    });
    const sonnetCost = table.find((entry) => entry.policy === "all-sonnet")?.usdPerCall ?? 1;
    console.log(`\n== ${set}`);
    console.table(
        table.map(({ usdPerCall, ...entry }) => ({
            ...entry,
            usdPer1k: lowRows.some((row) => row.usage !== undefined) ? (1000 * usdPerCall).toFixed(3) : "n/a",
            vsAllSonnet: `${((100 * usdPerCall) / sonnetCost).toFixed(1)}%`,
        }))
    );
}
