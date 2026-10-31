import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { getLocales } from "expo-localization";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";
import { seedFavourites, serialiseFavourites } from "@/domain/favourite-currencies";
import { DEFAULT_CURRENCY } from "@/domain/money";
import { resolveLanguage } from "@/i18n/languages";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { seedCategories } from "./categories-core";
import { setNumberSetting } from "./settings-core";

const BootstrapOperation = Schema.Literals(["locale", "seed"]);

export class BootstrapError extends Schema.TaggedError<BootstrapError>()("BootstrapError", {
    cause: Schema.Defect(),
    operation: BootstrapOperation,
}) {
    override get message(): string {
        return `Bootstrap ${this.operation} failed`;
    }
}

// Run by `LocalDatabase.open` before `ready`, so the first screen sees its categories.
export const bootstrapLocalData = Effect.fn("Bootstrap.bootstrapLocalData")(function* bootstrapLocalData(db: Database) {
    const done = yield* getMeta(db, META_KEYS.firstLaunch);
    if (done === "true") {
        return;
    }
    // Behind the guard, so a user who clears the cluster keeps it cleared.
    const locale = yield* Effect.try({
        catch: (cause) => new BootstrapError({ cause, operation: "locale" }),
        try: () => getLocales()[0] ?? null,
    });
    const favourites = seedFavourites(locale?.currencyCode ?? null);

    // Atomic: the `firstLaunch` marker is written last, and first launch is the most kill-prone moment.
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* setMeta(db, META_KEYS.currency, DEFAULT_CURRENCY);
            yield* setMeta(db, META_KEYS.favouriteCurrencies, serialiseFavourites(favourites));
            yield* seedCategories(db, resolveLanguage(locale?.languageTag));
            const installedAt = yield* Clock.currentTimeMillis;
            yield* setNumberSetting(db, "privacyNoticeSeen", installedAt);
            yield* setNumberSetting(db, "termsNoticeSeen", installedAt);
            yield* setMeta(db, META_KEYS.firstLaunch, "true");
        }),
        (cause) => new BootstrapError({ cause, operation: "seed" })
    );
});
