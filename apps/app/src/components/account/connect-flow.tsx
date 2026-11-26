import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { ArtCard, BrandPage, Centered, SessionEmail } from "@/components/brand-page";
import { SettingsCard } from "@/components/dashboard/settings/parts";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { authorize, findAuthRequest, getAuthRequest, redirectHost, scopeTitle } from "@/lib/consent";
import type { AuthRequest } from "@/lib/consent";

const SCOPE_ICONS = new Map([
    ["ledger:read", ViewIcon],
    ["ledger:write", PencilEdit01Icon],
]);

const decodeMessage = Schema.decodeUnknownOption(Schema.String);

class ConnectFailure extends Schema.TaggedError<ConnectFailure>()("ConnectFailure", {
    cause: Schema.Defect(),
}) {}

const connectRequest = Effect.fn("Connect.request")(function* connectRequest<A>(call: () => Promise<A>) {
    return yield* Effect.tryPromise({ catch: (cause) => new ConnectFailure({ cause }), try: call });
});

function failure(cause: unknown, fallback: string): string {
    const message = cause instanceof ConvexError ? decodeMessage(cause.data) : Option.none();
    return Option.getOrElse(message, () => fallback);
}

export function ConnectFlow({ requestId }: { requestId: string | undefined }) {
    return (
        <BrandPage actions={<SessionEmail />}>
            <Centered>{requestId === undefined ? <FindRequest /> : <Consent requestId={requestId} />}</Centered>
        </BrandPage>
    );
}

function FindRequest() {
    const copy = useIntlayer("connect");
    const find = useMutation(findAuthRequest);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        Effect.runFork(
            Effect.gen(function* submitProgram() {
                const request = yield* connectRequest(() => find({ userCode: code }));
                if (request === null) {
                    setError(copy.noMatch.value);
                    return;
                }
                window.location.assign(`/connect?request=${encodeURIComponent(request)}`);
            }).pipe(
                Effect.catchTags({
                    ConnectFailure: (failed) =>
                        Effect.sync(() => setError(failure(failed.cause, copy.genericError.value))),
                }),
                Effect.ensuring(Effect.sync(() => setBusy(false)))
            )
        );
    };

    return (
        <form onSubmit={submit}>
            <SettingsCard
                footer={
                    <div className="flex w-full justify-end">
                        <Button aria-busy={busy} disabled={busy || !code.trim()} type="submit">
                            {busy ? copy.checking : copy.continueLabel}
                        </Button>
                    </div>
                }
                title={copy.connectAgentTitle}
            >
                <div className="p-4">
                    <TextField
                        autoCapitalize="characters"
                        autoComplete="off"
                        autoFocus
                        className="font-mono"
                        error={error}
                        label={copy.codeLabel}
                        onChange={(event) => setCode(event.target.value)}
                        value={code}
                    />
                </div>
            </SettingsCard>
        </form>
    );
}

function Consent({ requestId }: { requestId: string }) {
    const copy = useIntlayer("connect");
    const request = useQuery(getAuthRequest, { requestId });
    const [done, setDone] = useState(false);
    if (request === undefined) {
        return <ConsentBones />;
    }
    if (request === null || (request.status !== "pending" && !done)) {
        return (
            <ArtCard
                action={
                    <Button render={<a aria-label={copy.enterCode.value} href="/connect" />}>{copy.enterCode}</Button>
                }
                body={copy.expiredBody}
                title={copy.closedTitle}
            />
        );
    }
    return <Decision done={done} onDone={() => setDone(true)} request={request} requestId={requestId} />;
}

const BONE = "bg-app-fill rounded-app-xs block";

function ConsentBones() {
    return (
        <Frame aria-hidden="true">
            <Frame.Header>
                <span className={`${BONE} h-4 w-40`} />
            </Frame.Header>
            <Frame.Panel>
                <div className="flex flex-col gap-2 p-4">
                    <span className={`${BONE} h-3 w-44`} />
                    <span className={`${BONE} h-8 w-52`} />
                </div>
                {[0, 1].map((row) => (
                    <div className="border-border flex flex-col gap-2 border-t p-4" key={row}>
                        <span className={`${BONE} h-3 w-24`} />
                        <span className={`${BONE} h-3 w-64`} />
                    </div>
                ))}
            </Frame.Panel>
            <Frame.Footer>
                <span className="h-app-control block" />
            </Frame.Footer>
        </Frame>
    );
}

