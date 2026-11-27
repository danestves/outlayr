/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { storageComponent } from "@outlayr/storage/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { photoKeyFor } from "./lib/photoKeys";
import { PROFILE_INVITE_TTL_MS, PROFILE_MEMBER_LIMIT } from "./profileSharing";
import { authenticatedAs, revokePro, seedAuthUser, seedProUser } from "./test.helpers";
import type { SeededIdentity } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

type TestClient = TestConvex<typeof schema>;
type PushRows = FunctionArgs<typeof api.sync.push>["rows"];
type TransactionRow = Extract<PushRows[number], { table: "transactions" }>;

const HOME = "0b8f3c3e-6a51-4c4e-9f3b-2a7d5e1c9a10";
const DEVICE_OWNER = "device-owner";
const DEVICE_MEMBER = "device-member";
const OTHER = "5d2e7a14-93b8-4f61-8c0d-1e6b3f9a2c47";
const LOOK = { customColor: null, emoji: "🏠", icon: null, imageColor: null, imageKey: null, name: "Home" };

function harness() {
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    rateLimiterTest.register(t);
    t.registerComponent("storage", storageComponent.schema, storageComponent.modules);
    return t;
}

beforeEach(() => {
    vi.stubEnv("PROFILE_SHARING", "true");
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

function entry(localId: string, updatedAt: number, imageKey: string | null = null): TransactionRow {
    return {
        deletedAt: null,
        fields: {
            accountId: null,
            amount: 20,
            amountUsd: 20,
            categoryId: null,
            currency: "USD",
            customColor: null,
            date: 1_700_000_000_000,
            day: 1_700_000_000_000,
            details: null,
            emoji: null,
            exchangeRate: 1,
            exchangeRateType: "official",
            icon: null,
            imageColor: null,
            imageKey,
            income: false,
            month: 1_700_000_000_000,
            note: localId,
            onceRecurring: false,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: 0,
        },
        localId,
        table: "transactions",
        updatedAt,
    };
}

function registryRow(profileId: string): PushRows[number] {
    return {
        deletedAt: null,
        fields: { ...LOOK, dateCreated: 1, sortOrder: 0 },
        localId: profileId,
        table: "profiles",
        updatedAt: 100,
    };
}

function push(t: TestClient, who: SeededIdentity, deviceId: string, rows: PushRows, ledger: string | null = HOME) {
    return authenticatedAs(t, who).mutation(api.sync.push, { deviceId, profileId: ledger ?? undefined, rows });
}

async function pulled(t: TestClient, who: SeededIdentity, ledger: string | null = HOME) {
    const page = await authenticatedAs(t, who).query(api.sync.pullSince, { cursor: 0, profileId: ledger ?? undefined });
    return page.rows.map((row) => row.localId);
}

async function share(t: TestClient, owner: SeededIdentity, member: SeededIdentity) {
    const { code } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
        look: LOOK,
        profileId: HOME,
    });
    const result = await authenticatedAs(t, member).mutation(api.profileSharing.claim, { code });
    expect(result).toStrictEqual({ profileId: HOME, status: "joined" });
    return code;
}

