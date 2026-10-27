import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AUTH_RESTORE_BUDGET_MS, authGate } from "@/domain/auth-gate";
import type { AuthGate } from "@/domain/auth-gate";
import { authClient, useAuthClientSession } from "@/lib/auth-client";

type AuthClient = NonNullable<typeof authClient>;

export interface AuthSession {
    /** The Better Auth subject, or null whenever the gate is not `signed-in`. */
    accountId: string | null;
    activate: () => void;
    begin: () => void;
    gate: AuthGate;
    profile: AccountProfile | null;
    reject: () => void;
}

export interface AccountProfile {
    email: string;
    name: string;
}

const NOOP = () => undefined;
const UNCONFIGURED: AuthSession = {
    accountId: null,
    activate: NOOP,
    begin: NOOP,
    gate: "unconfigured",
    profile: null,
    reject: NOOP,
};

const AuthSessionContext = createContext<AuthSession>(UNCONFIGURED);

const restoreBudgetAtom = Atom.make(Effect.sleep(Duration.millis(AUTH_RESTORE_BUDGET_MS))).pipe(
    Atom.withLabel("auth-session:restore-budget")
);

export function useAuthSession(): AuthSession {
    return use(AuthSessionContext);
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
    if (authClient === null) {
        return <AuthSessionContext.Provider value={UNCONFIGURED}>{children}</AuthSessionContext.Provider>;
    }
    return <LiveSession client={authClient}>{children}</LiveSession>;
}

function LiveSession({ client, children }: { client: AuthClient; children: ReactNode }) {
    const { data: session, isPending } = useAuthClientSession();
    const [provisional, setProvisional] = useState(false);
    const restoreExpired = AsyncResult.isSuccess(useAtomValue(restoreBudgetAtom));

    const begin = useCallback(() => setProvisional(true), []);
    const activate = useCallback(() => setProvisional(false), []);
    const reject = useCallback(() => setProvisional(false), []);
    const restoring = isPending && client.getCookie() !== "";
    const value = useMemo(
        () => ({ ...sessionView(session, restoring, provisional, restoreExpired), activate, begin, reject }),
        [activate, begin, restoring, provisional, reject, restoreExpired, session]
    );

    return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function sessionView(
    session: { user: AccountProfile & { id: string } } | null | undefined,
    isPending: boolean,
    provisional: boolean,
    restoreExpired = false
): Pick<AuthSession, "accountId" | "gate" | "profile"> {
    const user = provisional || session == null ? null : session.user;
    const accountId = user?.id ?? null;
    return {
        accountId,
        gate: authGate({
            configured: true,
            hasSession: accountId != null,
            restoreExpired: restoreExpired && !provisional,
            restoring: isPending || provisional,
        }),
        profile: user === null ? null : { email: user.email, name: user.name },
    };
}
