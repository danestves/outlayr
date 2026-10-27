/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
});

test("refuses to start a deletion it could not finish without the upstream erase secrets", async () => {
    vi.stubEnv("REVENUECAT_SECRET_KEY", "");
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "");
    vi.stubEnv("POSTHOG_PROJECT_ID", "");
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);

    await expect(authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {})).rejects.toThrow(
        "REVENUECAT_SECRET_KEY, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID"
    );
    await expect(t.run((ctx) => ctx.db.query("accountDeletionJobs").collect())).resolves.toStrictEqual([]);
});
