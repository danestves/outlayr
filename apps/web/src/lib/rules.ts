import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const RULES_KEY = "rules";

export const TextField = Schema.Literals(["merchant", "description"]);
export const TextOp = Schema.Literals(["contains", "notContains", "is", "startsWith"]);
export const AmountOp = Schema.Literals(["is", "atLeast", "atMost"]);

const TextCondition = Schema.Struct({ field: TextField, op: TextOp, value: Schema.String });
const AmountCondition = Schema.Struct({ field: Schema.Literal("amount"), op: AmountOp, value: Schema.Finite });
export const Condition = Schema.Union([TextCondition, AmountCondition]);

export const Action = Schema.Union([
    Schema.Struct({ categoryId: Schema.String, type: Schema.Literal("category") }),
    Schema.Struct({ tagId: Schema.String, type: Schema.Literal("tag") }),
]);

export const Rule = Schema.Struct({
    actions: Schema.Array(Action),
    conditions: Schema.Array(Condition),
    id: Schema.String,
    match: Schema.Literals(["all", "any"]),
    name: Schema.String,
    on: Schema.Boolean,
});

export const RuleBook = Schema.Struct({
    dismissed: Schema.Array(Schema.String),
    rules: Schema.Array(Rule),
    settled: Schema.Array(Schema.String),
});

export type Condition = typeof Condition.Type;
export type Action = typeof Action.Type;
export type Rule = typeof Rule.Type;
export type RuleBook = typeof RuleBook.Type;

export const EMPTY_BOOK: RuleBook = { dismissed: [], rules: [], settled: [] };

const decodeBook = Schema.decodeUnknownOption(Schema.fromJsonString(RuleBook));

export const ruleBookOf = (raw: string | null | undefined): RuleBook =>
    raw ? Option.getOrElse(decodeBook(raw), () => EMPTY_BOOK) : EMPTY_BOOK;

export interface RuleEntry {
    amount: number;
    at: number;
    categoryId: string | null;
    currency: string;
    day: string;
    details: string;
    id: string;
    imageKey: string | null;
    income: boolean;
    note: string;
    tagIds: ReadonlySet<string>;
    worth: number;
}

export type Matchable = Pick<RuleEntry, "amount" | "details" | "income" | "note">;

export type CategoryKinds = ReadonlyMap<string, boolean>;

const CENT = 0.005;

const lower = (text: string) => text.trim().toLocaleLowerCase();

function holds(condition: Condition, entry: Matchable) {
    if (condition.field === "amount") {
        const amount = Math.abs(entry.amount);
        if (condition.op === "is") {
            return Math.abs(amount - condition.value) < CENT;
        }
        return condition.op === "atLeast" ? amount >= condition.value - CENT : amount <= condition.value + CENT;
    }
    const needle = lower(condition.value);
    if (needle === "") {
        return false;
    }
    const text = lower(condition.field === "merchant" ? entry.note : entry.details);
    if (condition.op === "is") {
        return text === needle;
    }
    if (condition.op === "startsWith") {
        return text.startsWith(needle);
    }
    return condition.op === "contains" ? text.includes(needle) : !text.includes(needle);
}

export const categoryOf = (rule: Pick<Rule, "actions">) =>
    rule.actions.find((action) => action.type === "category")?.categoryId ?? null;

export const tagsOf = (rule: Pick<Rule, "actions">) =>
    rule.actions.flatMap((action) => (action.type === "tag" ? [action.tagId] : []));

export function matches(rule: Rule, entry: Matchable, kinds: CategoryKinds) {
    if (rule.conditions.length === 0) {
        return false;
    }
    const categoryId = categoryOf(rule);
    const income = categoryId === null ? undefined : kinds.get(categoryId);
    if (income !== undefined && income !== entry.income) {
        return false;
    }
    return rule.match === "all"
        ? rule.conditions.every((condition) => holds(condition, entry))
        : rule.conditions.some((condition) => holds(condition, entry));
}

export interface Outcome {
    categoryId: string | null;
    tagIds: readonly string[];
}

export function outcomeOf(rules: readonly Rule[], entry: Matchable, kinds: CategoryKinds): Outcome {
    let categoryId: string | null = null;
    const tagIds = new Set<string>();
    for (const rule of rules) {
        if (!matches(rule, entry, kinds)) {
            continue;
        }
        const wanted = categoryOf(rule);
        if (categoryId === null && wanted !== null && kinds.has(wanted)) {
            categoryId = wanted;
        }
        for (const tagId of tagsOf(rule)) {
            tagIds.add(tagId);
        }
    }
    return { categoryId, tagIds: [...tagIds] };
}

export interface Change {
    categoryId: string | null;
    entry: RuleEntry;
    tagIds: readonly string[];
}

