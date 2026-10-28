import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vite-plus/test";

import { unusedDatabase } from "@/db/test-database";

vi.mock("@/data/logo-backfill-core", () => ({
    attachMissingLogos: vi.fn(() => Effect.succeed(1)),
}));
vi.mock("@/data/settings-core", () => ({
    readBoolSetting: vi.fn(() => Effect.succeed(false)),
    readRemoteEnrichment: vi.fn(() => Effect.succeed(false)),
}));
vi.mock("./convex", () => ({ convex: null, enrichmentTransport: () => null }));
vi.mock("./logo-fetch", () => ({ fetchMerchantImage: vi.fn() }));
vi.mock("expo-file-system", () => ({ File: vi.fn() }));
vi.mock("expo-localization", () => ({ getLocales: () => [] }));

const { armLogoBackfill, backfillLogos, cancelLogoBackfill } = await import("./logo-backfill");
const { attachMissingLogos } = await import("@/data/logo-backfill-core");

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
        const db = unusedDatabase();
        armLogoBackfill(db);
        const calls = vi.mocked(attachMissingLogos).mock.calls.length;
        const gate = Promise.withResolvers<undefined>();
        vi.mocked(attachMissingLogos).mockReturnValueOnce(Effect.promise(() => gate.promise).pipe(Effect.as(1)));

        const overlapping = Effect.runPromise(
            Effect.all([backfillLogos(db), backfillLogos(db)], { concurrency: "unbounded" })
        );
        gate.resolve(undefined);
        const [first, second] = await overlapping;

        expect([first, second]).toStrictEqual([1, 1]);
        expect(vi.mocked(attachMissingLogos).mock.calls.length - calls).toBe(1);
    });
});
