/// <reference types="vite/client" />

import { HOUR } from "@convex-dev/rate-limiter";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { normalizeReferralCode } from "@outlayr/money/contract";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { runEdge } from "./lib/runEdge";
import { DAY_MS } from "./mcpLedger";
import {
    addMonthsUtc,
    codeFromBytes,
    countDay,
    grantOwed,
    ineligibility,
    NEW_ACCOUNT_MS,
    rewardFor,
    stackedEnd,
} from "./referrals";
import { isPro } from "./revenuecat";
import { authenticatedAs, seedAuthUser } from "./test.helpers";
import type { SeededIdentity } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

type TestClient = TestConvex<typeof schema>;
type PushRows = FunctionArgs<typeof api.sync.push>["rows"];

const START = Date.UTC(2026, 10, 3, 15);
const SUBSCRIBER_PATH = /\/v1\/subscribers\/([^/]+)(\/entitlements\/pro\/promotional)?$/;

interface Plan {
    end: number | null;
    product: string;
    store: "app_store" | "promotional";
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

function fakeRevenueCat() {
    const plans = new Map<string, Plan[]>();
    const grants: { endsAt: number; userId: string }[] = [];

    const subscriber = (userId: string) => {
        const owned = plans.get(userId) ?? [];
        const latest = owned.reduce<Plan | null>((best, plan) => {
            if (best === null || plan.end === null) {
                return plan;
            }
            return best.end !== null && best.end > plan.end ? best : plan;
        }, null);
        return {
            entitlements: latest
                ? {
                      pro: {
                          expires_date: iso(latest.end),
                          product_identifier: latest.product,
                          purchase_date: iso(START),
                      },
                  }
                : {},
            subscriptions: Object.fromEntries(
                owned.map((plan) => [
                    plan.product,
                    {
                        expires_date: iso(plan.end),
                        is_sandbox: false,
                        period_type: "normal",
                        purchase_date: iso(START),
                        store: plan.store,
                    },
                ])
            ),
        };
    };

    const respond = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const match = SUBSCRIBER_PATH.exec(new URL(request.url).pathname);
        if (!match) {
            return Response.json({});
        }
        const userId = decodeURIComponent(match[1] ?? "");
        if (match[2]) {
            const { end_time_ms: endsAt } = (await request.json()) as { end_time_ms: number };
            grants.push({ endsAt, userId });
            const others = (plans.get(userId) ?? []).filter((plan) => plan.store !== "promotional");
            plans.set(userId, [...others, { end: endsAt, product: "rc_promo_pro_custom", store: "promotional" }]);
            return Response.json({ subscriber: subscriber(userId) }, { status: 201 });
        }
        return Response.json({ subscriber: subscriber(userId) });
    };

    return { grants, plans, respond };
}

let rc = fakeRevenueCat();

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    rc = fakeRevenueCat();
    vi.stubGlobal("fetch", vi.fn(rc.respond));
    vi.spyOn(console, "warn").mockReturnValue(undefined);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function harness(): TestClient {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    return t;
}

async function inviterWithCode(t: TestClient) {
    const inviter = await seedAuthUser(t, { name: "Daniel Esteves" });
    const code = await authenticatedAs(t, inviter).mutation(api.referrals.ensureCode, {});
    return { code, inviter };
}

async function redeem(t: TestClient, who: SeededIdentity, code: string) {
    return await authenticatedAs(t, who).action(api.referrals.redeem, { code });
}

async function joinedFriend(t: TestClient, code: string) {
    const friend = await seedAuthUser(t, { name: "Mariana Pérez" });
    await expect(redeem(t, friend, code)).resolves.toBe("claimed");
    return friend;
}

let entrySeq = 0;

function entry(): PushRows[number] {
    entrySeq += 1;
    return {
        deletedAt: null,
        fields: {
            accountId: null,
            amount: 4.5,
            amountUsd: 4.5,
            categoryId: null,
            currency: "USD",
            customColor: null,
            date: Date.now(),
            day: Date.now(),
            details: null,
            emoji: null,
            exchangeRate: 1,
            exchangeRateType: "official",
            icon: null,
            imageColor: null,
            imageKey: null,
            income: false,
            month: Date.now(),
            note: "coffee",
            onceRecurring: false,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: 0,
        },
        localId: `entry-${entrySeq}`,
        table: "transactions",
        updatedAt: Date.now(),
    };
}

