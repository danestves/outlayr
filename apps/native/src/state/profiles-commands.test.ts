import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Schema from "effect/Schema";
import { reloadAsync } from "expo-updates";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { closeDrains, drainPendingWrites, reopenDrains } from "@/data/pending-writes-core";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

const WORK = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const OTHER = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
let activeFile: string | undefined;
let recordedSwitches = 0;
let failSwitchMarker = false;
let profileLive = true;
class QueueUnreadable extends Schema.TaggedError<QueueUnreadable>()("QueueUnreadable", {}) {}
class Offline extends Schema.TaggedError<Offline>()("Offline", {}) {}

let drain: Effect.Effect<void, QueueUnreadable> = Effect.void;

vi.mock("@/lib/active-profile", () => ({
    activeProfileId: () => WORK,
    readProfileSwitch: () => [],
    recordProfileSwitch: () => {
        if (failSwitchMarker) {
            throw new Error("marker unreadable");
        }
        recordedSwitches += 1;
    },
    retargetProfileSwitch: () => undefined,
    writeActiveProfile: (id: string | undefined) => {
        activeFile = id;
    },
    writeProfileSwitch: () => undefined,
}));
vi.mock("@/data/pending-writes", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/data/pending-writes")>()),
    drainDevicePendingWritesOrFail: () => drain,
}));
vi.mock("@/data/use-deferred-delete", () => ({ flushDeferredDeletes: Effect.void }));
vi.mock("expo-updates", () => ({ reloadAsync: vi.fn(() => Promise.resolve()) }));
vi.mock("@/data/profile-ledger-files", () => ({ profileLedgerExists: () => true }));
vi.mock("@/data/profile-registry", () => ({ profileRegistry: () => ({}) }));
vi.mock("@/data/profiles-core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/data/profiles-core")>()),
    profileIsLive: () => Effect.succeed(profileLive),
}));
import { settleBeforeSignOut, signOutToPersonal, switchProfileCommand } from "./profiles-commands";

const db = {} as Database;

const emptyClaim = () => ({ jobs: [], names: [], seen: new Set<string>() });

describe("signing out from a profile", () => {
    beforeEach(() => {
        vi.stubGlobal("__DEV__", false);
        activeFile = WORK;
        recordedSwitches = 0;
        failSwitchMarker = false;
        drain = Effect.void;
        reopenDrains();
    });

    it("keeps the profile and its session, and reopens the drains, when its captures can't be drained", async () => {
        drain = Effect.fail(new QueueUnreadable());

        const exit = await Effect.runPromiseExit(settleBeforeSignOut(db));

        expect(Exit.isFailure(exit)).toBe(true);
        expect(activeFile).toBe(WORK);

        const claim = vi.fn(emptyClaim);
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).toHaveBeenCalledOnce();
    });

    it("lands on Personal even when the sign-out request fails, and keeps the drains shut", async () => {
        const exit = await Effect.runPromiseExit(
            settleBeforeSignOut(db).pipe(Effect.andThen(signOutToPersonal(Effect.fail(new Offline()))))
        );

        expect(Exit.isFailure(exit)).toBe(true);
        expect(activeFile).toBeUndefined();

        const claim = vi.fn(emptyClaim);
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).not.toHaveBeenCalled();
    });

    it("restores the profile and reopens the drains when its marker can't be written", async () => {
        failSwitchMarker = true;

        const exit = await Effect.runPromiseExit(
            settleBeforeSignOut(db).pipe(Effect.andThen(signOutToPersonal(Effect.void)))
        );

        expect(Exit.isFailure(exit)).toBe(true);
        expect(activeFile).toBe(WORK);

        const claim = vi.fn(emptyClaim);
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).toHaveBeenCalledOnce();
    });
});

describe("switching profiles", () => {
    beforeEach(() => {
        vi.stubGlobal("__DEV__", false);
        activeFile = WORK;
        recordedSwitches = 0;
        failSwitchMarker = false;
        profileLive = true;
        drain = Effect.void;
        reopenDrains();
    });

    it("switches into a live profile", async () => {
        const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

        const result = await switchProfileCommand.run(registry, { from: db, profileId: OTHER });
        registry.dispose();

        expect(AsyncResult.isSuccess(result)).toBe(true);
        expect(recordedSwitches).toBe(1);
        expect(activeFile).toBe(OTHER);
    });

    it("refuses a target the settle just deleted, and reopens the drains", async () => {
        profileLive = false;
        const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

        const result = await switchProfileCommand.run(registry, { from: db, profileId: OTHER });
        registry.dispose();

        expect(AsyncResult.isFailure(result)).toBe(true);
        expect(recordedSwitches).toBe(0);
        expect(activeFile).toBe(WORK);

        const claim = vi.fn(emptyClaim);
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).toHaveBeenCalledOnce();
    });

    it("puts the launch profile back and reopens the drains when the reload fails", async () => {
        vi.mocked(reloadAsync).mockRejectedValueOnce(new Error("reload failed"));
        const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

        const result = await switchProfileCommand.run(registry, { from: db, profileId: undefined });
        registry.dispose();

        expect(AsyncResult.isFailure(result)).toBe(true);
        expect(recordedSwitches).toBe(1);
        expect(activeFile).toBe(WORK);

        const claim = vi.fn(emptyClaim);
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).toHaveBeenCalledOnce();
    });

    it("refuses a switch while another transition still holds the drains shut", async () => {
        await Effect.runPromise(closeDrains());
        const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

        const result = await switchProfileCommand.run(registry, { from: db, profileId: undefined });
        registry.dispose();

        expect(AsyncResult.isFailure(result)).toBe(true);
        expect(recordedSwitches).toBe(0);

        const claim = vi.fn(emptyClaim);
        await Effect.runPromise(Effect.exit(drainPendingWrites(db, claim, () => undefined)));
        expect(claim).not.toHaveBeenCalled();
    });
});
