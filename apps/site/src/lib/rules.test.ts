import { describe, expect, it } from "vite-plus/test";

import {
    EMPTY_BOOK,
    conflictsOf,
    outcomeOf,
    resolved,
    ruleBookOf,
    runOf,
    skipConditionOf,
    statsOf,
    suggestionsOf,
    toggled,
    unresolved,
} from "./rules";
import type { Condition, Rule, RuleBook, RuleEntry } from "./rules";

const KINDS = new Map([
    ["groceries", false],
    ["shopping", false],
    ["fun", false],
    ["salary", true],
]);

const entry = (id: string, note: string, extra: Partial<RuleEntry> = {}): RuleEntry => ({
    amount: 20,
    at: 1000,
    categoryId: null,
    currency: "USD",
    day: "2026-10-01",
    details: "",
    id,
    imageKey: null,
    income: false,
    note,
    tagIds: new Set(),
    worth: 20,
    ...extra,
});

const merchant = (value: string, op: "contains" | "is" = "contains"): Condition => ({ field: "merchant", op, value });

const rule = (id: string, conditions: Condition[], categoryId: string | null, extra: Partial<Rule> = {}): Rule => ({
    actions: categoryId === null ? [] : [{ categoryId, type: "category" }],
    conditions,
    id,
    match: "all",
    name: id,
    on: true,
    ...extra,
});

const fresh = rule("fresh", [{ field: "description", op: "contains", value: "AMZN FRESH" }], "groceries");
const amazon = rule("amazon", [{ field: "description", op: "contains", value: "amzn" }], "shopping", {
    actions: [
        { categoryId: "shopping", type: "category" },
        { tagId: "online", type: "tag" },
    ],
});
const freshOrder = entry("a", "Amazon", { details: "AMZN FRESH 4411" });
const plainOrder = entry("b", "Amazon", { details: "AMZN MKTP" });

describe("outcomeOf", () => {
    it("gives the category of the first match and the tags of every match", () => {
        expect(outcomeOf([fresh, amazon], freshOrder, KINDS)).toEqual({ categoryId: "groceries", tagIds: ["online"] });
        expect(outcomeOf([amazon, fresh], freshOrder, KINDS).categoryId).toBe("shopping");
    });

    it("keeps an expense rule off an income entry with the same merchant", () => {
        const refund = entry("r", "Amazon", { details: "AMZN refund", income: true });
        expect(outcomeOf([amazon], refund, KINDS)).toEqual({ categoryId: null, tagIds: [] });
    });

    it("needs every condition under All and one under Any", () => {
        const rent: Condition[] = [
            { field: "description", op: "contains", value: "landlord" },
            { field: "amount", op: "is", value: 1850 },
        ];
        const paid = entry("p", "Rent", { amount: 1850, details: "LANDLORD ACH" });
        const partial = entry("q", "Rent", { amount: 900, details: "LANDLORD ACH" });
        expect(outcomeOf([rule("rent", rent, "shopping")], partial, KINDS).categoryId).toBeNull();
        expect(outcomeOf([rule("rent", rent, "shopping")], paid, KINDS).categoryId).toBe("shopping");
        expect(outcomeOf([rule("rent", rent, "shopping", { match: "any" })], partial, KINDS).categoryId).toBe(
            "shopping"
        );
    });

    it("leaves a blank amount out of an amount rule", () => {
        const small = rule("small", [{ field: "amount", op: "atMost", value: 5 }], "shopping");
        expect(outcomeOf([small], entry("blank", "", { amount: 0 }), KINDS).categoryId).toBeNull();
        expect(outcomeOf([small], entry("coffee", "", { amount: 4 }), KINDS).categoryId).toBe("shopping");
    });

    it("falls through a rule whose category was deleted", () => {
        const stale = rule("stale", [merchant("amazon")], "gone");
        expect(outcomeOf([stale, amazon], plainOrder, KINDS).categoryId).toBe("shopping");
    });
});

describe("runOf", () => {
    const live = new Set(["online"]);

    it("leaves a filled category alone when asked, and still adds the tag", () => {
        const filed = { ...plainOrder, categoryId: "groceries" };
        const run = runOf([amazon], [filed], KINDS, live, true);
        expect(run.kept).toBe(1);
        expect(run.right).toBe(0);
        expect(run.changes).toEqual([{ categoryId: null, entry: filed, tagIds: ["online"] }]);
    });

    it("writes nothing for an entry that already has the category and the tag", () => {
        const done = { ...plainOrder, categoryId: "shopping", tagIds: new Set(["online"]) };
        const run = runOf([amazon], [done], KINDS, live);
        expect(run.matched).toHaveLength(1);
        expect(run.changes).toHaveLength(0);
    });

    it("drops a tag that was deleted after the rule was saved", () => {
        const run = runOf([amazon], [{ ...plainOrder, categoryId: "shopping" }], KINDS, new Set());
        expect(run.changes).toHaveLength(0);
    });
});

describe("statsOf", () => {
    it("counts an entry two rules match once in the total", () => {
        const stats = statsOf([fresh, amazon], [freshOrder, plainOrder, entry("c", "Shell")], KINDS);
        expect(stats.matched).toBe(2);
        expect(stats.byRule.get("amazon")?.count).toBe(2);
        expect(stats.byRule.get("fresh")?.count).toBe(1);
    });
});