async function logEntry(t: TestClient, who: SeededIdentity) {
    await authenticatedAs(t, who).mutation(api.sync.push, { deviceId: "device-aaaa", rows: [entry()] });
}

async function referralOf(t: TestClient, friend: SeededIdentity) {
    return await t.run(async (ctx) =>
        ctx.db
            .query("referrals")
            .withIndex("by_referredId", (q) => q.eq("referredId", friend.userId))
            .unique()
    );
}

async function rewardsOf(t: TestClient, who: SeededIdentity) {
    return await t.run(async (ctx) =>
        ctx.db
            .query("referralRewards")
            .withIndex("by_userId", (q) => q.eq("userId", who.userId))
            .unique()
    );
}

async function onLastDay(t: TestClient, friend: SeededIdentity) {
    const referral = await referralOf(t, friend);
    if (referral === null) {
        throw new Error("friend has no referral");
    }
    await t.run(async (ctx) => {
        await ctx.db.patch(referral._id, { daysLogged: 2, lastCountedAt: Date.now() - DAY_MS });
    });
}

describe("month stacking", () => {
    it("adds onto a grant still running, restarts from now after one lapsed, and clamps short months", () => {
        const now = Date.UTC(2026, 10, 3);

        expect(stackedEnd(now, Date.UTC(2026, 11, 20), 1)).toBe(Date.UTC(2027, 0, 20));
        expect(stackedEnd(now, Date.UTC(2026, 9, 1), 1)).toBe(Date.UTC(2026, 11, 3));
        expect(stackedEnd(now, null, 2)).toBe(Date.UTC(2027, 0, 3));
        expect(addMonthsUtc(Date.UTC(2027, 0, 31), 1)).toBe(Date.UTC(2027, 1, 28));
        expect(addMonthsUtc(Date.UTC(2027, 11, 15), 1)).toBe(Date.UTC(2028, 0, 15));
    });

    it("banks a month for a paid plan, stacks on a promotional one and skips lifetime", () => {
        expect(rewardFor(null)).toBe("grant");
        expect(rewardFor({ expiresAtMs: START + DAY_MS, store: "PROMOTIONAL" })).toBe("grant");
        expect(rewardFor({ expiresAtMs: START + DAY_MS, store: "APP_STORE" })).toBe("bank");
        expect(rewardFor({ store: "PLAY_STORE" })).toBe("none");
    });
});

describe("granting a reserved month", () => {
    it("owes a grant unless Pro already runs to the month's end", () => {
        const endsAt = START + 30 * DAY_MS;

        expect(grantOwed(null, endsAt)).toBeTruthy();
        expect(grantOwed({ expiresAtMs: endsAt - 3 * HOUR }, endsAt)).toBeTruthy();
        expect(grantOwed({ expiresAtMs: endsAt }, endsAt)).toBeFalsy();
        expect(grantOwed({ expiresAtMs: endsAt + DAY_MS }, endsAt)).toBeFalsy();
        expect(grantOwed({}, endsAt)).toBeFalsy();
    });
});

describe("days logged", () => {
    it("counts a new UTC day only 20 hours after the last one, and ignores a clock that went backwards", () => {
        const lateNight = Date.UTC(2026, 10, 3, 23);
        const counted = { daysLogged: 1, lastCountedAt: lateNight };

        expect(countDay({ daysLogged: 0, lastCountedAt: null }, lateNight)).toStrictEqual(counted);
        expect(countDay(counted, lateNight + 60_000)).toBeNull();
        expect(countDay(counted, lateNight + 2 * HOUR)).toBeNull();
        expect(countDay(counted, lateNight - DAY_MS)).toBeNull();
        expect(countDay(counted, lateNight + 20 * HOUR)).toStrictEqual({
            daysLogged: 2,
            lastCountedAt: lateNight + 20 * HOUR,
        });
    });

    it("lands the inviter's month on the friend's third separate day, not the third entry", async () => {
        const t = harness();
        const { code, inviter } = await inviterWithCode(t);
        const friend = await joinedFriend(t, code);

        await logEntry(t, friend);
        await logEntry(t, friend);
        await logEntry(t, friend);
        await expect(referralOf(t, friend)).resolves.toMatchObject({ daysLogged: 1, status: "counting" });

        vi.setSystemTime(START + DAY_MS);
        await logEntry(t, friend);
        vi.setSystemTime(START + 2 * DAY_MS);
        await logEntry(t, friend);

        const referral = await referralOf(t, friend);
        expect(referral).toMatchObject({ daysLogged: 3, status: "rewarded" });
        const endsAt = addMonthsUtc(referral?.rewardedAt ?? 0, 1);
        await expect(rewardsOf(t, inviter)).resolves.toMatchObject({ bankedMonths: 0, promoEndsAt: endsAt });

        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(rc.grants).toContainEqual({ endsAt, userId: inviter.userId });
        await expect(t.run((ctx) => runEdge(isPro(ctx, inviter.userId)))).resolves.toBeTruthy();
    });
});

