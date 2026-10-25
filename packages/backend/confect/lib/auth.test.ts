/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vite-plus/test";

import schema from "../../convex/schema";
import { authenticatedAs, seedAuthUser } from "../test.helpers";
import { optionalUserId, requireUserId } from "./auth";

const modules = import.meta.glob("../../convex/**/*.ts");

describe(requireUserId, () => {
    it("returns the Better Auth user id for an authenticated caller", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const resolved = await authenticatedAs(t, identity).run((ctx) => requireUserId(ctx));

        expect(resolved).toBe(identity.userId);
    });

    it("throws a ConvexError when there is no identity", async () => {
        const t = convexTest(schema, modules);

        await expect(t.run((ctx) => requireUserId(ctx))).rejects.toThrow(ConvexError);
    });

    it("throws when the identity names a session that does not exist", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const stale = t.withIdentity({
            sessionId: "session-that-was-revoked",
            subject: identity.subject,
        });

        await expect(stale.run((ctx) => requireUserId(ctx))).rejects.toThrow(ConvexError);
    });
});

describe(optionalUserId, () => {
    it("returns the Better Auth user id for an authenticated caller", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const resolved = await authenticatedAs(t, identity).run((ctx) => optionalUserId(ctx));

        expect(resolved).toBe(identity.userId);
    });

    it("returns null when there is no identity", async () => {
        const t = convexTest(schema, modules);

        await expect(t.run((ctx) => optionalUserId(ctx))).resolves.toBeNull();
    });

    it("returns null when the identity names a session that does not exist", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const stale = t.withIdentity({
            sessionId: "session-that-was-revoked",
            subject: identity.subject,
        });

        await expect(stale.run((ctx) => optionalUserId(ctx))).resolves.toBeNull();
    });
});
