import { describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";

import { unusedDatabase } from "@/db/test-database";

jest.mock("@/data/logo-backfill-core", () => ({
    attachMissingLogos: jest.fn(() => require("effect/Effect").succeed(1)),
}));
jest.mock("@/data/settings-core", () => ({
    readBoolSetting: jest.fn(() => require("effect/Effect").succeed(false)),
    readRemoteEnrichment: jest.fn(() => require("effect/Effect").succeed(false)),
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
        await expect(Effect.runPromise(backfillLogos(db))).resolves.toBe(1);

        await Effect.runPromise(cancelLogoBackfill());
        await expect(Effect.runPromise(backfillLogos(db))).resolves.toBe(0);

        armLogoBackfill(db);
        await expect(Effect.runPromise(backfillLogos(db))).resolves.toBe(1);
    });

    it("shares one pass between overlapping callers", async () => {
        const { attachMissingLogos } =
            jest.requireMock<typeof import("@/data/logo-backfill-core")>("@/data/logo-backfill-core");
        const db = unusedDatabase();
        armLogoBackfill(db);
        const calls = jest.mocked(attachMissingLogos).mock.calls.length;
        const gate = Promise.withResolvers<undefined>();
        jest.mocked(attachMissingLogos).mockReturnValueOnce(Effect.promise(() => gate.promise).pipe(Effect.as(1)));

        const overlapping = Effect.runPromise(
            Effect.all([backfillLogos(db), backfillLogos(db)], { concurrency: "unbounded" })
        );
        gate.resolve(undefined);
        const [first, second] = await overlapping;

        expect([first, second]).toStrictEqual([1, 1]);
        expect(jest.mocked(attachMissingLogos).mock.calls.length - calls).toBe(1);
    });
});