describe("redeeming an invite", () => {
    it("gives a new friend a month of Pro at sign-in", async () => {
        const t = harness();
        const { code } = await inviterWithCode(t);

        const friend = await joinedFriend(t, code);

        const claimedAt = (await referralOf(t, friend))?.claimedAt ?? 0;
        expect(rc.grants).toStrictEqual([{ endsAt: addMonthsUtc(claimedAt, 1), userId: friend.userId }]);
        await expect(t.run((ctx) => runEdge(isPro(ctx, friend.userId)))).resolves.toBeTruthy();
        await expect(t.query(api.referrals.inviter, { code: code.toLowerCase() })).resolves.toStrictEqual({
            name: "Daniel",
        });
    });

    it("refuses the inviter's own code, a second invite, an older account and anyone who has had Pro", async () => {
        const t = harness();
        const { code, inviter } = await inviterWithCode(t);
        const other = await inviterWithCode(t);
        const friend = await joinedFriend(t, code);
        const older = await seedAuthUser(t, { createdAt: START - NEW_ACCOUNT_MS - 1 });
        const lapsed = await seedAuthUser(t);
        rc.plans.set(lapsed.userId, [{ end: START - DAY_MS, product: "monthly", store: "app_store" }]);

        await expect(redeem(t, inviter, code)).resolves.toBe("own");
        await expect(redeem(t, friend, other.code)).resolves.toBe("used");
        await expect(redeem(t, older, code)).resolves.toBe("notNew");
        await expect(redeem(t, lapsed, code)).resolves.toBe("hadPro");
        await expect(redeem(t, lapsed, "2222 2222")).resolves.toBe("invalid");

        expect(rc.grants.map(({ userId }) => userId)).toStrictEqual([friend.userId]);
    });

    it("stops counting an account as new the moment it turns seven days old", () => {
        const claimant = { alreadyRedeemed: false, hadPro: false, now: START };

        expect(ineligibility({ ...claimant, accountCreatedAt: START - NEW_ACCOUNT_MS })).toBe("notNew");
        expect(ineligibility({ ...claimant, accountCreatedAt: START - NEW_ACCOUNT_MS + 1 })).toBeNull();
    });

    it("rate-limits guesses, wrong codes included", async () => {
        const t = harness();
        const { code } = await inviterWithCode(t);
        const guesser = await seedAuthUser(t);

        const answers = [];
        for (let attempt = 0; attempt < 6; attempt += 1) {
            answers.push(await redeem(t, guesser, "ZZZZ ZZZZ"));
        }

        expect(answers.at(-1)).toBe("rateLimited");
        await expect(redeem(t, guesser, code)).resolves.toBe("rateLimited");
    });

    it("reads a code however it is typed or pasted, and nothing with an ambiguous character", () => {
        expect(normalizeReferralCode(" 7q4k-m9tx ")).toBe("7Q4KM9TX");
        expect(normalizeReferralCode("https://tryoutlayr.com/i/7q4km9tx")).toBe("7Q4KM9TX");
        expect(normalizeReferralCode("https://tryoutlayr.com/i/7q4km9tx/?utm_source=x#top")).toBe("7Q4KM9TX");
        expect(normalizeReferralCode("7Q4K M9T0")).toBeNull();
        expect(normalizeReferralCode("7Q4KM9T")).toBeNull();
    });

    it("draws codes without favouring any character", () => {
        const biased = Uint8Array.from([255, 254, 253, 252, 251, 250, 249, 248, 0, 1, 2, 3, 4, 5, 6, 7]);

        expect(codeFromBytes(biased)).toBe("23456789");
        expect(codeFromBytes(Uint8Array.from([255, 0, 1]))).toBeNull();
    });
});

