import * as Effect from "effect/Effect";
import { expect, test, vi } from "vite-plus/test";

import { accounts } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

vi.mock("@react-native-async-storage/async-storage", async () => {
    vi.stubGlobal("jest", vi);
    return import("@react-native-async-storage/async-storage/jest/async-storage-mock");
});
vi.mock("expo-core-spotlight", () => ({ __esModule: true, default: {} }));

import { resolveReminderTap } from "./notification-taps";

test("a missed Apple Pay tap opens a new entry on the card's account and currency, at the tap's time", async () => {
    const db = migratedDatabase();
    const opened = new Date(0);
    await db.insert(accounts).values({
        currency: "EUR",
        dateCreated: opened,
        id: "chase",
        initialBalance: 0,
        initialBalanceDate: opened,
        name: "Chase",
        updatedAt: opened,
    });

    const target = await Effect.runPromise(
        resolveReminderTap(db, { card: "Chase Sapphire", date: "1760500000000", note: "Blue Bottle", open: "create" })
    );

    expect(target).toStrictEqual({
        params: { accountId: "chase", currency: "EUR", date: "1760500000000", note: "Blue Bottle" },
        pathname: "/transactions/create",
    });
});
