import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import type { TagBooks } from "@/lib/ledger-db";
import { EMPTY_BOOK, ruleFromSuggestion } from "@/lib/rules";

import { rulesData } from "./data";
import type { RuleWrites } from "./data";
import { RulesScreen } from "./rules-screen";

const NO_SEARCH = {};
const STAY = () => undefined;
const NO_TAGS: TagBooks = { links: [], tags: [] };
const NO_WRITES: RuleWrites = { apply: STAY, undoable: () => "", update: (change) => change(EMPTY_BOOK) };

function sampleRules(ledger: Ledger) {
    const rules = rulesData(ledger, EMPTY_BOOK, NO_TAGS).suggestions.map((suggestion, index) =>
        ruleFromSuggestion(suggestion, `sample-${index}`)
    );
    return rulesData(ledger, { ...EMPTY_BOOK, rules }, NO_TAGS);
}

export function RulesPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const data = useMemo(() => sampleRules(sample.ledger), [sample]);
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <RulesScreen data={data} search={NO_SEARCH} setSearch={STAY} writes={NO_WRITES} />
        </Sampled>
    );
}

export function RulesFirstVisit() {
    return (
        <DashboardShell>
            <RulesPending />
        </DashboardShell>
    );
}
