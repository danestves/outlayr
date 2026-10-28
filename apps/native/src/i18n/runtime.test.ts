import { afterEach, describe, expect, it } from "vite-plus/test";

import { CATALOGS, EN } from "./catalog";
import { DEFAULT_LANGUAGE } from "./languages";
import { setRuntimeLanguage, translateNow } from "./runtime";

afterEach(() => {
    setRuntimeLanguage(DEFAULT_LANGUAGE);
});

describe("translateNow", () => {
    it("renders English before the provider has set anything", () => {
        expect(translateNow("common.cancel")).toBe(EN["common.cancel"]);
    });

    it("follows the language the provider set", () => {
        setRuntimeLanguage("es");
        expect(translateNow("common.cancel")).toBe(CATALOGS.es["common.cancel"]);
    });

    it("interpolates params", () => {
        setRuntimeLanguage("en");
        expect(translateNow("categories.inherits", { parent: "Food" })).toBe("Inherits Food's color.");
    });
});
