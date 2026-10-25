import { describe, expect, it } from "@jest/globals";

import { DEFAULT_LANGUAGE, languageFromTag, resolveLanguage } from "./languages";

describe("languageFromTag", () => {
    it("matches a regional tag by its primary subtag", () => {
        expect(languageFromTag("es-419")).toBe("es");
        expect(languageFromTag("es-MX")).toBe("es");
        expect(languageFromTag("en-GB")).toBe("en");
    });

    it("keeps Spain apart from the rest of Spanish", () => {
        expect(languageFromTag("es-ES")).toBe("es-ES");
        expect(languageFromTag("es_ES")).toBe("es-ES");
        expect(languageFromTag("es-AR")).toBe("es");
        expect(languageFromTag("es")).toBe("es");
    });

    it("keeps Portugal apart from Brazilian Portuguese", () => {
        expect(languageFromTag("pt-PT")).toBe("pt-PT");
        expect(languageFromTag("pt_PT")).toBe("pt-PT");
        expect(languageFromTag("pt-BR")).toBe("pt");
        expect(languageFromTag("pt")).toBe("pt");
    });

    it("is case insensitive", () => {
        expect(languageFromTag("ES-mx")).toBe("es");
    });

    it("tolerates an underscore-separated tag", () => {
        expect(languageFromTag("es_419")).toBe("es");
    });

    it("returns null for an unsupported language", () => {
        expect(languageFromTag("de-DE")).toBeNull();
        expect(languageFromTag("")).toBeNull();
        expect(languageFromTag(null)).toBeNull();
    });
});

describe("resolveLanguage", () => {
    it("follows the device", () => {
        expect(resolveLanguage("es-419")).toBe("es");
        expect(resolveLanguage("en-US")).toBe("en");
    });

    it("falls back to the default when the device speaks an unsupported language", () => {
        expect(resolveLanguage("de-DE")).toBe(DEFAULT_LANGUAGE);
    });
});
