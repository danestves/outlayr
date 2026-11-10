import { parseAmount } from "@/lib/account-writes";
import type { CommitRow } from "@/lib/ledger-committer";
import type { Tag } from "@/lib/ledger-db";
import { createdTag, findTag, normalizeTagName } from "@/lib/rule-writes";
import { AmountOp, TextOp, ruleFromSuggestion } from "@/lib/rules";
import type { Action, Condition, Rule, Suggestion } from "@/lib/rules";

const DECIMALS = 2;

export const FIELDS = ["merchant", "description", "amount"] as const satisfies readonly Condition["field"][];

export interface DraftCondition {
    field: Condition["field"];
    id: string;
    op: Condition["op"];
    text: string;
}

export type DraftAction =
    | { categoryId: string; id: string; type: "category" }
    | { id: string; name: string; type: "tag" };

export interface Draft {
    actions: readonly DraftAction[];
    conditions: readonly DraftCondition[];
    match: Rule["match"];
    name: string;
    on: boolean;
    position: number;
    runToo: boolean;
}

export const opsOf = (field: Condition["field"]): readonly Condition["op"][] =>
    field === "amount" ? AmountOp.literals : TextOp.literals;

export const blankCondition = (): DraftCondition => ({
    field: "merchant",
    id: crypto.randomUUID(),
    op: "contains",
    text: "",
});

export const blankAction = (draft: Pick<Draft, "actions">): DraftAction =>
    draft.actions.some((action) => action.type === "category")
        ? { id: crypto.randomUUID(), name: "", type: "tag" }
        : { categoryId: "", id: crypto.randomUUID(), type: "category" };

export const fieldChanged = (row: DraftCondition, field: Condition["field"]): DraftCondition => {
    const kept = opsOf(field).includes(row.op) && (field === "amount") === (row.field === "amount");
    return kept ? { ...row, field } : { ...row, field, op: field === "amount" ? "is" : "contains", text: "" };
};

export function draftOf(
    rule: Rule | null,
    position: number,
    tagNames: ReadonlyMap<string, string>,
    seed: Suggestion | null = null,
    locale = "en-US"
): Draft {
    const from = rule ?? (seed ? ruleFromSuggestion(seed, "") : null);
    if (!from) {
        return {
            actions: [{ categoryId: "", id: crypto.randomUUID(), type: "category" }],
            conditions: [blankCondition()],
            match: "all",
            name: "",
            on: true,
            position,
            runToo: false,
        };
    }
    return {
        actions: from.actions.flatMap((action): DraftAction[] => {
            if (action.type === "category") {
                return [{ categoryId: action.categoryId, id: crypto.randomUUID(), type: "category" }];
            }
            const name = tagNames.get(action.tagId);
            return name === undefined ? [] : [{ id: crypto.randomUUID(), name, type: "tag" }];
        }),
        conditions: from.conditions.map((condition) => ({
            field: condition.field,
            id: crypto.randomUUID(),
            op: condition.op,
            text:
                condition.field === "amount"
                    ? condition.value.toLocaleString(locale, {
                          maximumFractionDigits: DECIMALS,
                          minimumFractionDigits: DECIMALS,
                      })
                    : condition.value,
        })),
        match: from.match,
        name: from.name,
        on: from.on,
        position,
        runToo: false,
    };
}

function conditionOf(row: DraftCondition): Condition {
    if (row.field === "amount") {
        return {
            field: "amount",
            op: AmountOp.literals.find((op) => op === row.op) ?? "is",
            value: parseAmount(row.text, DECIMALS),
        };
    }
    return {
        field: row.field,
        op: TextOp.literals.find((op) => op === row.op) ?? "contains",
        value: row.text.trim(),
    };
}

const PENDING = "pending:";

export function ruleOf(draft: Draft, id: string, tags: readonly Tag[]): Rule {
    return {
        actions: draft.actions.map((action): Action => {
            if (action.type === "category") {
                return { categoryId: action.categoryId, type: "category" };
            }
            const name = normalizeTagName(action.name);
            const found = findTag(tags, name)?.localId ?? `${PENDING}${name.toLocaleLowerCase()}`;
            return { tagId: name === "" ? "" : found, type: "tag" };
        }),
        conditions: draft.conditions.map((row) => conditionOf(row)),
        id,
        match: draft.match,
        name: draft.name.trim(),
        on: draft.on,
    };
}

export function withNewTags(rule: Rule, draft: Draft, at = Date.now()) {
    const made = new Map<string, string>();
    const rows: CommitRow[] = [];
    const names = new Map(
        draft.actions.flatMap((action): [string, string][] => {
            const name = action.type === "tag" ? normalizeTagName(action.name) : "";
            return name === "" ? [] : [[`${PENDING}${name.toLocaleLowerCase()}`, name]];
        })
    );
    const actions = rule.actions.flatMap((action): Action[] => {
        if (action.type !== "tag" || !action.tagId.startsWith(PENDING)) {
            return [action];
        }
        const name = names.get(action.tagId);
        if (name === undefined) {
            return [];
        }
        const known = made.get(action.tagId);
        if (known !== undefined) {
            return [];
        }
        const tagId = crypto.randomUUID();
        made.set(action.tagId, tagId);
        rows.push(createdTag(tagId, name, at));
        return [{ tagId, type: "tag" }];
    });
    return { rows, rule: { ...rule, actions } };
}
