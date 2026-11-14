import { useMemo } from "react";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useTagBooks } from "@/lib/ledger-db";
import { useMeta } from "@/lib/ledger-settings";
import { categoryKinds, liveTags } from "@/lib/rule-writes";
import { RULES_KEY, outcomeOf, ruleBookOf } from "@/lib/rules";
import type { Matchable, Outcome } from "@/lib/rules";

export function useIncomingRules() {
    const { ledger } = useDashboard();
    const raw = useMeta().get(RULES_KEY);
    const tags = useTagBooks();
    return useMemo(() => {
        const rules = ruleBookOf(raw).rules.filter((rule) => rule.on);
        const kinds = categoryKinds(ledger.books);
        const live = new Set(liveTags(tags).map((tag) => tag.localId));
        return (entry: Matchable): Outcome => {
            const outcome = outcomeOf(rules, entry, kinds);
            return { categoryId: outcome.categoryId, tagIds: outcome.tagIds.filter((tagId) => live.has(tagId)) };
        };
    }, [ledger.books, raw, tags]);
}