describe("a joined profile", () => {
    it("syncs one ledger between owner and member, and no one else", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        const stranger = await seedProUser(t);
        await push(t, owner, DEVICE_OWNER, [entry("owner-entry", 100)]);

        await share(t, owner, member);
        await push(t, member, DEVICE_MEMBER, [entry("member-entry", 200)]);
        await push(t, stranger, DEVICE_MEMBER, [entry("stranger-entry", 300)]);

        await expect(pulled(t, owner)).resolves.toStrictEqual(["owner-entry", "member-entry"]);
        await expect(pulled(t, member)).resolves.toStrictEqual(["owner-entry", "member-entry"]);
        await expect(pulled(t, stranger)).resolves.toStrictEqual(["stranger-entry"]);
        await expect(pulled(t, member, null)).rejects.toThrow("Pro");
    });

    it("keeps the member who logged an entry as its author when someone else edits it", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        await share(t, owner, member);

        const created = entry("shared-entry", 100);
        await push(t, member, DEVICE_MEMBER, [{ ...created, fields: { ...created.fields, createdBy: owner.userId } }]);

        const storedAuthor = (localId: string) =>
            t.run(async (ctx) => {
                const rows = await ctx.db.query("transactions").collect();
                return rows.find((row) => row.localId === localId)?.createdBy;
            });

        await expect(storedAuthor("shared-entry")).resolves.toBe(member.userId);
        const pulledByOwner = await authenticatedAs(t, owner).query(api.sync.pullSince, {
            cursor: 0,
            profileId: HOME,
        });
        expect(pulledByOwner.rows.find((row) => row.localId === "shared-entry")?.fields.createdBy).toBe(member.userId);

        const edited = entry("shared-entry", 200);
        await push(t, owner, DEVICE_OWNER, [
            { ...edited, fields: { ...edited.fields, createdBy: owner.userId, note: "edited by the owner" } },
        ]);

        const afterEdit = await authenticatedAs(t, owner).query(api.sync.pullSince, { cursor: 0, profileId: HOME });
        const editedRow = afterEdit.rows.find((row) => row.localId === "shared-entry");
        expect(editedRow?.fields.note).toBe("edited by the owner");
        expect(editedRow?.fields.createdBy).toBe(member.userId);
    });

    it("drops the author when the entry is erased", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        await share(t, owner, member);

        await push(t, member, DEVICE_MEMBER, [entry("erased-entry", 100)]);
        const erased = entry("erased-entry", 200);
        await push(t, owner, DEVICE_OWNER, [
            {
                ...erased,
                deletedAt: 200,
                fields: { ...erased.fields, amount: 0, createdBy: owner.userId, date: 0, day: 0, month: 0, note: "" },
            },
        ]);

        const stored = await t.run(async (ctx) =>
            (await ctx.db.query("transactions").collect()).find((row) => row.localId === "erased-entry")
        );
        expect(stored?.deletedAt).toBe(200);
        expect(stored?.createdBy).toBeNull();
    });

    it("rides on the owner's Pro, so a lapsed owner stops the member too", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        await share(t, owner, member);

        await revokePro(t, owner);

        await expect(pulled(t, member)).rejects.toThrow("Pro");
        await expect(push(t, member, DEVICE_MEMBER, [entry("late", 100)])).rejects.toThrow("Pro");
    });

    it("refuses a removed member instead of handing them an empty ledger", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        await share(t, owner, member);
        await push(t, member, DEVICE_MEMBER, [entry("kept", 100)]);

        await authenticatedAs(t, owner).mutation(api.profileSharing.removeMember, {
            memberId: member.userId,
            profileId: HOME,
        });

        await expect(pulled(t, member)).rejects.toThrow();
        await expect(push(t, member, DEVICE_MEMBER, [entry("after", 200)])).rejects.toThrow();
        await expect(authenticatedAs(t, member).query(api.profileSharing.joined, {})).resolves.toStrictEqual([]);
        await expect(pulled(t, owner)).resolves.toStrictEqual(["kept"]);
    });

    it("refuses a revoked session instead of listing no memberships", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        await share(t, owner, member);

        await expect(
            authenticatedAs(t, { ...member, sessionId: "revoked" }).query(api.profileSharing.joined, {})
        ).rejects.toThrow();
    });

    it("ends every membership when the owner deletes the profile", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        await share(t, owner, member);

        await push(
            t,
            owner,
            DEVICE_OWNER,
            [
                {
                    deletedAt: 500,
                    fields: { ...LOOK, dateCreated: 1, sortOrder: 0 },
                    localId: HOME,
                    restoredAt: null,
                    table: "profiles",
                    updatedAt: 500,
                },
            ],
            null
        );

        await expect(pulled(t, member)).rejects.toThrow();
        await expect(authenticatedAs(t, member).query(api.profileSharing.joined, {})).resolves.toStrictEqual([]);
    });

    it("lets only the owner invite or remove people", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        const other = await seedAuthUser(t);
        await share(t, owner, member);
        await share(t, owner, other);

        await expect(
            authenticatedAs(t, member).mutation(api.profileSharing.createInvite, { look: LOOK, profileId: HOME })
        ).rejects.toThrow();
        await expect(
            authenticatedAs(t, member).mutation(api.profileSharing.removeMember, {
                memberId: other.userId,
                profileId: HOME,
            })
        ).rejects.toThrow();
        await expect(pulled(t, other)).resolves.toStrictEqual([]);
    });

    it("shows a shared entry's photo to everyone in the profile, and nothing else of anyone's", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedProUser(t);
        const stranger = await seedProUser(t);
        await share(t, owner, member);
        const sharedKey = photoKeyFor(member.userId, "shared.jpg");
        const personalKey = photoKeyFor(owner.userId, "personal.jpg");
        await push(t, member, DEVICE_MEMBER, [entry("shared-photo", 100, sharedKey)]);
        await push(t, owner, DEVICE_OWNER, [entry("personal-photo", 100, personalKey)], null);
        await t.run(async (ctx) => {
            for (const key of [sharedKey, personalKey]) {
                await ctx.db.insert("photoObjects", { key, storageId: await ctx.storage.store(new Blob(["x"])) });
            }
        });
        const readable = async (who: SeededIdentity) => {
            const urls = await authenticatedAs(t, who).mutation(api.photos.readUrls, {
                keys: [sharedKey, personalKey],
            });
            return urls.map((url) => url.key).toSorted();
        };

        await expect(readable(owner)).resolves.toStrictEqual([personalKey, sharedKey].toSorted());
        await expect(readable(member)).resolves.toStrictEqual([sharedKey]);
        await expect(readable(stranger)).resolves.toStrictEqual([]);

        await push(t, member, DEVICE_MEMBER, [entry("named-in-home", 150, personalKey)]);
        await expect(readable(member)).resolves.toStrictEqual([sharedKey]);

        await authenticatedAs(t, member).mutation(api.profileSharing.leave, { profileId: HOME });
        await expect(readable(owner)).resolves.toStrictEqual([personalKey, sharedKey].toSorted());

        const accomplice = await seedProUser(t);
        const { code } = await authenticatedAs(t, member).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: OTHER,
        });
        await authenticatedAs(t, accomplice).mutation(api.profileSharing.claim, { code });
        await push(t, member, DEVICE_MEMBER, [entry("named-only", 200, personalKey)], OTHER);
        await expect(readable(member)).resolves.toStrictEqual([sharedKey]);
        await expect(readable(accomplice)).resolves.toStrictEqual([]);

        // A key stored before the push guard existed, e.g. from a restored archive.
        await t.run(async (ctx) => {
            const rows = await ctx.db.query("transactions").collect();
            const row = rows.find((candidate) => candidate.localId === "named-only");
            if (row) {
                await ctx.db.patch(row._id, { imageKey: personalKey });
            }
        });
        await expect(readable(member)).resolves.toStrictEqual([sharedKey]);
        await expect(readable(accomplice)).resolves.toStrictEqual([]);
    });

    it("keeps a departed member's photo while the shared ledger still names it", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedProUser(t);
        await share(t, owner, member);
        const key = photoKeyFor(member.userId, "receipt.jpg");
        await push(t, member, DEVICE_MEMBER, [entry("with-photo", 100, key)]);
        await authenticatedAs(t, member).mutation(api.profileSharing.leave, { profileId: HOME });

        const result = await authenticatedAs(t, member).mutation(api.photos.releaseUnreferenced, { key });

        expect(result).toStrictEqual({ released: false });
    });
});

