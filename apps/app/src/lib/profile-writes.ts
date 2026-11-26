import type { PushRow } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";

import { categoryPush, seededCategories } from "./category-writes";
import { convexClient } from "./convex";
import { webDeviceId } from "./ledger-write";
import type { LedgerProfile } from "./profile-registry";

export interface ProfileIdentity {
    color: string | null;
    emoji: string | null;
    icon: string | null;
}

type ProfileRow = Extract<PushRow, { table: "profiles" }>;

const pushProfileRow = async (row: ProfileRow) => {
    await convexClient().mutation(api.sync.push, { deviceId: webDeviceId(), rows: [row] });
};

const settingsRows = (settings: Readonly<Record<string, string>>, updatedAt: number): PushRow[] =>
    Object.entries(settings).map(([localId, value]) => ({
        deletedAt: null,
        fields: { value },
        localId,
        table: "appMeta",
        updatedAt,
    }));

const pushProfileRows = async (profileId: string, rows: PushRow[]) => {
    await convexClient().mutation(api.sync.push, { deviceId: webDeviceId(), profileId, rows });
};

const fieldsOf = (
    profile: Pick<
        LedgerProfile,
        "customColor" | "dateCreated" | "emoji" | "icon" | "imageColor" | "imageKey" | "name" | "sortOrder"
    >
) => ({
    customColor: profile.customColor,
    dateCreated: profile.dateCreated,
    emoji: profile.emoji,
    icon: profile.icon,
    imageColor: profile.imageColor,
    imageKey: profile.imageKey,
    name: profile.name,
    sortOrder: profile.sortOrder,
});

export async function createProfile(
    profiles: readonly LedgerProfile[],
    input: {
        categoryLabel: (preset: string) => string;
        currency: string;
        identity: ProfileIdentity;
        name: string;
    }
) {
    const now = Date.now();
    const id = crypto.randomUUID();
    const sortOrder = Math.max(-1, ...profiles.map((profile) => profile.sortOrder)) + 1;
    await pushProfileRows(id, [
        ...settingsRows({ currency: input.currency, currencyChosen: "true" }, now),
        ...seededCategories(input.categoryLabel, now).map((row) => categoryPush(row)),
    ]);
    await pushProfileRow({
        deletedAt: null,
        fields: {
            customColor: input.identity.color,
            dateCreated: now,
            emoji: input.identity.emoji,
            icon: input.identity.icon,
            imageColor: null,
            imageKey: null,
            name: input.name,
            sortOrder,
        },
        localId: id,
        restoredAt: null,
        table: "profiles",
        updatedAt: now,
    });
    return id;
}

const keepsPhoto = (identity: ProfileIdentity) => identity.emoji === null && identity.icon === null;

export async function saveProfile(profile: LedgerProfile, input: { identity: ProfileIdentity; name: string }) {
    const now = Date.now();
    const keepPhoto = keepsPhoto(input.identity);
    await pushProfileRow({
        deletedAt: null,
        fields: {
            ...fieldsOf(profile),
            customColor: input.identity.color,
            emoji: input.identity.emoji,
            icon: input.identity.icon,
            imageColor: keepPhoto ? profile.imageColor : null,
            imageKey: keepPhoto ? profile.imageKey : null,
            name: input.name,
        },
        localId: profile.id,
        restoredAt: null,
        table: "profiles",
        updatedAt: now,
    });
}

export async function deleteProfile(profile: LedgerProfile) {
    const now = Date.now();
    await pushProfileRow({
        deletedAt: now,
        fields: fieldsOf(profile),
        localId: profile.id,
        restoredAt: null,
        table: "profiles",
        updatedAt: now,
    });
}
