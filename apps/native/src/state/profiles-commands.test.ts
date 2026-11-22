import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";

const WORK = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
let activeFile: string | undefined;
let drain: Effect.Effect<void, Error> = Effect.void;

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
import { signOutToPersonal } from "./profiles-commands";

const db = {} as Database;

describe("signOutToPersonal from a profile", () => {
    beforeEach(() => {
        vi.stubGlobal("__DEV__", false);
        activeFile = WORK;
        drain = Effect.void;
    });

    it("keeps the session when the profile's captures can't be drained", async () => {
        drain = Effect.fail(new Error("queue unreadable"));
        const signOut = vi.fn();

        const exit = await Effect.runPromiseExit(signOutToPersonal(db, Effect.sync(signOut)));

        expect(Exit.isFailure(exit)).toBe(true);
        expect(signOut).not.toHaveBeenCalled();
        expect(activeFile).toBe(WORK);
    });

    it("stays on the profile when the sign-out itself fails", async () => {
        const exit = await Effect.runPromiseExit(signOutToPersonal(db, Effect.fail(new Error("offline"))));

        expect(Exit.isFailure(exit)).toBe(true);
        expect(activeFile).toBe(WORK);
    });

    it("comes back on Personal once signed out", async () => {
        await Effect.runPromise(signOutToPersonal(db, Effect.void));

        expect(activeFile).toBeUndefined();
    });
});
