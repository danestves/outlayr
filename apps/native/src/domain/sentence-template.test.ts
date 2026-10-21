import { describe, expect, it } from "@jest/globals";

import { parseSentence, sentenceSlotNames } from "./sentence-template";

const words = (template: string) => parseSentence(template).map((cluster) => cluster.atoms.map((a) => a.value));

describe("parseSentence", () => {
    it("splits literal words into their own clusters", () => {
        expect(words("Spent it all")).toStrictEqual([["Spent"], ["it"], ["all"]]);
    });

    it("reads a placeholder as a slot atom", () => {
        expect(parseSentence("Spent {amount}")).toStrictEqual([
            { atoms: [{ kind: "text", value: "Spent" }] },
            { atoms: [{ kind: "slot", value: "amount" }] },
        ]);
    });

    it("keeps a trailing full stop in the slot's cluster", () => {
        expect(words("at {merchant}.")).toStrictEqual([["at"], ["merchant", "."]]);
    });

    it("keeps Spanish opening punctuation in the following cluster", () => {
        expect(words("¿{amount}?")).toStrictEqual([["¿", "amount", "?"]]);
    });

    it("ignores leading and trailing whitespace", () => {
        expect(words("  {a}  ")).toStrictEqual([["a"]]);
    });

    it("returns nothing for an empty template", () => {
        expect(parseSentence("")).toStrictEqual([]);
    });

    it("treats an unclosed brace as literal text", () => {
        expect(words("Spent {amount")).toStrictEqual([["Spent"], ["{amount"]]);
    });

    it("preserves the template's own slot order", () => {
        expect(sentenceSlotNames("{a} then {b}")).toStrictEqual(["a", "b"]);
        expect(sentenceSlotNames("{b} then {a}")).toStrictEqual(["b", "a"]);
    });

    it("reports a slot used more than once each time", () => {
        expect(sentenceSlotNames("{a} and {a}")).toStrictEqual(["a", "a"]);
    });

    it("does not carry regex state between calls", () => {
        const template = "{a} {b}";
        expect(sentenceSlotNames(template)).toStrictEqual(sentenceSlotNames(template));
    });
});
