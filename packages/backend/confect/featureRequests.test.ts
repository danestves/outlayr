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
    it("files the request under the account's person when analytics are on or an email is attached", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);
        const asOwner = authenticatedAs(t, owner);

        await expect(
            asOwner.action(api.featureRequests.submit, { ...ARGS, linkAccount: false, notify: true })
        ).resolves.toBe("ok");
        await asOwner.action(api.featureRequests.submit, { ...ARGS, linkAccount: true, notify: false });

        expect(captured).toHaveLength(2);
        const [withEmail, analyticsOn] = captured;
        expect(withEmail).toMatchObject({ distinct_id: owner.userId, event: "survey sent" });
        expect(withEmail?.properties).toMatchObject({
            [response(QUESTIONS.email.id)]: owner.email,
            [response(QUESTIONS.wish.id)]: ARGS.wish,
            $survey_submission_id: ARGS.submissionId,
        });
        expect(withEmail?.properties).not.toHaveProperty(response(QUESTIONS.reason.id));
        expect(withEmail?.properties).not.toHaveProperty("$process_person_profile");
        expect(analyticsOn).toMatchObject({ distinct_id: owner.userId });
        expect(analyticsOn?.properties).not.toHaveProperty(response(QUESTIONS.email.id));
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

    it("caps signed-out requests on their own, so they can't lock out signed-in users", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);

        for (let index = 0; index < 50; index += 1) {
            await t.action(api.featureRequests.submit, { ...ARGS, submissionId: `anonymous-${index}` });
        }

        await expect(t.action(api.featureRequests.submit, ARGS)).resolves.toBe("rateLimited");
        await expect(authenticatedAs(t, owner).action(api.featureRequests.submit, ARGS)).resolves.toBe("ok");
    });
});
