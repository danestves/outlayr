import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { PROFILE_COOKIE, parseProfileId } from "./profile";

const A_YEAR_S = 60 * 60 * 24 * 365;

export const switchProfileCookie = createServerFn({ method: "POST" })
    .validator((input: { profileId: string | null }) => input)
    .handler(({ data }) => {
        const profileId = parseProfileId(data.profileId);
        if (profileId === null) {
            deleteCookie(PROFILE_COOKIE, { path: "/" });
            return null;
        }
        setCookie(PROFILE_COOKIE, profileId, {
            httpOnly: true,
            maxAge: A_YEAR_S,
            path: "/",
            sameSite: "lax",
            secure: import.meta.env.PROD,
        });
        return profileId;
    });

export const forgetProfileCookie = createServerFn({ method: "POST" })
    .validator((input: { profileId: string }) => input)
    .handler(({ data }) => {
        if (parseProfileId(getCookie(PROFILE_COOKIE)) === parseProfileId(data.profileId)) {
            deleteCookie(PROFILE_COOKIE, { path: "/" });
        }
    });
