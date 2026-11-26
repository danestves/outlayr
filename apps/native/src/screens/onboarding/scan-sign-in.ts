import { useAiGate } from "@/hooks/use-ai-gate";
import type { authClient } from "@/lib/auth-client";
import { useProviderSignIn } from "@/lib/use-provider-sign-in";

export type AuthClient = NonNullable<typeof authClient>;

export function useScanSignIn(client: AuthClient) {
    return { restoring: useAiGate() === "restoring", signIn: useProviderSignIn(client) };
}