export interface Run {
    changes: readonly Change[];
    matched: readonly RuleEntry[];
    kept: number;
    right: number;
}

export function runOf(
    rules: readonly Rule[],
    entries: readonly RuleEntry[],
    kinds: CategoryKinds,
    liveTags: ReadonlySet<string>,
    keepFilled = false
): Run {
    const changes: Change[] = [];
    const matched: RuleEntry[] = [];
    let kept = 0;
    let right = 0;
    for (const entry of entries) {
        if (!rules.some((rule) => matches(rule, entry, kinds))) {
            continue;
        }
        matched.push(entry);
        const outcome = outcomeOf(rules, entry, kinds);
        const moves = outcome.categoryId !== null && outcome.categoryId !== entry.categoryId;
        const keeps = moves && keepFilled && entry.categoryId !== null;
        kept += keeps ? 1 : 0;
        const tagIds = outcome.tagIds.filter((tagId) => liveTags.has(tagId) && !entry.tagIds.has(tagId));
        if ((moves && !keeps) || tagIds.length > 0) {
            changes.push({ categoryId: moves && !keeps ? outcome.categoryId : null, entry, tagIds });
        }
        right += moves || tagIds.length > 0 ? 0 : 1;
    }
    return { changes, kept, matched, right };
}

export interface RuleStat {
    count: number;
    lastAt: number | null;
}

export function statsOf(rules: readonly Rule[], entries: readonly RuleEntry[], kinds: CategoryKinds) {
    const byRule = new Map<string, RuleStat>(rules.map((rule) => [rule.id, { count: 0, lastAt: null }]));
    let matched = 0;
    for (const entry of entries) {
        let any = false;
        for (const rule of rules) {
            const stat = byRule.get(rule.id);
            if (stat && matches(rule, entry, kinds)) {
                any = true;
                stat.count += 1;
                stat.lastAt = Math.max(stat.lastAt ?? 0, entry.at);
            }
        }
        matched += any ? 1 : 0;
    }
    return { byRule, matched };
}

export interface Conflict {
    entries: readonly RuleEntry[];
    first: Rule;
    key: string;
    second: Rule;
}

export const conflictKey = (a: string, b: string) => [a, b].toSorted().join("|");

export function conflictsOf(
    rules: readonly Rule[],
    entries: readonly RuleEntry[],
    kinds: CategoryKinds,
    settled: readonly string[] = []
): Conflict[] {
    const done = new Set(settled);
    const active = rules.filter((rule) => {
        const categoryId = categoryOf(rule);
        return rule.on && categoryId !== null && kinds.has(categoryId);
    });
    const found: Conflict[] = [];
    for (const [index, first] of active.entries()) {
        for (const second of active.slice(index + 1)) {
            const key = conflictKey(first.id, second.id);
            if (done.has(key) || categoryOf(first) === categoryOf(second)) {
                continue;
            }
            const shared = entries.filter((entry) => matches(first, entry, kinds) && matches(second, entry, kinds));
            if (shared.length > 0) {
                found.push({ entries: shared, first, key, second });
            }
        }
    }
    return found;
}

export function skipConditionOf(first: Rule, second: Rule): Condition | null {
    if (second.match === "any" && second.conditions.length > 1) {
        return null;
    }
    const own = first.conditions.find(
        (condition) => condition.field !== "amount" && condition.op !== "notContains" && lower(condition.value) !== ""
    );
    if (!own || own.field === "amount") {
        return null;
    }
    const silenced = second.conditions.some(
        (condition) =>
            condition.field === own.field &&
            condition.op !== "notContains" &&
            lower(condition.value).includes(lower(own.value))
    );
    return silenced ? null : { field: own.field, op: "notContains", value: own.value };
}

export type ConflictChoice = "first" | "leave" | "second" | "skip";

export function resolved(book: RuleBook, conflict: Conflict, choice: ConflictChoice): RuleBook {
    if (choice === "leave") {
        return book;
    }
    if (choice === "first") {
        return { ...book, settled: [...book.settled, conflict.key] };
    }
    if (choice === "second") {
        const rest = book.rules.filter((rule) => rule.id !== conflict.second.id);
        const at = rest.findIndex((rule) => rule.id === conflict.first.id);
        return {
            ...book,
            rules: [...rest.slice(0, at), conflict.second, ...rest.slice(at)],
            settled: [...book.settled, conflict.key],
        };
    }
    const skip = skipConditionOf(conflict.first, conflict.second);
    return skip === null
        ? book
        : {
              ...book,
              rules: book.rules.map((rule) =>
                  rule.id === conflict.second.id
                      ? { ...rule, conditions: [...rule.conditions, skip], match: "all" as const }
                      : rule
              ),
          };
}

export interface Suggestion {
    categoryId: string;
    entries: number;
    key: string;
    name: string;
    picked: number;
    value: string;
}

