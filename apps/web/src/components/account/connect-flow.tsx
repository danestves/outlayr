import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { authorize, findAuthRequest, getAuthRequest, redirectHost, scopeTitle } from "@/lib/consent";
import type { AuthRequest } from "@/lib/consent";

import { ErrorLine, Field, LINE_PILL, Screen, SOLID_PILL } from "./parts";

function failure(cause: unknown): string {
    const message = cause instanceof ConvexError ? z.string().safeParse(cause.data) : null;
    return message?.success ? message.data : "Something went wrong. Try again.";
}

export function ConnectFlow({ requestId }: { requestId: string | undefined }) {
    if (requestId === undefined) {
        return <FindRequest />;
    }
    return <Consent requestId={requestId} />;
}

function FindRequest() {
    const find = useMutation(findAuthRequest);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const request = await find({ userCode: code });
            if (request === null) {
                setError("No request matches that code.");
                return;
            }
            window.location.assign(`/connect?request=${encodeURIComponent(request)}`);
        } catch (cause) {
            setError(failure(cause));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Screen title="Connect an agent">
            <form onSubmit={submit}>
                <Field
                    autoCapitalize="characters"
                    autoComplete="off"
                    label="Code from your agent"
                    onChange={(event) => setCode(event.target.value)}
                    value={code}
                />
                <ErrorLine message={error} />
                <button className={SOLID_PILL} disabled={busy || !code.trim()} type="submit">
                    Continue
                </button>
            </form>
        </Screen>
    );
}

function Consent({ requestId }: { requestId: string }) {
    const request = useQuery(getAuthRequest, { requestId });
    const [done, setDone] = useState(false);
    if (request === undefined) {
        return <Screen />;
    }
    if (request === null || (request.status !== "pending" && !done)) {
        return (
            <Screen>
                <p className="text-app-muted text-sm">This request has expired or was already used.</p>
            </Screen>
        );
    }
    return <Decision done={done} onDone={() => setDone(true)} request={request} requestId={requestId} />;
}

function Unverified() {
    return (
        <span className="text-app-muted ring-app-rule ml-2 inline-block rounded-md px-1.5 py-0.5 align-middle text-[11px] font-normal ring-1 ring-inset">
            unverified
        </span>
    );
}

function ScopeRows({ scopes }: { scopes: AuthRequest["scopes"] }) {
    return (
        <ul className="border-app-rule divide-app-rule mb-4 divide-y border-y text-left">
            {scopes.map((scope) => (
                <li className="flex flex-col py-3" key={scope.name}>
                    <b className="text-[15px] font-medium">{scopeTitle(scope.name)}</b>
                    <span className="text-app-muted text-[13px]">{scope.description}</span>
                </li>
            ))}
        </ul>
    );
}

function Decision({
    done,
    onDone,
    request,
    requestId,
}: {
    done: boolean;
    onDone: () => void;
    request: AuthRequest;
    requestId: string;
}) {
    const decide = useAction(authorize);
    const email = authClient.useSession().data?.user.email;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const device = request.kind === "device";
    const clientName = request.clientName ?? "an agent";

    const answer = async (approve: boolean) => {
        setError(null);
        setBusy(true);
        try {
            const { redirectUrl } = await decide({
                approve,
                requestId,
                userCode: device && approve ? request.userCode : undefined,
            });
            if (redirectUrl === null) {
                onDone();
                return;
            }
            window.location.assign(redirectUrl);
        } catch (cause) {
            setError(failure(cause));
            setBusy(false);
        }
    };

    let intro: ReactNode;
    if (device) {
        intro = (
            <>
                <p className="text-app-muted -mt-3 mb-3 text-sm">Make sure your agent shows this code</p>
                <p className="mb-6 font-mono text-[32px] font-semibold tracking-[0.12em]">{request.userCode}</p>
            </>
        );
    } else if (request.redirectUri) {
        intro = (
            <p className="text-app-muted -mt-3 mb-5 text-sm">{redirectHost(request.redirectUri)} will be able to:</p>
        );
    }

    return (
        <Screen
            title={
                <>
                    Connect {clientName}
                    <Unverified />
                </>
            }
        >
            {intro}
            <ScopeRows scopes={request.scopes} />
            {email ? <p className="text-app-muted mb-4 text-xs">Signed in as {email}.</p> : null}
            <ErrorLine message={error} />
            {done ? (
                <p className="text-sm">Done. Go back to your agent.</p>
            ) : (
                <>
                    <button
                        className={`${SOLID_PILL} mb-2.5`}
                        disabled={busy}
                        onClick={() => answer(true)}
                        type="button"
                    >
                        {device ? "Approve" : "Allow"}
                    </button>
                    <button className={LINE_PILL} disabled={busy} onClick={() => answer(false)} type="button">
                        Deny
                    </button>
                </>
            )}
        </Screen>
    );
}
