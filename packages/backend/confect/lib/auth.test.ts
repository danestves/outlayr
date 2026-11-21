/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import schema from "../../convex/schema";
import { authenticatedAs, seedAuthUser } from "../test.helpers";
import { liveIdentity, optionalBillingId, optionalUserId, requireUserId, Unauthenticated } from "./auth";
import { runEdge } from "./runEdge";

const modules = import.meta.glob("../../convex/**/*.ts");

describe(requireUserId, () => {
    it("returns the Better Auth user id for an authenticated caller", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const resolved = await authenticatedAs(t, identity).run((ctx) => runEdge(requireUserId(ctx)));

        expect(resolved).toBe(identity.userId);
    });

    it("throws a ConvexError when there is no identity", async () => {
        const t = convexTest(schema, modules);

        await expect(t.run((ctx) => runEdge(requireUserId(ctx)))).rejects.toThrow(Unauthenticated);
    });

    it("throws when the identity names a session that does not exist", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const stale = t.withIdentity({
            sessionId: "session-that-was-revoked",
            subject: identity.subject,
        });

        await expect(stale.run((ctx) => runEdge(requireUserId(ctx)))).rejects.toThrow(Unauthenticated);
    });
});

describe(optionalUserId, () => {
    it("returns the Better Auth user id for an authenticated caller", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const resolved = await authenticatedAs(t, identity).run((ctx) => runEdge(optionalUserId(ctx)));

        expect(resolved).toBe(identity.userId);
    });

    it("returns null when there is no identity", async () => {
        const t = convexTest(schema, modules);

        await expect(t.run((ctx) => runEdge(optionalUserId(ctx)))).resolves.toBeNull();
    });

    it("keeps a guest out of account data but bills it", async () => {
        const t = convexTest(schema, modules);
        const guest = authenticatedAs(t, await seedAuthUser(t, { guest: true }));

        await expect(guest.run((ctx) => runEdge(optionalUserId(ctx)))).resolves.toBeNull();
        await expect(guest.run((ctx) => runEdge(optionalBillingId(ctx)))).resolves.not.toBeNull();
    });

    it("returns null when the identity names a session that does not exist", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const stale = t.withIdentity({
            sessionId: "session-that-was-revoked",
            subject: identity.subject,
        });

        await expect(stale.run((ctx) => runEdge(optionalUserId(ctx)))).resolves.toBeNull();
    });
});

describe(liveIdentity, () => {
    it("returns the identity while its session is live", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        const resolved = await authenticatedAs(t, identity).run((ctx) => runEdge(liveIdentity(ctx)));

        expect(resolved?.subject).toBe(identity.userId);
    });

    it("rejects a token that outlived its revoked session", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const retained = t.withIdentity({ sessionId: "session-that-was-revoked", subject: identity.subject });

        await expect(retained.run((ctx) => runEdge(liveIdentity(ctx)))).resolves.toBeNull();
    });
});
