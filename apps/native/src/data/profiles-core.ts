import { and, eq, inArray, isNull, max } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { appMeta, profiles } from "@/db/schema";
import { transaction } from "@/db/transaction";

import { Meta } from "./app-meta-core";
import { META, SETTING_NAMES } from "./app-meta-registry";
import type { MetaName } from "./app-meta-registry";

export type Profile = typeof profiles.$inferSelect;

export interface ProfileIdentity {
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
    imageUri: string | null;
}

// `currency` is set from the pick, and `walletCards` names Personal's accounts.
export const CARRIED_META_KEYS: readonly MetaName[] = [
    ...SETTING_NAMES.filter((name) => name !== "currency" && name !== "walletCards"),
    "accountDeferred",
    "favouriteCurrencies",
    "onboardingComplete",
    "onboardingGateMigrated",
    "reminderAsked",
    "reminderChosen",
    "timeZone",
];

const DEVICE_META_KEYS = CARRIED_META_KEYS.filter((name) => META[name].scope === "device");

const ProfilesOperation = Schema.Literals(["create", "seed", "update", "delete", "switch"]);

export class ProfilesError extends Schema.TaggedError<ProfilesError>()("ProfilesError", {
    cause: Schema.Defect(),
    operation: ProfilesOperation,
}) {
    override get message(): string {
        return `Profile ${this.operation} failed`;
    }
}

const query = <A>(operation: typeof ProfilesOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new ProfilesError({ cause, operation }), try: run });

export const seedProfileLedger = Effect.fn("Profiles.seedLedger")(function* seedProfileLedger(
    from: Database,
    to: Database,
    currency: string | undefined
) {
    const keys = currency === undefined ? DEVICE_META_KEYS : CARRIED_META_KEYS;
    const carried = yield* query("seed", () =>
        from
            .select()
            .from(appMeta)
            .where(inArray(appMeta.key, [...keys]))
    );
    yield* transaction(
        to,
        Effect.gen(function* write() {
            for (const { key, value } of carried) {
                if (value !== null) {
                    yield* query("seed", () =>
                        to
                            .insert(appMeta)
                            .values({ key, value })
                            .onConflictDoUpdate({ set: { value }, target: appMeta.key })
                    );
                }
            }
            if (currency !== undefined) {
                yield* Meta.set(to, "currency", currency);
                yield* Meta.set(to, "currencyChosen", true);
            }
        }),
        (cause) => new ProfilesError({ cause, operation: "seed" })
    );
});

export const insertProfile = Effect.fn("Profiles.insert")(function* insertProfile(
    registry: Database,
    input: ProfileIdentity & { id: string; name: string }
) {
    const now = new Date();
    const [row] = yield* query("create", () =>
        registry
            .select({ highest: max(profiles.sortOrder) })
            .from(profiles)
            .where(isNull(profiles.deletedAt))
    );
    yield* query("create", () =>
        registry.insert(profiles).values({
            ...input,
            dateCreated: now,
            deletedAt: null,
            imageKey: null,
            sortOrder: (row?.highest ?? -1) + 1,
            updatedAt: now,
        })
    );
});

export const updateProfile = Effect.fn("Profiles.update")(function* updateProfile(
    registry: Database,
    id: string,
    patch: ProfileIdentity & { name: string }
) {
    yield* query("update", () =>
        registry
            .update(profiles)
            .set({ ...patch, updatedAt: new Date() })
            .where(and(eq(profiles.id, id), isNull(profiles.deletedAt)))
    );
});

export const tombstoneProfile = Effect.fn("Profiles.tombstone")(function* tombstoneProfile(
    registry: Database,
    id: string
) {
    const now = new Date();
    yield* query("delete", () =>
        registry.update(profiles).set({ deletedAt: now, updatedAt: now }).where(eq(profiles.id, id))
    );
});
