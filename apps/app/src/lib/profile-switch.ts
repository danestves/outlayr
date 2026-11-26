import { forgetProfileCookie, switchProfileCookie } from "./profile-cookie";
import { forgetProfileUnsent } from "./unsent";

export async function switchToProfile(profileId: string | null) {
    await switchProfileCookie({ data: { profileId } });
    window.location.reload();
}

export async function removeProfileAndSwitch(profileId: string) {
    await forgetProfileCookie({ data: { profileId } }).catch(() => undefined);
    forgetProfileUnsent(profileId);
    window.location.reload();
}
