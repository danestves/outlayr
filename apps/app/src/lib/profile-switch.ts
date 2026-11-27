import { forgetProfileCookie, switchProfileCookie } from "./profile-cookie";
import { forgetProfileUnsent, stopUnsentWrites } from "./unsent";

export async function switchToProfile(profileId: string | null, to?: string) {
    await switchProfileCookie({ data: { profileId } });
    if (to === undefined) {
        window.location.reload();
        return;
    }
    window.location.assign(to);
}

let removing = false;

export async function removeProfileAndSwitch(profileId: string) {
    if (removing) {
        return;
    }
    removing = true;
    stopUnsentWrites();
    forgetProfileUnsent(profileId);
    await forgetProfileCookie({ data: { profileId } }).catch(() => undefined);
    window.location.reload();
}
