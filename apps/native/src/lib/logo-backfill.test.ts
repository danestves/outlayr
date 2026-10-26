import { describe, expect, it, jest } from "@jest/globals";

import { unusedDatabase } from "@/db/test-database";

jest.mock("@/data/logo-backfill-core", () => ({
    attachMissingLogos: jest.fn(() => require("effect/Effect").succeed(1)),
}));
jest.mock("@/data/settings-core", () => ({
    readRemoteEnrichment: jest.fn(() => require("effect/Effect").succeed(false)),
}));
jest.mock("@/state/settings-commands", () => ({
    readBoolSettingCommand: {},
    readRemoteEnrichmentCommand: {},
    runSettingsCommand: jest.fn(async () => false),
}));
jest.mock("./convex", () => ({ convex: null, enrichmentTransport: () => null }));
jest.mock("./logo-fetch", () => ({ fetchMerchantImage: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));
jest.mock("expo-localization", () => ({ getLocales: () => [] }));

// SAFETY: `require` after the mocks above, so the module under test sees them.
const { armLogoBackfill, backfillLogos, cancelLogoBackfill } =
    require("./logo-backfill") as typeof import("./logo-backfill");

describe("cancelLogoBackfill", () => {
    it("refuses passes for the cancelled database until it is armed again", async () => {
        const db = unusedDatabase();
        armLogoBackfill(db);
        await expect(backfillLogos(db)).resolves.toBe(1);

        await cancelLogoBackfill();
        await expect(backfillLogos(db)).resolves.toBe(0);

        armLogoBackfill(db);
        await expect(backfillLogos(db)).resolves.toBe(1);
    });
});