describe("conflictsOf", () => {
    const book: RuleBook = { ...EMPTY_BOOK, rules: [fresh, amazon] };

    it("finds two rules that file the same entries under different categories", () => {
        const [conflict] = conflictsOf(book.rules, [freshOrder, plainOrder], KINDS);
        expect(conflict?.entries).toEqual([freshOrder]);
        expect([conflict?.first.id, conflict?.second.id]).toEqual(["fresh", "amazon"]);
    });

    it("skips a rule that is off and a pair already settled", () => {
        const off = [fresh, { ...amazon, on: false }];
        expect(conflictsOf(off, [freshOrder], KINDS)).toHaveLength(0);
        expect(conflictsOf(book.rules, [freshOrder], KINDS, ["amazon|fresh"])).toHaveLength(0);
    });

    const found = () => {
        const [conflict] = conflictsOf(book.rules, [freshOrder], KINDS);
        if (!conflict) {
            throw new Error("the two rules should conflict");
        }
        return conflict;
    };

    it("puts the second rule first and settles the pair", () => {
        const next = resolved(
            { ...book, rules: [rule("top", [merchant("x")], null), ...book.rules] },
            found(),
            "second"
        );
        expect(next.rules.map((row) => row.id)).toEqual(["top", "amazon", "fresh"]);
        expect(conflictsOf(next.rules, [freshOrder], KINDS, next.settled)).toHaveLength(0);
    });

    it("undoes overlapping resolutions in order and keeps a later edit to a moved rule", () => {
        const start: RuleBook = {
            ...EMPTY_BOOK,
            rules: [
                rule("a", [merchant("amazon")], "groceries"),
                rule("b", [merchant("amazon")], "shopping"),
                rule("c", [merchant("amazon")], "fun"),
            ],
        };
        const picks = conflictsOf(start.rules, [plainOrder], KINDS).map((conflict) => ({
            choice: "second" as const,
            conflict,
        }));
        expect(picks).toHaveLength(3);
        const made = picks.reduce((next, { choice, conflict }) => resolved(next, conflict, choice), start);
        expect(made.rules[0]?.id).toBe("c");
        const back = unresolved(toggled(made, "b", false), start, picks);
        expect(back.rules.map((row) => [row.id, row.on])).toEqual([
            ["a", true],
            ["b", false],
            ["c", true],
        ]);
        expect(back.settled).toEqual([]);
    });

    it("takes back the skip it added and nothing else", () => {
        const picks = [{ choice: "skip" as const, conflict: found() }];
        const made = resolved(book, found(), "skip");
        expect(unresolved(toggled(made, "amazon", false), book, picks).rules).toEqual([
            fresh,
            { ...amazon, on: false },
        ]);
    });

    it("makes the second rule skip the first one's text, which ends the overlap", () => {
        const next = resolved(book, found(), "skip");
        expect(conflictsOf(next.rules, [freshOrder, plainOrder], KINDS)).toHaveLength(0);
        expect(outcomeOf(next.rules, freshOrder, KINDS)).toEqual({ categoryId: "groceries", tagIds: [] });
        expect(outcomeOf(next.rules, plainOrder, KINDS).categoryId).toBe("shopping");
    });
});

describe("skipConditionOf", () => {
    it("offers no skip that would leave the second rule unable to match", () => {
        const lyft = rule("lyft", [merchant("lyft")], "shopping");
        const line = rule("line", [merchant("Lyft Line")], "groceries");
        expect(skipConditionOf(lyft, line)).toBeNull();
        expect(skipConditionOf(line, lyft)).toEqual({ field: "merchant", op: "notContains", value: "Lyft Line" });
    });
});

describe("suggestionsOf", () => {
    const joes = (id: string, categoryId: string | null) => entry(id, "Trader Joe's", { categoryId });
    const filed = [joes("1", "groceries"), joes("2", "groceries"), joes("3", "groceries"), joes("4", "groceries")];

    it("suggests a merchant filed under one category again and again", () => {
        expect(suggestionsOf(EMPTY_BOOK, [...filed, joes("5", "shopping")], KINDS)).toEqual([
            {
                categoryId: "groceries",
                entries: 5,
                key: "trader joe's",
                name: "Trader Joe's",
                picked: 4,
                value: "TRADER JOE'S",
            },
        ]);
    });

    it("stays quiet when the picks are split, too few, dismissed or already covered by a rule", () => {
        const split = [joes("1", "groceries"), joes("2", "shopping"), joes("3", "groceries")];
        expect(suggestionsOf(EMPTY_BOOK, split, KINDS)).toHaveLength(0);
        expect(suggestionsOf(EMPTY_BOOK, filed.slice(0, 2), KINDS)).toHaveLength(0);
        expect(suggestionsOf({ ...EMPTY_BOOK, dismissed: ["trader joe's"] }, filed, KINDS)).toHaveLength(0);
        const covered = { ...EMPTY_BOOK, rules: [rule("joe", [merchant("trader joe")], "groceries", { on: false })] };
        expect(suggestionsOf(covered, filed, KINDS)).toHaveLength(0);
    });
});

describe("ruleBookOf", () => {
    it("reads back what it stored and treats anything else as no rules", () => {
        const book: RuleBook = { dismissed: ["x"], rules: [fresh, amazon], settled: ["amazon|fresh"] };
        expect(ruleBookOf(JSON.stringify(book))).toEqual(book);
        expect(ruleBookOf("{")).toEqual(EMPTY_BOOK);
        expect(ruleBookOf(JSON.stringify({ rules: [{ id: 1 }] }))).toEqual(EMPTY_BOOK);
        expect(ruleBookOf(null)).toEqual(EMPTY_BOOK);
    });
});
