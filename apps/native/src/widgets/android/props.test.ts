import { describe, expect, it } from "@jest/globals";
import * as Effect from "effect/Effect";

import { accounts } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { buildAndroidWidgetProps } from "./props";

const JUNE_1 = new Date("2026-06-01T12:00:00.000Z");

describe("buildAndroidWidgetProps", () => {
    it("counts only asset accounts in the balance, leaving cards and people out", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const account = (id: string, kind: string, initialBalance: number) => ({
            currency: "USD",
            dateCreated: JUNE_1,
            id,
            initialBalance,
            initialBalanceDate: JUNE_1,
            kind,
            name: id,
            updatedAt: JUNE_1,
        });
        await db
            .insert(accounts)
            .values([
                account("checking", "asset", 1200),
                account("savings", "asset", 40.5),
                account("card", "liability", -300),
                account("friend", "person", 75),
            ]);

        const props = await Effect.runPromise(buildAndroidWidgetProps(db, new Date("2026-06-02T12:00:00.000Z")));

        expect(props.Wallet.balance).toBe("$1,240.50");
        expect(props.Overview.balance).toBe("$1,240.50");
    });
});