describe("claiming an invite", () => {
    it("stays closed until sharing is switched on", async () => {
        vi.stubEnv("PROFILE_SHARING", "false");
        const t = harness();
        const owner = await seedProUser(t);

        await expect(
            authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, { look: LOOK, profileId: HOME })
        ).rejects.toThrow("PROFILE_SHARING_OFF");
    });

    it("hides invite details while sharing is switched off", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const { code } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: HOME,
        });

        vi.stubEnv("PROFILE_SHARING", "false");
        await expect(authenticatedAs(t, owner).query(api.profileSharing.invite, { code })).resolves.toBeNull();
    });

    it("refuses the owner, a second claimant, and a stale code", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const first = await seedAuthUser(t);
        const second = await seedAuthUser(t);
        const late = await seedAuthUser(t);
        const claim = (who: SeededIdentity, code: string) =>
            authenticatedAs(t, who).mutation(api.profileSharing.claim, { code });

        const code = await share(t, owner, first);
        await push(t, owner, DEVICE_OWNER, [registryRow(HOME)], null);
        await expect(claim(owner, code)).resolves.toMatchObject({ status: "own" });
        await expect(claim(second, code)).resolves.toMatchObject({ status: "claimed" });
        await expect(claim(first, code)).resolves.toStrictEqual({ profileId: HOME, status: "joined" });
        await expect(authenticatedAs(t, second).query(api.profileSharing.invite, { code })).resolves.toStrictEqual({
            look: null,
            ownerName: null,
            profileId: null,
            state: "claimed",
        });

        vi.useFakeTimers();
        const { code: stale } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: HOME,
        });
        vi.advanceTimersByTime(PROFILE_INVITE_TTL_MS + 1);
        await expect(claim(late, stale)).resolves.toMatchObject({ status: "expired" });
        await expect(pulled(t, late)).rejects.toThrow("Pro");
    });

    it("reads an open invite without a signed-in viewer", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const { code } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: HOME,
        });

        await expect(t.query(api.profileSharing.invite, { code })).resolves.toMatchObject({
            profileId: null,
            state: "open",
        });
    });

    it("names the profile to a viewer who is already a member", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        const code = await share(t, owner, member);

        await expect(authenticatedAs(t, member).query(api.profileSharing.invite, { code })).resolves.toMatchObject({
            profileId: HOME,
            state: "member",
        });
    });

    it(`stops at ${PROFILE_MEMBER_LIMIT} members`, async () => {
        const t = harness();
        const owner = await seedProUser(t);
        for (let joined = 0; joined < PROFILE_MEMBER_LIMIT; joined += 1) {
            await share(t, owner, await seedAuthUser(t));
        }

        await expect(
            authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, { look: LOOK, profileId: HOME })
        ).rejects.toThrow();
    });

    it("refuses a lapsed owner's invite", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        const { code } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: HOME,
        });
        await revokePro(t, owner);

        await expect(authenticatedAs(t, member).mutation(api.profileSharing.claim, { code })).resolves.toMatchObject({
            status: "ownerLapsed",
        });
    });

    it("purges the shared ledger with the owner's account and refuses its members after", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedProUser(t);
        await share(t, owner, member);
        await push(t, member, DEVICE_MEMBER, [entry("member-entry", 100)]);
        await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, { look: LOOK, profileId: HOME });

        const { resumeSecret } = await authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {});
        await t.mutation(api.accountDeletion.recordAppleRevocation, { resumeSecret });
        let status = await t.mutation(api.accountDeletion.advance, { resumeSecret });
        for (let step = 0; status.phase !== "purged" && step < 10; step += 1) {
            status = await t.mutation(api.accountDeletion.advance, { resumeSecret });
        }

        expect(status.phase).toBe("purged");
        const left = await t.run(async (ctx) => ({
            entries: await ctx.db.query("transactions").collect(),
            invites: await ctx.db.query("profileInvites").collect(),
            members: await ctx.db.query("profileMembers").collect(),
        }));
        expect(left.entries).toStrictEqual([]);
        expect(left.invites).toStrictEqual([]);
        expect(left.members.map((row) => ({ look: row.look.name, ownerId: row.ownerId }))).toStrictEqual([
            { look: "", ownerId: expect.stringMatching(/^deleted:/) },
        ]);
        await expect(pulled(t, member)).rejects.toThrow();
        await expect(push(t, member, DEVICE_MEMBER, [entry("late", 200)])).rejects.toThrow();
    });

    it("never lets another account reuse a shared profile's id to let a removed member back in", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const removed = await seedAuthUser(t);
        const accomplice = await seedProUser(t);
        await share(t, owner, removed);
        await authenticatedAs(t, owner).mutation(api.profileSharing.removeMember, {
            memberId: removed.userId,
            profileId: HOME,
        });

        await expect(
            authenticatedAs(t, accomplice).mutation(api.profileSharing.createInvite, { look: LOOK, profileId: HOME })
        ).rejects.toThrow();
        await expect(pulled(t, removed)).rejects.toThrow();
    });

    it("needs a fresh invite after removal, even with the code that was claimed", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedAuthUser(t);
        const code = await share(t, owner, member);
        await authenticatedAs(t, owner).mutation(api.profileSharing.removeMember, {
            memberId: member.userId,
            profileId: HOME,
        });

        await expect(authenticatedAs(t, member).mutation(api.profileSharing.claim, { code })).resolves.toMatchObject({
            status: "claimed",
        });
        await share(t, owner, member);
        await expect(pulled(t, member)).resolves.toStrictEqual([]);
    });

    it("refuses an invite whose id is already one of the claimant's own ledgers", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedProUser(t);
        await push(t, member, DEVICE_MEMBER, [entry("their-own", 100)]);
        const { code } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: HOME,
        });

        await expect(authenticatedAs(t, member).mutation(api.profileSharing.claim, { code })).resolves.toMatchObject({
            status: "invalid",
        });
        await expect(pulled(t, member)).resolves.toStrictEqual(["their-own"]);
    });

    it("refuses an invite whose id is the claimant's own profile before its ledger syncs", async () => {
        const t = harness();
        const owner = await seedProUser(t);
        const member = await seedProUser(t);
        await push(t, member, DEVICE_MEMBER, [registryRow(HOME)], null);
        const { code } = await authenticatedAs(t, owner).mutation(api.profileSharing.createInvite, {
            look: LOOK,
            profileId: HOME,
        });

        await expect(authenticatedAs(t, member).mutation(api.profileSharing.claim, { code })).resolves.toMatchObject({
            status: "invalid",
        });
    });
});
