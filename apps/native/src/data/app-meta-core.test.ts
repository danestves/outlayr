import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { outbox } from "@/db/schema";
import { migratedDatabase, storedMetaText, storeMetaText, transactionalDatabase } from "@/db/test-database";
import { transaction } from "@/db/transaction";

import { CorruptMetaError, Meta } from "./app-meta-core";
import { META_NAMES } from "./app-meta-registry";
import type { MetaName } from "./app-meta-registry";

const BOOL = ["true", "false"];
const BIT = ["1", "0"];
const FILE_IMPORT = [JSON.stringify({ categoryIds: ["c1"], importedAt: 1_762_650_000_000, transactionIds: ["t1"] })];
const STAMPED = [JSON.stringify({ "tx-1": 1_762_650_000_000 }), "{}"];

const STORED_TODAY = {
    accentColor: ["4"],
    accountDeferred: BOOL,
    accountsByHand: BOOL,
    aiConsentPlanScan: BOOL,
    aiConsentV2: BOOL,
    aiEnrichment: BOOL,
    animatedCharts: BOOL,
    autologAccess: ["free", "open", "pending"],
    autologUsage: [JSON.stringify({ "2026-11": { held: true, used: 30 } }), "{}"],
    autologWaiting: [
        JSON.stringify([
            {
                amount: 6.4,
                amountText: "$6.40",
                card: "Visa",
                category: null,
                categoryId: null,
                currency: "USD",
                date: 1_762_650_000_000,
                dedupeKey: "wallet:expense:blue bottle:640",
                id: "a",
                income: false,
                note: "Blue Bottle",
                text: null,
            },
            { amount: 5, category: "Coffee", date: 1, id: "b", income: false, note: "" },
        ]),
        "[]",
    ],
    balancesView: ["1"],
    biometricLock: BOOL,
    budgetViewStyle: BOOL,
    categoryLanguage: ["es-MX"],
    categorySuggestions: BOOL,
    colorScheme: ["2"],
    confetti: BOOL,
    csvImport: FILE_IMPORT,
    currency: ["EUR"],
    currencyChosen: ["true"],
    enrichmentOutbox: [JSON.stringify(["tx-1", "tx-2"]), "[]"],
    favouriteCurrencies: ["EUR,GBP", ""],
    firstDayOfMonth: ["15"],
    firstEntryOfferShown: ["true"],
    firstLaunch: ["true"],
    firstWeekday: ["7"],
    groundedLookup: BOOL,
    haptics: ["0"],
    hideAmounts: BOOL,
    incomeTracking: BOOL,
    insightsMeasure: ["0"],
    insightsTimeFrame: ["3"],
    installmentReminders: BOOL,
    lastRatesPullAt: ["1762650000000"],
    lastTransactionAccount: ["acc-1"],
    lastTransferFeeCategory: ["cat-1"],
    lastWalletEntry: [
        JSON.stringify({ at: 1_762_650_000_000, push: true, txId: "tx-1" }),
        JSON.stringify({ at: 1_762_650_000_000, txId: "tx-1" }),
    ],
    ledgerAdoption: ["user|abc"],
    logInsightsTimeFrame: ["2"],
    logInsightsType: ["1"],
    logViewLineGraph: BOOL,
    logoBackfillRetries: STAMPED,
    logoCandidates: STAMPED,
    logoDismissals: [JSON.stringify(["tx-1"])],
    logoPlates: ["1"],
    merchantBook: [
        JSON.stringify({
            "blue bottle": {
                answer: {
                    categoryName: "Coffee",
                    domain: "bluebottlecoffee.com",
                    emoji: null,
                    isNewCategory: false,
                    parentCategoryName: null,
                    tags: ["cafe"],
                },
                expiresAt: 1_762_650_000_000,
            },
        }),
    ],
    moneyManagerImport: [
        JSON.stringify({
            accountIds: ["a1"],
            accountKeys: { Cash: "a1" },
            adjustedAccountIds: [],
            budgetIds: [],
            categoryIds: ["c1"],
            expectedBalances: { a1: 12.5 },
            importedAt: 1_762_650_000_000,
            renamedCategories: [{ id: "c1", imported: "Food", previous: "Groceries" }],
            transactionIds: ["t1"],
            transferIds: ["x1"],
        }),
        JSON.stringify({
            accountIds: [],
            accountKeys: {},
            adjustedAccountIds: [],
            budgetIds: [],
            categoryIds: [],
            expectedBalances: {},
            importedAt: 1,
            transactionIds: [],
            transferIds: [],
        }),
    ],
    notificationHour: ["20"],
    notificationMinute: ["30"],
    notificationOption: ["2"],
    notificationTexts: [
        JSON.stringify([
            { amountText: "$6.40", at: 1_762_650_000_000, text: "You spent $6.40 at Blue Bottle" },
            { amountText: null, at: 1, text: "Your statement is ready" },
        ]),
    ],
    numberEntryType: ["1"],
    onboardingComplete: ["true"],
    onboardingGateMigrated: ["true"],
    pdfImport: FILE_IMPORT,
    pendingWriteLedger: [
        JSON.stringify([
            { at: 1, id: "a", key: null, txId: "tx-1" },
            { at: 2, date: 3, id: "b", key: "notification:expense:spotify", source: "push", txId: "tx-2" },
        ]),
    ],
    privacyNoticeSeen: ["3"],
    recurrenceRepaired: ["true"],
    referralRewardSeen: ["1762650000000"],
    reminderAsked: ["true"],
    reminderChosen: BOOL,
    repricedSubscriptions: [JSON.stringify([{ currency: "USD", from: 9.99, note: "Spotify", to: 11.99 }]), "[]"],
    reviewPending: BIT,
    sentenceCoachSeen: BOOL,
    shareAnalytics: BOOL,
    showCents: BOOL,
    showNotifications: BOOL,
    showUpcoming: BOOL,
    showUpcomingSoon: BOOL,
    subscriptionReminders: BOOL,
    swapTimeLabel: BOOL,
    syncAccountSubject: ["user|abc"],
    syncCursor: ["0", "48211"],
    syncDeviceId: ["3f0c1a52-7c1e-4a55-9d0c-2f6f0b7f6a11"],
    syncEnabled: BIT,
    syncReread: ["installmentPlans,installments,outsidePayments,transfers"],
    syncRestoresReread: ["1"],
    syncedAt: ["1762650000000"],
    termsNoticeSeen: ["2"],
    timeZone: ["America/Caracas"],
    timeZoneMirrored: ["America/Caracas"],
    use24HourClock: BOOL,
    walletCards: [
        JSON.stringify([
            { lastAt: 1, text: "Visa" },
            { accountId: "acc-1", lastAt: 2, text: "Work card", waiting: ["a"] },
            { accountId: null, lastAt: 3, text: "Amex" },
        ]),
    ],
    walletLastRunAt: ["1762650000000", "1762650000.123"],
    walletShortcutAdded: ["1"],
    yearSheetSeen: ["2026"],
} satisfies Record<MetaName, readonly string[]>;

