import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

// Ids must not depend on the sweeping device's zone, or a synced pair in two zones doubles every subscription.
function occurrenceIdIn(timeZone: string, parentLocalId: string, isoHolding: string): string {
    const probe = join(import.meta.dirname, "occurrence-id-probe.ts");
    return execFileSync(process.execPath, ["--import", "tsx", probe, parentLocalId, isoHolding], {
        encoding: "utf-8",
        env: { ...process.env, TZ: timeZone },
    });
}

describe("occurrence id", () => {
    // 23:30Z is already tomorrow in Madrid and still today in New York.
    it("agrees across a zone split that straddles the local date", () => {
        const madrid = occurrenceIdIn("Europe/Madrid", "sub-1", "2025-08-10T23:30:00.000Z");
        const newYork = occurrenceIdIn("America/New_York", "sub-1", "2025-08-10T23:30:00.000Z");

        expect(madrid).toBe(newYork);
    });

    it("still separates two different days of the same schedule", () => {
        const august = occurrenceIdIn("UTC", "sub-1", "2025-08-10T09:00:00.000Z");
        const september = occurrenceIdIn("UTC", "sub-1", "2025-09-10T09:00:00.000Z");

        expect(august).not.toBe(september);
    });
});
