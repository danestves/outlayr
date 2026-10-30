/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { QUESTIONS } from "./featureRequests";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const ARGS = {
    appVersion: "1.4.0",
    linkAccount: true,
    locale: "es-VE",
    notify: true,
    osName: "iOS",
    osVersion: "26.1",
    reason: "",
    submissionId: "3f0c8a2e-5b7d-4c1e-9a6f-2d8b4e7c1a90",
    wish: "split a bill with friends",
};

const response = (id: string) => `$survey_response_${id}`;

let captured: Record<string, unknown>[] = [];

beforeEach(() => {
    captured = [];
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubGlobal(
        "fetch",
        vi.fn(async (_input: URL, init?: RequestInit) => {
            captured.push(JSON.parse(String(init?.body)));
            return Response.json({ status: 1 });
        })
    );
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

function setup() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    return t;
}

describe("submitting a feature request", () => {
    it("attaches the session's email under the account's person when asked", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);

        await expect(authenticatedAs(t, owner).action(api.featureRequests.submit, ARGS)).resolves.toBe("ok");

        expect(captured).toHaveLength(1);
        const [event] = captured;
        expect(event).toMatchObject({ distinct_id: owner.userId, event: "survey sent" });
        expect(event?.properties).toMatchObject({
            [response(QUESTIONS.email.id)]: owner.email,
            [response(QUESTIONS.wish.id)]: ARGS.wish,
            $survey_submission_id: ARGS.submissionId,
        });
        expect(event?.properties).not.toHaveProperty(response(QUESTIONS.reason.id));
        expect(event?.properties).not.toHaveProperty("$process_person_profile");
    });

    it("keeps signed-out and analytics-off requests off any person and email", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);

        await t.action(api.featureRequests.submit, ARGS);
        await authenticatedAs(t, owner).action(api.featureRequests.submit, {
            ...ARGS,
            linkAccount: false,
            notify: false,
        });

        expect(captured).toHaveLength(2);
        for (const event of captured) {
            expect(event.distinct_id).not.toBe(owner.userId);
            expect(event.properties).toMatchObject({ $process_person_profile: false });
            expect(event.properties).not.toHaveProperty(response(QUESTIONS.email.id));
        }
    });
});