describe("the yearly cap", () => {
    it("counts months from the last 365 days only and stops at twelve", async () => {
        const t = harness();
        const { code, inviter } = await inviterWithCode(t);
        await t.run(async (ctx) => {
            const rewardedAt = [
                START - 366 * DAY_MS,
                ...Array.from({ length: 11 }, (_, index) => START - index * DAY_MS),
            ];
            for (const [index, at] of rewardedAt.entries()) {
                await ctx.db.insert("referrals", {
                    claimedAt: at,
                    daysLogged: 3,
                    lastCountedAt: at,
                    referredId: `earlier-${index}`,
                    referredName: null,
                    referrerId: inviter.userId,
                    rewardedAt: at,
                    status: "rewarded",
                });
            }
        });
        const twelfth = await joinedFriend(t, code);
        const thirteenth = await joinedFriend(t, code);

        await onLastDay(t, twelfth);
        await logEntry(t, twelfth);
        await onLastDay(t, thirteenth);
        await logEntry(t, thirteenth);

        await expect(referralOf(t, twelfth)).resolves.toMatchObject({ status: "rewarded" });
        await expect(referralOf(t, thirteenth)).resolves.toMatchObject({ rewardedAt: null, status: "capped" });
        const rewardedAt = (await referralOf(t, twelfth))?.rewardedAt ?? 0;
        await expect(rewardsOf(t, inviter)).resolves.toMatchObject({ promoEndsAt: addMonthsUtc(rewardedAt, 1) });
    });
});

describe("an inviter who pays", () => {
    it("banks the month while the plan runs, through a renewal the mirror missed, and grants it once the plan ends", async () => {
        const t = harness();
        const { code, inviter } = await inviterWithCode(t);
        const planEnds = START + 10 * DAY_MS;
        rc.plans.set(inviter.userId, [
            { end: planEnds, product: "com.tryoutlayr.app.pro.monthly", store: "app_store" },
        ]);
        await authenticatedAs(t, inviter).action(api.revenuecat.syncFromStore, {});
        const friend = await joinedFriend(t, code);

        await onLastDay(t, friend);
        await logEntry(t, friend);

        await expect(referralOf(t, friend)).resolves.toMatchObject({ status: "rewarded" });
        await expect(rewardsOf(t, inviter)).resolves.toMatchObject({ bankedMonths: 1, promoEndsAt: null });
        expect(rc.grants.some(({ userId }) => userId === inviter.userId)).toBeFalsy();

        const renewedEnd = planEnds + 30 * DAY_MS;
        rc.plans.set(inviter.userId, [
            { end: renewedEnd, product: "com.tryoutlayr.app.pro.monthly", store: "app_store" },
        ]);
        vi.advanceTimersByTime(planEnds + DAY_MS - Date.now());
        await t.finishInProgressScheduledFunctions();

        await expect(rewardsOf(t, inviter)).resolves.toMatchObject({ bankedMonths: 1, promoEndsAt: null });
        expect(rc.grants.some(({ userId }) => userId === inviter.userId)).toBeFalsy();

        vi.advanceTimersByTime(renewedEnd + DAY_MS - Date.now());
        await t.finishInProgressScheduledFunctions();
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        const released = await rewardsOf(t, inviter);
        expect(released?.bankedMonths).toBe(0);
        expect(released?.promoEndsAt).toBeGreaterThan(renewedEnd);
        expect(rc.grants).toContainEqual({ endsAt: released?.promoEndsAt, userId: inviter.userId });
    });

    it("gives a lifetime owner nothing, since a month cannot extend it", async () => {
        const t = harness();
        const { code, inviter } = await inviterWithCode(t);
        rc.plans.set(inviter.userId, [{ end: null, product: "com.tryoutlayr.app.pro.lifetime", store: "app_store" }]);
        await authenticatedAs(t, inviter).action(api.revenuecat.syncFromStore, {});
        const friend = await joinedFriend(t, code);

        await onLastDay(t, friend);
        await logEntry(t, friend);

        await expect(referralOf(t, friend)).resolves.toMatchObject({ rewardedAt: null, status: "lifetime" });
        await expect(rewardsOf(t, inviter)).resolves.toBeNull();
    });
});

