import { router } from "expo-router";
import { Platform, View } from "react-native";

import { AppleSignInButton } from "@/components/account/apple-sign-in-button";
import { EmailSignInButton } from "@/components/account/email-sign-in-button";
import { GoogleSignInButton } from "@/components/account/google-sign-in-button";
import { appleCredential } from "@/lib/apple-sign-in";
import { googleIdToken, isGoogleSignInAvailable } from "@/lib/google-sign-in";
import type { SignInProvider } from "@/lib/provider-sign-in";
import type { ProviderSignIn } from "@/lib/use-provider-sign-in";

/** Each root stack group declares its own copy of the email flow, so the caller names the one it can reach. */
export type EmailSignInRoute = "/auth/email" | "/settings/email";

export function ProviderSignInButtons({
    busy,
    emailRoute,
    start,
}: {
    busy: SignInProvider | null;
    emailRoute: EmailSignInRoute;
    start: ProviderSignIn["start"];
}) {
    return (
        <View className="gap-3">
            {Platform.OS === "ios" ? (
                <AppleSignInButton
                    disabled={busy !== null}
                    onPress={() => start({ getCredential: appleCredential, provider: "apple" })}
                    pending={busy === "apple"}
                />
            ) : null}
            {isGoogleSignInAvailable ? (
                <GoogleSignInButton
                    disabled={busy !== null}
                    onPress={() => start({ getCredential: googleIdToken, provider: "google" })}
                    pending={busy === "google"}
                />
            ) : null}
            <EmailSignInButton disabled={busy !== null} onPress={() => router.push(emailRoute)} />
        </View>
    );
}