function ScopeRows({ scopes }: { scopes: AuthRequest["scopes"] }) {
    return scopes.map((scope) => {
        const icon = SCOPE_ICONS.get(scope.name);
        return (
            <Frame.Row className="border-border border-t" key={scope.name}>
                <Frame.Media className="text-muted-foreground size-5">
                    {icon ? <HugeiconsIcon icon={icon} size={16} /> : null}
                </Frame.Media>
                <Frame.Content>
                    <p className="text-app-body font-medium">{scopeTitle(scope.name)}</p>
                    <p className="text-muted-foreground text-app-label">{scope.description}</p>
                </Frame.Content>
            </Frame.Row>
        );
    });
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
    const copy = useIntlayer("connect");
    const decide = useAction(authorize);
    const email = authClient.useSession().data?.user.email;
    const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const device = request.kind === "device";
    const clientName = request.clientName ?? copy.anAgent.value;

    const answer = (approve: boolean) => {
        setError(null);
        setBusy(approve ? "approve" : "deny");
        Effect.runFork(
            Effect.gen(function* answerProgram() {
                const { redirectUrl } = yield* connectRequest(() =>
                    decide({
                        approve,
                        requestId,
                        userCode: device && approve ? request.userCode : undefined,
                    })
                );
                if (redirectUrl === null) {
                    onDone();
                    return;
                }
                window.location.assign(redirectUrl);
            }).pipe(
                Effect.catchTags({
                    ConnectFailure: (failed) =>
                        Effect.sync(() => {
                            setError(failure(failed.cause, copy.genericError.value));
                            setBusy(null);
                        }),
                })
            )
        );
    };

    let intro: ReactNode = null;
    if (device) {
        intro = (
            <div className="px-4 pt-3 pb-4">
                <p className="text-muted-foreground text-app-label">{copy.showCode}</p>
                <p className="text-app-figure mt-1 font-mono font-semibold tracking-widest">{request.userCode}</p>
            </div>
        );
    } else if (request.redirectUri) {
        intro = (
            <p className="text-muted-foreground text-app-label px-4 py-3">
                {copy.willBeAble({ client: redirectHost(request.redirectUri) })}
            </p>
        );
    }
    const approveLabel = device ? copy.approve : copy.allow;
    const approvingLabel = device ? copy.approving : copy.allowing;

    return (
        <SettingsCard
            action={
                done ? (
                    <Badge dot variant="success">
                        {copy.approved}
                    </Badge>
                ) : null
            }
            footer={
                done ? (
                    <p className="text-app-body flex items-center gap-2">
                        <HugeiconsIcon className="text-app-income" icon={Tick02Icon} size={16} />
                        {copy.done}
                    </p>
                ) : (
                    <div className="flex w-full items-center gap-2">
                        {email ? (
                            <span className="text-muted-foreground ph-no-capture text-app-label mr-auto truncate">
                                {copy.signedInAs({ email })}
                            </span>
                        ) : (
                            <span className="mr-auto" />
                        )}
                        <Button
                            aria-busy={busy === "deny"}
                            disabled={busy !== null}
                            onClick={() => answer(false)}
                            variant="ghost"
                        >
                            {copy.deny}
                        </Button>
                        <Button aria-busy={busy === "approve"} disabled={busy !== null} onClick={() => answer(true)}>
                            {busy === "approve" ? approvingLabel : approveLabel}
                        </Button>
                    </div>
                )
            }
            title={
                <span className="flex items-center gap-2">
                    {copy.connectClient({ client: clientName })}
                    {done ? null : <Badge variant="outline">{copy.unverified}</Badge>}
                </span>
            }
        >
            {done ? null : intro}
            <ScopeRows scopes={request.scopes} />
            {error ? (
                <p
                    className="text-destructive text-app-label border-border flex items-center gap-2 border-t px-4 py-3"
                    role="alert"
                >
                    <HugeiconsIcon className="shrink-0" icon={AlertCircleIcon} size={16} />
                    {error}
                </p>
            ) : null}
        </SettingsCard>
    );
}
