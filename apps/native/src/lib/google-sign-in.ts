import { GoogleOneTapSignIn, isSuccessResponse } from "react-native-nitro-google-signin";

import { ENV } from "@/env";
import { duringHandoff } from "@/lib/app-handoff";

const webClientId = ENV.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

/** The backend verifies the id token against the web client id, so without one no server accepts the token. */
export const isGoogleSignInAvailable = Boolean(webClientId);

export async function googleIdToken(): Promise<string | null> {
    if (!webClientId) {
        return null;
    }

    GoogleOneTapSignIn.configure({
        iosClientId: ENV.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? null,
        webClientId,
    });

    await GoogleOneTapSignIn.checkPlayServices();

    const response = await duringHandoff(() => GoogleOneTapSignIn.presentExplicitSignIn());
    return isSuccessResponse(response) ? response.data.idToken : null;
}
