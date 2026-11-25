import { describe, expect, it } from "vite-plus/test";

import { bankEntryId, inboundEntryId } from "./inbound-entry-id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("inboundEntryId", () => {
    it("derives one stable uuid per inbox row", () => {
        const first = inboundEntryId("inbound:row-1");
        expect(first).toMatch(UUID);
        expect(inboundEntryId("inbound:row-1")).toBe(first);
        expect(inboundEntryId("inbound:row-2")).not.toBe(first);
    });

    it("returns null for a write that did not come from the inbox", () => {
        expect(inboundEntryId("watch:row-1")).toBeNull();
    });
});

describe("bankEntryId", () => {
    it("derives one stable uuid per bank key", () => {
        const first = bankEntryId("bank:stripe:tx-1");
        expect(first).toMatch(UUID);
        expect(bankEntryId("bank:stripe:tx-1")).toBe(first);
        expect(bankEntryId("bank:stripe:tx-2")).not.toBe(first);
    });

    it("does not collide with an inbox row of the same name", () => {
        expect(bankEntryId("inbound:row-1")).not.toBe(inboundEntryId("inbound:row-1"));
    });
});
