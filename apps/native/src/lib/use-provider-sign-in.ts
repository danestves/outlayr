import * as Cause from "effect/Cause";
import type * as Effect from "effect/Effect";
import { useState } from "react";

import { isSignInCancellation, signInFailureDetail, signInFailureMessage } from "@/domain/account";
import { useTranslation } from "@/i18n/context";
import type { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { ProviderSignInError } from "@/lib/provider-sign-in";
import type { SignInProvider, SignInRequest } from "@/lib/provider-sign-in";
import { SILENT } from "@/state/atom-command";
import { providerSignInCommand } from "@/state/cloud-commands";
import { useAtomAction } from "@/state/use-atom-action";

type AuthClient = NonNullable<typeof authClient>;

export interface ProviderSignIn {
    busy: SignInProvider | null;
    error: string | null;
    start: (request: SignInRequest) => void;
}

interface ProviderSignInOptions {
    onAppleFailure?: () => Effect.Effect<void, unknown>;
}

export function useProviderSignIn(client: AuthClient, options: ProviderSignInOptions = {}): ProviderSignIn {
    const t = useTranslation();
    const activation = useAuthSession();
    const [busy, setBusy] = useState<SignInProvider | null>(null);
    const [error, setError] = useState<string | null>(null);
    const signIn = useAtomAction(
        providerSignInCommand,
        {
            onFailure: (failed) => {
                const failure = Cause.squash(failed);
                const cause = failure instanceof ProviderSignInError ? failure.cause : failure;
                if (!isSignInCancellation(cause)) {
                    console.warn("[outlayr] sign-in failed", signInFailureDetail(cause));
                    setError(signInFailureMessage(cause, t));
                }
            },
            onSettled: () => setBusy(null),
        },
        SILENT
    );

    const start = (request: SignInRequest) => {
        setError(null);
        setBusy(request.provider);
        signIn({ activation, client, onAppleFailure: options.onAppleFailure, request });
    };

    return { busy, error, start };
}
