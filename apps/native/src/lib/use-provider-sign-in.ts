import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useState } from "react";

import { isSignInCancellation, signInFailureDetail, signInFailureMessage } from "@/domain/account";
import { useTranslation } from "@/i18n/context";
import type { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { ProviderSignInError } from "@/lib/provider-sign-in";
import type { SignInProvider, SignInRequest } from "@/lib/provider-sign-in";
import { SILENT } from "@/state/atom-command";
import { providerSignInCommand } from "@/state/cloud-commands";
import { useAtomCommand } from "@/state/use-atom-command";

type AuthClient = NonNullable<typeof authClient>;

export interface ProviderSignIn {
    busy: SignInProvider | null;
    error: string | null;
    start: (request: SignInRequest) => void;
}

interface ProviderSignInOptions {
    onAppleFailure?: () => Promise<void>;
}

export function useProviderSignIn(client: AuthClient, options: ProviderSignInOptions = {}): ProviderSignIn {
    const t = useTranslation();
    const activation = useAuthSession();
    const signIn = useAtomCommand(providerSignInCommand, SILENT);
    const [busy, setBusy] = useState<SignInProvider | null>(null);
    const [error, setError] = useState<string | null>(null);

    const start = (request: SignInRequest) => {
        setError(null);
        setBusy(request.provider);
        signIn({ activation, client, onAppleFailure: options.onAppleFailure, request })
            .then((result) => {
                if (!AsyncResult.isFailure(result)) {
                    return;
                }
                const failure = Cause.squash(result.cause);
                const cause = failure instanceof ProviderSignInError ? failure.cause : failure;
                if (!isSignInCancellation(cause)) {
                    console.warn("[outlayr] sign-in failed", signInFailureDetail(cause));
                    setError(signInFailureMessage(cause, t));
                }
            })
            .finally(() => setBusy(null));
    };

    return { busy, error, start };
}
