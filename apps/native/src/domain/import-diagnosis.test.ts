import { describe, expect, it } from "vite-plus/test";

import { parseImportFile } from "@/data/transfer-core";

import { classifyParseFailure } from "./import-diagnosis";

describe("classifyParseFailure", () => {
    it("classifies an empty file", () => {
        expect(parseImportFile("")).toBeNull();
        expect(classifyParseFailure("")).toBe("empty");
    });

    it("classifies a file that is nothing but a header", () => {
        expect(parseImportFile("Date,Note,Amount\n")).toBeNull();
        expect(classifyParseFailure("Date,Note,Amount\n")).toBe("noDataRows");
    });

    it("classifies a file with too few columns to build a row", () => {
        expect(parseImportFile("2026-07-28,12.50")).toBeNull();
        expect(classifyParseFailure("2026-07-28,12.50")).toBe("tooFewColumns");
    });
});