const SUGGESTION_MIN_ENTRIES = 3;
const SUGGESTION_MIN_SHARE = 0.8;
const SUGGESTION_LIMIT = 12;

export function suggestionsOf(book: RuleBook, entries: readonly RuleEntry[], kinds: CategoryKinds): Suggestion[] {
    const hidden = new Set(book.dismissed);
    const groups = new Map<string, RuleEntry[]>();
    for (const entry of entries) {
        const key = lower(entry.note);
        if (key === "" || entry.categoryId === null || !kinds.has(entry.categoryId) || hidden.has(key)) {
            continue;
        }
        const group = groups.get(key);
        if (group) {
            group.push(entry);
        } else {
            groups.set(key, [entry]);
        }
    }
    const found: Suggestion[] = [];
    for (const [key, group] of groups) {
        if (group.length < SUGGESTION_MIN_ENTRIES) {
            continue;
        }
        const counts = new Map<string, number>();
        for (const entry of group) {
            if (entry.categoryId !== null) {
                counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
            }
        }
        const [top] = [...counts].toSorted((a, b) => b[1] - a[1]);
        const covered = group.filter((entry) => book.rules.some((rule) => matches(rule, entry, kinds))).length;
        if (!top || top[1] / group.length < SUGGESTION_MIN_SHARE || covered * 2 >= group.length) {
            continue;
        }
        const name = group[0]?.note.trim() ?? key;
        found.push({
            categoryId: top[0],
            entries: group.length,
            key,
            name,
            picked: top[1],
            value: name.toLocaleUpperCase(),
        });
    }
    return found.toSorted((a, b) => b.entries - a.entries || a.key.localeCompare(b.key)).slice(0, SUGGESTION_LIMIT);
}

export const ruleFromSuggestion = (suggestion: Suggestion, id: string): Rule => ({
    actions: [{ categoryId: suggestion.categoryId, type: "category" }],
    conditions: [{ field: "merchant", op: "contains", value: suggestion.value }],
    id,
    match: "all",
    name: suggestion.name,
    on: true,
});

export type RuleProblem = "action" | "category" | "name" | "tag" | "value";

export function ruleProblems(rule: Rule) {
    const conditions = rule.conditions.map((condition) =>
        (condition.field === "amount" ? condition.value > 0 : condition.value.trim() !== "") ? null : ("value" as const)
    );
    const actions = rule.actions.map((action) => {
        if (action.type === "category") {
            return action.categoryId === "" ? ("category" as const) : null;
        }
        return action.tagId === "" ? ("tag" as const) : null;
    });
    const name = rule.name.trim() === "" ? ("name" as const) : null;
    const none = rule.actions.length === 0 || rule.conditions.length === 0 ? ("action" as const) : null;
    const count = [name, none, ...conditions, ...actions].filter((problem) => problem !== null).length;
    return { actions, conditions, count, name, none };
}

export function saved(book: RuleBook, rule: Rule, position: number): RuleBook {
    const rest = book.rules.filter((row) => row.id !== rule.id);
    const at = Math.min(Math.max(position, 0), rest.length);
    return { ...book, rules: [...rest.slice(0, at), rule, ...rest.slice(at)] };
}

export function unresolved(
    book: RuleBook,
    before: RuleBook,
    picks: readonly { choice: ConflictChoice; conflict: Conflict }[]
): RuleBook {
    const keys = new Set(picks.map(({ conflict }) => conflict.key));
    const changed = new Set(
        picks.flatMap(({ choice, conflict }) => (choice === "second" || choice === "skip" ? [conflict.second.id] : []))
    );
    const here = new Set(book.rules.map((rule) => rule.id));
    let next = book;
    for (const [index, rule] of before.rules.entries()) {
        if (changed.has(rule.id) && here.has(rule.id)) {
            next = saved(next, rule, index);
        }
    }
    return { ...next, settled: next.settled.filter((key) => !keys.has(key)) };
}

export function removed(book: RuleBook, id: string): RuleBook {
    return {
        ...book,
        rules: book.rules.filter((rule) => rule.id !== id),
        settled: book.settled.filter((key) => !key.split("|").includes(id)),
    };
}

export function toggled(book: RuleBook, id: string, on: boolean): RuleBook {
    return { ...book, rules: book.rules.map((rule) => (rule.id === id ? { ...rule, on } : rule)) };
}

export function reordered(book: RuleBook, id: string, position: number): RuleBook {
    const rule = book.rules.find((row) => row.id === id);
    return rule ? saved(book, rule, position) : book;
}

export function dismissed(book: RuleBook, key: string): RuleBook {
    return book.dismissed.includes(key) ? book : { ...book, dismissed: [...book.dismissed, key] };
}
