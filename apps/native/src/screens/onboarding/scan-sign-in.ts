import { useAiGate } from "@/hooks/use-ai-gate";
import type { authClient } from "@/lib/auth-client";
import { useProviderSignIn } from "@/lib/use-provider-sign-in";

export type AuthClient = NonNullable<typeof authClient>;

// Module state, not React state: signing in remounts the app under the new account and drops the screen's state.
let scanAfterSignIn = false;

export const holdScanForSignIn = (held: boolean) => {
    scanAfterSignIn = held;
};

export const scanHeldForSignIn = () => scanAfterSignIn;

export function useScanSignIn(client: AuthClient) {
    return { restoring: useAiGate() === "restoring", signIn: useProviderSignIn(client) };
}
