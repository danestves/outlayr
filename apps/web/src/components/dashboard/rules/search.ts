import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    from: Schema.optional(Param),
    rule: Schema.optional(Param),
    tab: Schema.optional(Param),
    view: Schema.optional(Param),
});

export const rulesSearch = Schema.toStandardSchemaV1(Search);

export type RulesSearch = typeof Search.Type;

export type RulesPatch = { [Key in keyof RulesSearch]?: string | null };

export const RULE_TABS = ["all", "suggested", "conflicts"] as const;

export type RuleTab = (typeof RULE_TABS)[number];

export const NEW_RULE = "new";

export const tabOf = (search: RulesSearch): RuleTab => RULE_TABS.find((tab) => tab === search.tab) ?? "all";

export const patched = <Search extends RulesSearch>(search: Search, patch: RulesPatch) => ({
    ...search,
    ...Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [key, value === null || value === "" ? undefined : value])
    ),
});

export type SetRulesSearch = (patch: RulesPatch, options?: { replace?: boolean }) => void;
