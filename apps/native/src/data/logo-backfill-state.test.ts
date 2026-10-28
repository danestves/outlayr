import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { migratedDatabase } from "@/db/test-database";

import {
    candidateLogoIds,
    dismissedLogoIds,
    LOGO_CANDIDATE_KEEP_MS,
    rememberLogoCandidate,
    rememberLogoDismissal,
} from "./logo-backfill-state";

const NOW = Date.UTC(2026, 8, 19);
const IDS = ["a", "b", "c", "d", "e"];

describe("logo backfill state", () => {
    it("keeps every candidate when saves overlap", async () => {
        const db = migratedDatabase();

        await Effect.runPromise(
            Effect.all(
                IDS.map((id) => rememberLogoCandidate(db, id, NOW, LOGO_CANDIDATE_KEEP_MS)),
                { concurrency: "unbounded" }
            )
        );

        const candidates = await Effect.runPromise(candidateLogoIds(db));
        expect([...candidates.keys()].toSorted()).toStrictEqual(IDS);
    });

    it("keeps every dismissal when saves overlap", async () => {
        const db = migratedDatabase();

        await Effect.runPromise(
            Effect.all(
                IDS.map((id) => rememberLogoDismissal(db, id)),
                { concurrency: "unbounded" }
            )
        );

        const dismissed = await Effect.runPromise(dismissedLogoIds(db));
        expect([...dismissed].toSorted()).toStrictEqual(IDS);
    });
});
