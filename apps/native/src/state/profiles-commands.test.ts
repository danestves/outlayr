import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Schema from "effect/Schema";
import { reloadAsync } from "expo-updates";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { drainPendingWrites, reopenDrains } from "@/data/pending-writes-core";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

const WORK = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
let activeFile: string | undefined;
let recordedSwitches = 0;
class QueueUnreadable extends Schema.TaggedError<QueueUnreadable>()("QueueUnreadable", {}) {}
class Offline extends Schema.TaggedError<Offline>()("Offline", {}) {}

let drain: Effect.Effect<void, QueueUnreadable> = Effect.void;

vi.mock("@/lib/active-profile", () => ({
    activeProfileId: () => WORK,
    clearProfileSwitch: () => undefined,
    readProfileSwitch: () => null,
    recordProfileSwitch: () => {
        recordedSwitches += 1;
    },
    restoreProfileSwitch: () => undefined,
    writeActiveProfile: (id: string | undefined) => {
        activeFile = id;
    },
}));
vi.mock("@/data/pending-writes", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/data/pending-writes")>()),
    drainDevicePendingWritesOrFail: () => drain,
}));
vi.mock("@/data/use-deferred-delete", () => ({ flushDeferredDeletes: Effect.void }));
vi.mock("expo-updates", () => ({ reloadAsync: vi.fn(() => Promise.resolve()) }));
import { settleBeforeSignOut, signOutToPersonal, switchProfileCommand } from "./profiles-commands";

const db = {} as Database;

describe("signing out from a profile", () => {
    beforeEach(() => {
        vi.stubGlobal("__DEV__", false);
        activeFile = WORK;
        recordedSwitches = 0;
        drain = Effect.void;
        reopenDrains();
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

describe("switching profiles", () => {
    beforeEach(() => {
        vi.stubGlobal("__DEV__", false);
        activeFile = WORK;
        recordedSwitches = 0;
        drain = Effect.void;
        reopenDrains();
    });

    it("puts the launch profile back and reopens the drains when the reload fails", async () => {
        vi.mocked(reloadAsync).mockRejectedValueOnce(new Error("reload failed"));
        const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

        const result = await switchProfileCommand.run(registry, { from: db, profileId: undefined });
        registry.dispose();

        expect(AsyncResult.isFailure(result)).toBe(true);
        expect(recordedSwitches).toBe(1);
        expect(activeFile).toBe(WORK);

        const claim = vi.fn(() => ({ jobs: [], names: [], seen: new Set<string>() }));
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).toHaveBeenCalledOnce();
    });
});
