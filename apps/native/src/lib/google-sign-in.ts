import * as Effect from "effect/Effect";
import { GoogleOneTapSignIn, isSuccessResponse } from "react-native-nitro-google-signin";

import { ENV } from "@/env";
import { duringHandoff } from "@/lib/app-handoff";

const webClientId = ENV.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

/** The backend verifies the id token against the web client id, so without one no server accepts the token. */
export const isGoogleSignInAvailable = Boolean(webClientId);

export const googleIdToken = Effect.fn("GoogleSignIn.idToken")(function* googleIdToken() {
    if (!webClientId) {
        return null;
    }

    yield* Effect.try(() =>
        GoogleOneTapSignIn.configure({
            iosClientId: ENV.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? null,
            webClientId,
        })
    );

    yield* Effect.tryPromise(() => GoogleOneTapSignIn.checkPlayServices());

    const response = yield* duringHandoff(Effect.tryPromise(() => GoogleOneTapSignIn.presentExplicitSignIn()));
    return isSuccessResponse(response) ? response.data.idToken : null;
});
