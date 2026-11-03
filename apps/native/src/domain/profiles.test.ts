import { describe, expect, it } from "vite-plus/test";

import { databaseNameFor, parseProfileId } from "./profiles";

describe("parseProfileId", () => {
    it("keeps a stored profile id, newline and all", () => {
        expect(parseProfileId("0b8f3c3e-6a51-4c4e-9f3b-2a7d5e1c9a10\n")).toBe("0b8f3c3e-6a51-4c4e-9f3b-2a7d5e1c9a10");
    });

    it("falls back to Personal for anything that could name another file", () => {
        expect(parseProfileId("../outlayr")).toBeUndefined();
        expect(parseProfileId("")).toBeUndefined();
        expect(parseProfileId(null)).toBeUndefined();
    });
});

describe("databaseNameFor", () => {
    it("leaves Personal on the database every install already has", () => {
        expect(databaseNameFor(undefined)).toBe("outlayr.db");
        expect(databaseNameFor("0b8f3c3e-6a51-4c4e-9f3b-2a7d5e1c9a10")).toBe(
            "outlayr-0b8f3c3e-6a51-4c4e-9f3b-2a7d5e1c9a10.db"
        );
    });
});
