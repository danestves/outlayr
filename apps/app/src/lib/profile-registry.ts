import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useMemo } from "react";

import type { PulledPage } from "./ledger-sync";

const ProfileFields = Schema.Struct({
    customColor: Schema.NullOr(Schema.String),
    dateCreated: Schema.Number,
    emoji: Schema.NullOr(Schema.String),
    icon: Schema.NullOr(Schema.String),
    imageColor: Schema.NullOr(Schema.String),
    imageKey: Schema.NullOr(Schema.String),
    name: Schema.String,
    sortOrder: Schema.Number,
});

const ProfileRow = Schema.Struct({
    deletedAt: Schema.NullOr(Schema.Number),
    fields: ProfileFields,
    localId: Schema.String,
});

const decodeProfile = Schema.decodeUnknownOption(ProfileRow);

export interface LedgerProfile {
    color: string | null;
    customColor: string | null;
    dateCreated: number;
    emoji: string | null;
    icon: string | null;
    id: string;
    imageColor: string | null;
    imageKey: string | null;
    name: string;
    sortOrder: number;
}

export interface ProfileLook {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    imageKey: string | null;
}

export const profileLook = (profile: LedgerProfile): ProfileLook => ({
    color: profile.imageColor ?? profile.customColor,
    emoji: profile.emoji,
    icon: profile.icon,
    imageKey: profile.imageKey,
});

const byOrder = (left: LedgerProfile, right: LedgerProfile) =>
    left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);

export function profilesOf(page: PulledPage | null | undefined): LedgerProfile[] {
    if (!page) {
        return [];
    }
    return page.rows
        .filter((row) => row.table === "profiles" && row.deletedAt === null)
        .flatMap((row) =>
            Option.toArray(
                Option.map(decodeProfile(row), ({ fields, localId }) => ({
                    color: fields.imageColor ?? fields.customColor,
                    customColor: fields.customColor,
                    dateCreated: fields.dateCreated,
                    emoji: fields.emoji,
                    icon: fields.icon,
                    id: localId,
                    imageColor: fields.imageColor,
                    imageKey: fields.imageKey,
                    name: fields.name,
                    sortOrder: fields.sortOrder,
                }))
            )
        )
        .toSorted(byOrder);
}

export function activeProfileOf(profiles: readonly LedgerProfile[], candidate: string | null): LedgerProfile | null {
    if (candidate === null) {
        return null;
    }
    return profiles.find((profile) => profile.id === candidate) ?? null;
}

export const profilesQuery = convexQuery(api.sync.pullSince, { cursor: 0, limit: 1000, tables: ["profiles"] });

export function useLedgerProfiles(): LedgerProfile[] {
    const { data } = useQuery(profilesQuery);
    return useMemo(() => profilesOf(data), [data]);
}
