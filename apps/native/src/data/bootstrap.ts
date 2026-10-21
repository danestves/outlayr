import { getLocales } from "expo-localization";

import type { Database } from "@/db/client";
import { withTransaction } from "@/db/transaction";
import { seedFavourites, serialiseFavourites } from "@/domain/favourite-currencies";
import { DEFAULT_CURRENCY } from "@/domain/money";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { seedCategories } from "./categories-core";

// Awaited by `LocalDataProvider` before `ready`, so the first screen sees its categories. The locale seeds only the
// favourites: onboarding asks for the ledger's own currency.
export async function bootstrapLocalData(db: Database): Promise<void> {
    const done = await getMeta(db, META_KEYS.firstLaunch);
    if (done === "true") {
        return;
    }
    // Behind the guard, so a user who clears the cluster keeps it cleared.
    const favourites = seedFavourites(getLocales()[0]?.currencyCode ?? null);

    // Atomic: the `firstLaunch` marker is written last, and first launch is the most kill-prone moment.
    await withTransaction(db, async () => {
        await setMeta(db, META_KEYS.currency, DEFAULT_CURRENCY);
        await setMeta(db, META_KEYS.favouriteCurrencies, serialiseFavourites(favourites));
        await seedCategories(db);
        await setMeta(db, META_KEYS.firstLaunch, "true");
    });
}
