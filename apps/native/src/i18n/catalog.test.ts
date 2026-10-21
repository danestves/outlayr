import { describe, expect, it } from "@jest/globals";
import { getIntlayer } from "intlayer";

import { CATALOGS, DICTIONARY_KEYS, EN } from "./catalog";
import { SUPPORTED_LANGUAGES } from "./languages";

const PLACEHOLDER = /\{(\w+)\}/g;
const PLURAL_SUFFIX = /_(one|other)$/;

function placeholders(template: string): Set<string> {
    return new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[1] as string));
}

describe("catalog parity", () => {
    // The other tests compare the catalogs to each other, so an empty pair (a stale `.intlayer/`) passes them all.
    it("ships a populated catalog for every supported language, from every dictionary", () => {
        for (const language of SUPPORTED_LANGUAGES) {
            const catalog = CATALOGS[language];
            expect(Object.keys(catalog).length).toBeGreaterThan(500);
            for (const dictionary of DICTIONARY_KEYS) {
                expect(Object.keys(getIntlayer(dictionary, language)).length).toBeGreaterThan(0);
            }
        }
    });

    it("translates every English key into Spanish", () => {
        const missing = Object.keys(EN).filter((key) => !(key in CATALOGS.es));
        expect(missing).toStrictEqual([]);
    });

    it("declares every key in exactly one dictionary", () => {
        const seen = new Map<string, string>();
        for (const name of DICTIONARY_KEYS) {
            for (const key of Object.keys(getIntlayer(name, "en"))) {
                const owner = seen.get(key);
                expect(owner).toBeUndefined();
                seen.set(key, name);
            }
        }
    });

    it("uses the same placeholders in both languages", () => {
        for (const [key, english] of Object.entries(EN)) {
            const spanish = CATALOGS.es[key];
            if (!spanish) {
                continue;
            }
            expect([...placeholders(spanish)].sort()).toStrictEqual([...placeholders(english)].sort());
        }
    });

    it("gives every Android twin a base key with the same placeholders", () => {
        for (const [key, twin] of Object.entries(EN)) {
            if (!key.endsWith(".android")) {
                continue;
            }
            const base = EN[key.replace(/\.android$/, "") as keyof typeof EN];
            expect(base).toBeDefined();
            expect([...placeholders(twin)].sort()).toStrictEqual([...placeholders(base ?? "")].sort());
        }
    });

    it("pairs every plural key with its counterpart form", () => {
        for (const catalogName of SUPPORTED_LANGUAGES) {
            const catalog = CATALOGS[catalogName];
            for (const key of Object.keys(catalog)) {
                const match = key.match(PLURAL_SUFFIX);
                if (!match) {
                    continue;
                }
                const counterpart =
                    match[1] === "one" ? key.replace(PLURAL_SUFFIX, "_other") : key.replace(PLURAL_SUFFIX, "_one");
                expect(counterpart in catalog).toBeTruthy();
            }
        }
    });

    it("interpolates a count into every plural form", () => {
        for (const catalogName of SUPPORTED_LANGUAGES) {
            const catalog = CATALOGS[catalogName];
            for (const [key, template] of Object.entries(catalog)) {
                if (!key.endsWith("_other")) {
                    continue;
                }
                expect(placeholders(template).has("count")).toBeTruthy();
            }
        }
    });

    it("leaves no empty string in either catalog", () => {
        for (const catalogName of SUPPORTED_LANGUAGES) {
            for (const [, value] of Object.entries(CATALOGS[catalogName])) {
                expect(value.trim().length > 0).toBeTruthy();
            }
        }
    });
});
