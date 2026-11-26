import type { api } from "@outlayr/backend/convex/_generated/api";
import { SITE_URL } from "@outlayr/shared/urls";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";

import { joinedProfilesQuery, profileMembersQuery, profileSharingEnabledQuery } from "./account-state";
import type { ProfileLook } from "./profile-registry";

export { normalizeReferralCode as normalizeInviteCode } from "@outlayr/money/contract";

export const PROFILE_SEAT_LIMIT = 5;

export type JoinedProfile = FunctionReturnType<typeof api.profileSharing.joined>[number];

export type ProfileMembersView = NonNullable<FunctionReturnType<typeof api.profileSharing.members>>;

export type ProfileMember = ProfileMembersView["members"][number];

export type ClaimResult = FunctionReturnType<typeof api.profileSharing.claim>;

export type ClaimStatus = ClaimResult["status"];

export const profileInviteLink = (code: string) => `${SITE_URL}/join/${code.toLowerCase()}`;

interface SharedLook {
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
    imageKey: string | null;
}

const lookOf = (look: SharedLook): ProfileLook => ({
    color: look.imageColor ?? look.customColor,
    emoji: look.emoji,
    icon: look.icon,
    imageKey: look.imageKey,
});

export const inviteLook = (look: SharedLook | null): ProfileLook | null => (look === null ? null : lookOf(look));

export const joinedLook = (profile: JoinedProfile): ProfileLook => lookOf(profile.look);

export const joinedProfileOf = (profiles: readonly JoinedProfile[], profileId: string | null) =>
    profileId === null ? null : (profiles.find((profile) => profile.profileId === profileId) ?? null);

export const ownerOf = (members: ProfileMembersView | null | undefined) =>
    members?.members.find((member) => member.owner) ?? null;

export const seatCountOf = (members: ProfileMembersView | null | undefined) =>
    members?.members.filter((member) => !member.owner).length ?? 0;

export function useProfileSharingEnabled(): boolean {
    return useQuery(profileSharingEnabledQuery).data === true;
}

export function useJoinedProfiles(): readonly JoinedProfile[] {
    return useQuery(joinedProfilesQuery).data ?? [];
}

export function useProfileMembers(profileId: string | null): ProfileMembersView | null | undefined {
    const { data } = useQuery(profileMembersQuery(profileId));
    return profileId === null ? null : data;
}