const queued = (db: ReturnType<typeof migratedDatabase>) => db.select({ key: outbox.localId }).from(outbox).all();

describe("a value the current build stored", () => {
    it("still passes its key's schema, for every key", () => {
        const rejected = META_NAMES.filter((name) => STORED_TODAY[name].some((text) => !Meta.check(name, text)));

        expect(rejected).toStrictEqual([]);
    });
});

describe("a corrupt value", () => {
    it("fails the read once with the key and not the value, then reads the default", async () => {
        const db = migratedDatabase();
        storeMetaText(db, "firstDayOfMonth", "the first");

        const error = await Effect.runPromise(Effect.flip(Meta.get(db, "firstDayOfMonth")));

        expect(error).toBeInstanceOf(CorruptMetaError);
        expect(`${error.message} ${JSON.stringify(error)}`).toContain("firstDayOfMonth");
        expect(`${error.message} ${JSON.stringify(error)}`).not.toContain("the first");
        await expect(Effect.runPromise(Meta.get(db, "firstDayOfMonth"))).resolves.toBe(1);
    });

    it("stays healed when the read fails the transaction around it", async () => {
        const db = transactionalDatabase();
        storeMetaText(db, "syncCursor", "soon");

        const write = transaction(
            db,
            Effect.gen(function* body() {
                yield* Meta.set(db, "categoryLanguage", "es-MX");
                yield* Meta.get(db, "syncCursor");
            }),
            (cause) => new Error("transaction failed", { cause })
        );

        await expect(Effect.runPromise(Effect.flip(write))).resolves.toBeInstanceOf(CorruptMetaError);
        expect(storedMetaText(db, "categoryLanguage")).toBeNull();
        await expect(Effect.runPromise(Meta.get(db, "syncCursor"))).resolves.toBe(0);
    });

    it("heals a synced key without queueing the reset for the account", async () => {
        const db = migratedDatabase();
        await Effect.runPromise(Meta.set(db, "syncEnabled", true));
        storeMetaText(db, "showCents", "maybe");
        expect(queued(db)).toStrictEqual([{ key: "showCents" }]);

        await Effect.runPromise(Effect.flip(Meta.get(db, "showCents")));

        expect(queued(db)).toStrictEqual([]);
        await expect(Effect.runPromise(Meta.get(db, "showCents"))).resolves.toBe(true);
        expect(queued(db)).toStrictEqual([]);
    });

    it("costs a list only the elements that do not decode", async () => {
        const db = migratedDatabase();
        const visa = { lastAt: 1, text: "Visa" };
        const amex = { accountId: "acc-1", lastAt: 2, text: "Amex" };
        storeMetaText(db, "walletCards", JSON.stringify([visa, { text: 7 }, "junk", amex]));

        await expect(Effect.runPromise(Meta.get(db, "walletCards"))).resolves.toStrictEqual([visa, amex]);
        expect(JSON.parse(storedMetaText(db, "walletCards") ?? "null")).toStrictEqual([visa, amex]);
    });

    it("shows a render the default instead of throwing", () => {
        expect(Meta.decode("haptics", "loud")).toBe(1);
        expect(Meta.decode("walletCards", "{")).toStrictEqual([]);
    });
});
