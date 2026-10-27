import { expect, test } from "@jest/globals";
import * as Effect from "effect/Effect";

import { migratedDatabase } from "@/db/test-database";

import { META_KEYS, setMeta } from "./app-meta-core";
import * as SyncStore from "./sync-store";

test("fails a pass that throws as a SyncError, so the engine logs it and keeps listening", async () => {
    const db = migratedDatabase({ foreignKeys: false });
    await setMeta(db, META_KEYS.syncEnabled, "1");
    const malformedPage = () => Promise.resolve(JSON.parse("{}"));
    const error = await Effect.runPromise(
        SyncStore.make.pipe(
            Effect.flatMap((store) => store.sync(db)),
            Effect.provideService(SyncStore.SyncTransport, { pull: malformedPage, push: malformedPage }),
            Effect.flip
        )
    );
    expect(error).toMatchObject({ _tag: "SyncError", stage: "pass" });
    expect(error.cause).toBeInstanceOf(TypeError);
});
