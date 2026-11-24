import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { useAuthSession } from "@/lib/auth-session";
import { useCloudAuthenticated } from "@/lib/convex";
import type { ProfileMembersView } from "@/lib/profile-sharing";
import { profileMembersAtom, profileSharingEnabledAtom } from "@/lib/profile-sharing";

/** Undefined while the answer is unknown, false when the read failed or the viewer is signed out. */
export function useProfileSharingFlag(): boolean | undefined {
    const { accountId } = useAuthSession();
    const result = useAtomValue(profileSharingEnabledAtom(accountId ?? ""));
    if (accountId === null) {
        return undefined;
    }
    return AsyncResult.isSuccess(result) ? result.value : undefined;
}

/** False while the answer is unknown and on any error, so nothing new shows until the server says so. */
export function useProfileSharingEnabled(): boolean {
    return useProfileSharingFlag() === true;
}

/** Null skips the read. Undefined while it loads, null when it failed or the caller is not in the profile. */
export function useProfileMembers(profileId: string | null): ProfileMembersView | null | undefined {
    const authenticated = useCloudAuthenticated();
    const members = useAtomValue(profileMembersAtom({ authenticated, profileId: profileId ?? "" }));
    if (profileId === null) {
        return null;
    }
    return members;
}