describe("granting through RevenueCat", () => {
    it("retries a refused grant later with the same end, so the month is not lost", async () => {
        const t = harness();
        const { code } = await inviterWithCode(t);
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
                new Request(input, init).method === "POST"
                    ? new Response("{}", { status: 503 })
                    : rc.respond(input, init)
            )
        );
        const friend = await joinedFriend(t, code);
        expect(rc.grants).toStrictEqual([]);

        vi.stubGlobal("fetch", vi.fn(rc.respond));
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        const claimedAt = (await referralOf(t, friend))?.claimedAt ?? 0;
        expect(rc.grants).toStrictEqual([{ endsAt: addMonthsUtc(claimedAt, 1), userId: friend.userId }]);
    });

    it("resends a grant the retries gave up on with the daily sweep, and never sends one twice", async () => {
        const t = harness();
        const { code } = await inviterWithCode(t);
        const outageEnds = new Map<string, number>();
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const request = new Request(input, init);
                const userId = decodeURIComponent(SUBSCRIBER_PATH.exec(new URL(request.url).pathname)?.[1] ?? "");
                return request.method === "POST" && Date.now() < (outageEnds.get(userId) ?? 0)
                    ? new Response("{}", { status: 503 })
                    : rc.respond(input, init);
            })
        );
        const recovers = await seedAuthUser(t);
        const stranded = await seedAuthUser(t);
        outageEnds.set(recovers.userId, START + 20 * HOUR);
        outageEnds.set(stranded.userId, Number.POSITIVE_INFINITY);
        await expect(redeem(t, recovers, code)).resolves.toBe("claimed");
        await expect(redeem(t, stranded, code)).resolves.toBe("claimed");
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        expect(rc.grants).toStrictEqual([]);

        for (const day of [1, 2]) {
            vi.setSystemTime(START + day * DAY_MS);
            await t.mutation(internal.referrals.sweepGrants, { cursor: null });
            await t.finishAllScheduledFunctions(vi.runAllTimers);
        }

        const claimedAt = (await referralOf(t, recovers))?.claimedAt ?? 0;
        expect(rc.grants).toStrictEqual([{ endsAt: addMonthsUtc(claimedAt, 1), userId: recovers.userId }]);
    });

    it("gives up on a grant whose answer stalls, so the retry can send it again", async () => {
        const t = harness();
        const { code } = await inviterWithCode(t);
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
                new Request(input, init).method === "POST"
                    ? new Response(new ReadableStream(), { status: 201 })
                    : rc.respond(input, init)
            )
        );
        const friend = await seedAuthUser(t);

        const claiming = redeem(t, friend, code);
        await vi.advanceTimersByTimeAsync(30_000);

        await expect(claiming).resolves.toBe("claimed");
    });

    it("leaves RevenueCat alone when no banked month is left, as after the account is deleted", async () => {
        const t = harness();
        const gone = await seedAuthUser(t);

        await t.action(internal.referrals.releaseBanked, { userId: gone.userId });

        expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    });

    it("holds a banked month until RevenueCat is set up, rather than spending it on a grant that cannot go out", async () => {
        vi.stubEnv("REVENUECAT_SECRET_KEY", "");
        const t = harness();
        const owner = await seedAuthUser(t);
        await t.run(async (ctx) => {
            await ctx.db.insert("referralRewards", { bankedMonths: 1, promoEndsAt: null, userId: owner.userId });
        });

        await t.action(internal.referrals.releaseBanked, { userId: owner.userId });

        await expect(rewardsOf(t, owner)).resolves.toMatchObject({ bankedMonths: 1, promoEndsAt: null });
    });

    it("keeps the friend's one invite when RevenueCat is not set up", async () => {
        vi.stubEnv("REVENUECAT_SECRET_KEY", "");
        const t = harness();
        const { code } = await inviterWithCode(t);
        const friend = await seedAuthUser(t);

        await expect(redeem(t, friend, code)).resolves.toBe("unavailable");
        await expect(referralOf(t, friend)).resolves.toBeNull();
    });
});
