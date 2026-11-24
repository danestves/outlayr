import { and, eq, inArray, isNull, max } from "drizzle-orm";
import * as DateTime from "effect/DateTime";
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
                yield* Meta.set(to, "profileMadeHere", true);
            }
        }),
        (cause) => new ProfilesError({ cause, operation: "seed" })
    );
});

export const insertProfile = Effect.fn("Profiles.insert")(function* insertProfile(
    registry: Database,
    input: ProfileIdentity & { id: string; name: string }
) {
    const now = yield* DateTime.nowAsDate;
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
    const [existing] = yield* query("update", () =>
        registry
            .select({ imageUri: profiles.imageUri })
            .from(profiles)
            .where(and(eq(profiles.id, id), isNull(profiles.deletedAt)))
            .limit(1)
    );
    // A photo this device never fetched also has a null path, so only a picked emoji or icon proves it was replaced.
    const replacesPhoto = patch.emoji !== null || patch.icon !== null;
    const removesPhoto = existing != null && patch.imageUri === null && (existing.imageUri !== null || replacesPhoto);
    yield* query("update", () =>
        registry
            .update(profiles)
            .set({ ...patch, imageKey: removesPhoto ? null : undefined, updatedAt: new Date() })
            .where(and(eq(profiles.id, id), isNull(profiles.deletedAt)))
    );
});

/** A switch settles first, and settling can let sync tombstone the profile it was about to open. */
export const profileIsLive = Effect.fn("Profiles.isLive")(function* profileIsLive(
    registry: Database,
    id: string,
    operation: typeof ProfilesOperation.Type = "switch"
) {
    const [row] = yield* query(operation, () =>
        registry
            .select({ id: profiles.id })
            .from(profiles)
            .where(and(eq(profiles.id, id), isNull(profiles.deletedAt)))
            .limit(1)
    );
    return row != null;
});

/** A create retried after a failed switch reuses its id, so the second attempt lands on the first row. */
export const createOrUpdateProfile = Effect.fn("Profiles.createOrUpdate")(function* createOrUpdateProfile(
    registry: Database,
    input: ProfileIdentity & { id: string; name: string }
) {
    const { id, ...patch } = input;
    if (yield* profileIsLive(registry, id, "create")) {
        yield* updateProfile(registry, id, patch);
        return;
    }
    yield* insertProfile(registry, input);
});

export const tombstoneProfile = Effect.fn("Profiles.tombstone")(function* tombstoneProfile(
    registry: Database,
    id: string
) {
    const now = yield* DateTime.nowAsDate;
    yield* query("delete", () =>
        registry.update(profiles).set({ deletedAt: now, updatedAt: now }).where(eq(profiles.id, id))
    );
});
