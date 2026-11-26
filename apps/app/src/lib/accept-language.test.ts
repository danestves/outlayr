import { describe, expect, it } from "vite-plus/test";

import { matchAcceptLanguage } from "./accept-language";

const LOCALES = ["en", "es", "pt", "fr", "de"] as const;

describe("matchAcceptLanguage", () => {
    it("matches a region tag by its language", () => {
        expect(matchAcceptLanguage("es-VE", LOCALES)).toBe("es");
        expect(matchAcceptLanguage("pt-BR", LOCALES)).toBe("pt");
        expect(matchAcceptLanguage("fr-CA,fr;q=0.9", LOCALES)).toBe("fr");
    });

    it("takes the highest quality the app declares", () => {
        expect(matchAcceptLanguage("ja, es;q=0.8, en;q=0.6", LOCALES)).toBe("es");
        expect(matchAcceptLanguage("en;q=0.4, de;q=0.9", LOCALES)).toBe("de");
    });

    it("ignores a wildcard and an empty header", () => {
        expect(matchAcceptLanguage("*", LOCALES)).toBeNull();
        expect(matchAcceptLanguage("", LOCALES)).toBeNull();
        expect(matchAcceptLanguage(undefined, LOCALES)).toBeNull();
    });

    it("ignores a language the app does not declare", () => {
        expect(matchAcceptLanguage("it-IT,it;q=0.9", LOCALES)).toBeNull();
    });
});
