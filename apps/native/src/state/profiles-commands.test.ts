import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";

const WORK = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
let activeFile: string | undefined;
class QueueUnreadable extends Schema.TaggedError<QueueUnreadable>()("QueueUnreadable", {}) {}
class Offline extends Schema.TaggedError<Offline>()("Offline", {}) {}

let drain: Effect.Effect<void, QueueUnreadable> = Effect.void;

vi.mock("@/lib/active-profile", () => ({
    activeProfileId: () => WORK,
    writeActiveProfile: (id: string | undefined) => {
        activeFile = id;
    },
}));
vi.mock("@/data/pending-writes", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/data/pending-writes")>()),
    drainDevicePendingWritesOrFail: () => drain,
}));
vi.mock("@/data/use-deferred-delete", () => ({ flushDeferredDeletes: Effect.void }));
vi.mock("expo-updates", () => ({ reloadAsync: () => Promise.resolve() }));
import { settleBeforeSignOut, signOutToPersonal } from "./profiles-commands";

const db = {} as Database;

describe("signing out from a profile", () => {
    beforeEach(() => {
        vi.stubGlobal("__DEV__", false);
        activeFile = WORK;
        drain = Effect.void;
    });

    it("keeps the profile and its session when its captures can't be drained", async () => {
        drain = Effect.fail(new QueueUnreadable());

        const exit = await Effect.runPromiseExit(settleBeforeSignOut(db));

        expect(Exit.isFailure(exit)).toBe(true);
        expect(activeFile).toBe(WORK);
    });

    it("lands on Personal even when the sign-out request fails", async () => {
        const exit = await Effect.runPromiseExit(signOutToPersonal(Effect.fail(new Offline())));

        expect(Exit.isFailure(exit)).toBe(true);
        expect(activeFile).toBeUndefined();
    });
});
