import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import PlusIcon from "@hugeicons/core-free-icons/PlusIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_ENDPOINTS, MAX_FAILURES } from "@outlayr/backend/confect/webhooks.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Alert } from "panelui-web/alert";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { useDateFormat } from "@/components/dashboard/home/format";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { limitsQuery, webhooksQuery } from "@/lib/account-state";
import { convexClient, convexUrls } from "@/lib/convex";
import { endpointAddress, endpointState, inboundEndpoint, newInboundToken, newSigningSecret } from "@/lib/webhooks";
import type { EndpointState, WebhookEndpoint, WebhookStatusView } from "@/lib/webhooks";

import { SectionHead, SettingsCard } from "./parts";

const useWebhookDay = () => {
    const date = useDateFormat();
    return (at: number) => date.full(new Date(at).toISOString().slice(0, 10));
};

interface ShownSecret {
    kind: "signing" | "token";
    value: string;
}

export function Webhooks() {
    const copy = useIntlayer("dashboard-webhooks");
    const { sections } = useIntlayer("dashboard-settings");
    const limits = useQuery(limitsQuery);
    const status = useQuery(webhooksQuery);
    const title = (
        <span className="flex min-w-0 items-center gap-2">
            <Link className="text-app-muted hover:text-app-ink max-lg:hidden" to="/settings/connections">
                {sections.connections}
            </Link>
            <span aria-hidden className="text-app-muted max-lg:hidden">
                ›
            </span>
            <span>{copy.webhooks}</span>
        </span>
    );
    const retry = () => {
        void limits.refetch();
        void status.refetch();
    };
    if (limits.isError || status.isError) {
        return (
            <>
                <SectionHead backTo="/settings/connections" title={title} />
                <div className="@container flex flex-col gap-4 pb-8">
                    <Alert tone="destructive" variant="plain">
                        <Alert.Title>{copy.loadFailed}</Alert.Title>
                        <Button onClick={retry} size="sm" variant="outline">
                            {copy.retry}
                        </Button>
                    </Alert>
                </div>
            </>
        );
    }
    if (limits.data === undefined || status.data === undefined) {
        return <Pending title={title} />;
    }
    const canManage = limits.data?.pro === true;
    const view = status.data;
    const configured = view.inbound !== null || view.endpoints.length > 0;
    if (!(canManage || configured)) {
        return <FreePlan title={title} />;
    }
    return <WebhookSections canManage={canManage} status={view} title={title} />;
}

function Pending({ title }: { title: ReactNode }) {
    const copy = useIntlayer("dashboard-webhooks");
    return (
        <>
            <SectionHead backTo="/settings/connections" title={title} />
            <div className="@container flex flex-col gap-4 pb-8">
                <SettingsCard title={copy.receive}>
                    <Skeleton loading>
                        <div className="h-24" />
                    </Skeleton>
                </SettingsCard>
                <SettingsCard title={copy.send}>
                    <Skeleton loading>
                        <div className="h-24" />
                    </Skeleton>
                </SettingsCard>
            </div>
        </>
    );
}

function FreePlan({ title }: { title: ReactNode }) {
    return (
        <>
            <SectionHead backTo="/settings/connections" title={title} />
            <div className="@container flex flex-col gap-4 pb-8">
                <FreePlanCard />
            </div>
        </>
    );
}

function FreePlanCard() {
    const copy = useIntlayer("dashboard-webhooks");
    return (
        <SettingsCard title={copy.free.title}>
            <p className="text-app-body text-app-muted px-4 py-4">{copy.free.body}</p>
            <div className="border-app-rule flex justify-end border-t px-4 py-3">
                <Button render={<Link to="/settings/plan" />} size="sm" variant="outline">
                    {copy.free.upgrade}
                </Button>
            </div>
        </SettingsCard>
    );
}

function WebhookSections({
    canManage,
    status,
    title,
}: {
    canManage: boolean;
    status: WebhookStatusView;
    title: ReactNode;
}) {
    const copy = useIntlayer("dashboard-webhooks");
    const toast = useToast();
    const day = useWebhookDay();
    const [tokenBusy, setTokenBusy] = useState(false);
    const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
    const [shownSecret, setShownSecret] = useState<ShownSecret | null>(null);
    const [adding, setAdding] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [removing, setRemoving] = useState<WebhookEndpoint | null>(null);
    const minting = useRef(false);
    const inbound = inboundEndpoint(convexUrls().convexSiteUrl);

    const fail = () => toast.add({ title: copy.failed.value, type: "destructive" });

    const copyText = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.add({ title: copy.copied.value });
        } catch {
            toast.add({ title: copy.copyFailed.value, type: "destructive" });
        }
    };

    const createToken = async () => {
        if (minting.current) {
            return;
        }
        minting.current = true;
        setTokenBusy(true);
        try {
            const token = newInboundToken();
            const saved = await convexClient().mutation(api.webhooks.setInboundToken, { token });
            if (!saved) {
                fail();
                return;
            }
            setShownSecret({ kind: "token", value: token });
        } catch {
            fail();
        } finally {
            minting.current = false;
            setTokenBusy(false);
        }
    };

    const revokeToken = async () => {
        setRevoking(false);
        setTokenBusy(true);
        try {
            await convexClient().mutation(api.webhooks.revokeInboundToken, {});
        } catch {
            fail();
        } finally {
            setTokenBusy(false);
        }
    };

    const markBusy = (id: string, busy: boolean) =>
        setBusyIds((ids) => {
            const next = new Set(ids);
            if (busy) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });

    const testEndpoint = async (endpoint: WebhookEndpoint) => {
        markBusy(endpoint._id, true);
        try {
            const sent = await convexClient().mutation(api.webhooks.testEndpoint, { endpointId: endpoint._id });
            if (!sent) {
                toast.add({ title: copy.testSoon.value });
            }
        } catch {
            fail();
        } finally {
            markBusy(endpoint._id, false);
        }
    };

    const rotateSecret = async (endpoint: WebhookEndpoint) => {
        if (minting.current) {
            return;
        }
        minting.current = true;
        markBusy(endpoint._id, true);
        try {
            const secret = newSigningSecret();
            const saved = await convexClient().mutation(api.webhooks.setEndpointSecret, {
                endpointId: endpoint._id,
                secret,
            });
            if (!saved) {
                fail();
                return;
            }
            setShownSecret({ kind: "signing", value: secret });
        } catch {
            fail();
        } finally {
            minting.current = false;
            markBusy(endpoint._id, false);
        }
    };

    const removeEndpoint = async (endpoint: WebhookEndpoint) => {
        setRemoving(null);
        markBusy(endpoint._id, true);
        try {
            await convexClient().mutation(api.webhooks.removeEndpoint, { endpointId: endpoint._id });
        } catch {
            fail();
        } finally {
            markBusy(endpoint._id, false);
        }
    };

    return (
        <>
            <SectionHead
                action={
                    canManage ? (
                        <Button onClick={() => setAdding(true)} variant="outline">
                            <HugeiconsIcon icon={PlusIcon} size={16} />
                            {copy.addAddress}
                        </Button>
                    ) : null
                }
                backTo="/settings/connections"
                title={title}
            />
            <div className="@container flex flex-col gap-4 pb-8">
                {canManage ? null : <FreePlanCard />}
                {status.inbound !== null || canManage ? (
                    <SettingsCard footer={copy.receiveFooter} title={copy.receive}>
                        <Table aria-label={copy.receive.value} framed maxHeight="none">
                            <Table.Header className="in-data-[sticky]:bg-card">
                                <Table.Row>
                                    <Table.Head>{copy.address}</Table.Head>
                                    <Table.Head>{copy.token}</Table.Head>
                                    <Table.Head>{copy.lastUsed}</Table.Head>
                                    <Table.Head />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {status.inbound === null ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={4}>
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="text-app-muted">{copy.noToken}</span>
                                                <Button
                                                    disabled={tokenBusy}
                                                    onClick={() => createToken()}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    {copy.createToken}
                                                </Button>
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : (
                                    <Table.Row>
                                        <Table.Cell>
                                            <span className="flex min-w-0 items-center gap-2">
                                                {inbound ? (
                                                    <span
                                                        className="text-app-label min-w-0 truncate font-mono"
                                                        title={inbound.full}
                                                    >
                                                        {inbound.display}
                                                    </span>
                                                ) : null}
                                                {inbound ? (
                                                    <Button
                                                        aria-label={copy.copyAddress.value}
                                                        onClick={() => copyText(inbound.full)}
                                                        size="icon-sm"
                                                        variant="ghost"
                                                    >
                                                        <HugeiconsIcon icon={Copy01Icon} size={15} />
                                                    </Button>
                                                ) : null}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-app-muted font-mono">{`••••${status.inbound.hint}`}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {status.inbound.lastUsedAt === undefined
                                                ? copy.never
                                                : day(status.inbound.lastUsedAt)}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="flex justify-end gap-2">
                                                {canManage ? (
                                                    <Button
                                                        disabled={tokenBusy}
                                                        onClick={() => createToken()}
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        {copy.rotate}
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    className="text-destructive"
                                                    disabled={tokenBusy}
                                                    onClick={() => setRevoking(true)}
                                                    size="sm"
                                                    variant="ghost"
                                                >
                                                    {copy.revoke}
                                                </Button>
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </SettingsCard>
                ) : null}
                {status.endpoints.length > 0 || canManage ? (
                    <SettingsCard
                        action={
                            <span className="text-app-label text-app-muted tabular-nums">
                                {copy.countOf({ count: status.endpoints.length, max: MAX_ENDPOINTS })}
                            </span>
                        }
                        title={copy.send}
                    >
                        <Table aria-label={copy.send.value} framed maxHeight="none">
                            <Table.Header className="in-data-[sticky]:bg-card">
                                <Table.Row>
                                    <Table.Head>{copy.address}</Table.Head>
                                    <Table.Head>{copy.status}</Table.Head>
                                    <Table.Head>{copy.lastDelivery}</Table.Head>
                                    <Table.Head align="end">{copy.failures}</Table.Head>
                                    <Table.Head />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {status.endpoints.length > 0 ? (
                                    status.endpoints.map((endpoint) => (
                                        <Table.Row key={endpoint._id}>
                                            <Table.Cell>
                                                <span
                                                    className="text-app-label block max-w-72 truncate font-mono"
                                                    title={endpoint.url}
                                                >
                                                    {endpointAddress(endpoint.url)}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <StateBadge state={endpointState(endpoint)} />
                                            </Table.Cell>
                                            <Table.Cell>
                                                <DeliveryCell endpoint={endpoint} />
                                            </Table.Cell>
                                            <Table.Cell align="end">
                                                <span className="tabular-nums">
                                                    {copy.countOf({ count: endpoint.failures, max: MAX_FAILURES })}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="flex justify-end gap-1">
                                                    {canManage ? (
                                                        <Button
                                                            disabled={busyIds.has(endpoint._id)}
                                                            onClick={() => testEndpoint(endpoint)}
                                                            size="sm"
                                                            variant="ghost"
                                                        >
                                                            {copy.test}
                                                        </Button>
                                                    ) : null}
                                                    {canManage ? (
                                                        <Button
                                                            disabled={busyIds.has(endpoint._id)}
                                                            onClick={() => rotateSecret(endpoint)}
                                                            size="sm"
                                                            variant="ghost"
                                                        >
                                                            {copy.newSecret}
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        className="text-destructive"
                                                        disabled={busyIds.has(endpoint._id)}
                                                        onClick={() => setRemoving(endpoint)}
                                                        size="sm"
                                                        variant="ghost"
                                                    >
                                                        {copy.remove}
                                                    </Button>
                                                </span>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))
                                ) : (
                                    <Table.Row>
                                        <Table.Cell colSpan={5}>
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="text-app-muted">{copy.noEndpoints}</span>
                                                <Button onClick={() => setAdding(true)} size="sm" variant="outline">
                                                    {copy.addAddress}
                                                </Button>
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </SettingsCard>
                ) : null}
            </div>
            <AddDialog onClose={() => setAdding(false)} open={adding} />
            <SecretDialog onClose={() => setShownSecret(null)} secret={shownSecret} />
            <ConfirmDialog
                action={copy.revokeAction}
                body={copy.revokeBody}
                cancel={copy.cancel}
                onAction={revokeToken}
                onOpenChange={(next) => next || setRevoking(false)}
                open={revoking}
                title={copy.revokeTitle}
                tone="destructive"
            />
            <ConfirmDialog
                action={copy.remove}
                body={copy.removeBody}
                cancel={copy.cancel}
                onAction={() => {
                    if (removing) {
                        removeEndpoint(removing);
                    }
                }}
                onOpenChange={(next) => next || setRemoving(null)}
                open={removing !== null}
                title={copy.removeTitle}
                tone="destructive"
            />
        </>
    );
}

function StateBadge({ state }: { state: EndpointState }) {
    const copy = useIntlayer("dashboard-webhooks");
    const detail = state === "off" ? copy.state.offDetail.value : undefined;
    if (state === "active") {
        return (
            <Badge dot title={detail} variant="success">
                {copy.state.active}
            </Badge>
        );
    }
    if (state === "failing") {
        return (
            <Badge dot title={detail} variant="warning">
                {copy.state.failing}
            </Badge>
        );
    }
    return (
        <Badge dot title={detail} variant="destructive">
            {copy.state.disabled}
        </Badge>
    );
}

function DeliveryCell({ endpoint }: { endpoint: WebhookEndpoint }) {
    const copy = useIntlayer("dashboard-webhooks");
    const day = useWebhookDay();
    const { lastDelivery } = endpoint;
    if (lastDelivery === undefined) {
        return <span className="text-app-muted">{copy.state.nothing}</span>;
    }
    const when = day(lastDelivery.at);
    const ok = lastDelivery.status >= 200 && lastDelivery.status < 300;
    return ok ? copy.state.delivered({ when }) : copy.state.lastTryFailed({ when });
}

function ShowOnce({ kind, secret }: { kind: "signing" | "token"; secret: string }) {
    const copy = useIntlayer("dashboard-webhooks");
    const toast = useToast();
    const write = async () => {
        try {
            await navigator.clipboard.writeText(secret);
            toast.add({ title: copy.copied.value });
        } catch {
            toast.add({ title: copy.copyFailed.value, type: "destructive" });
        }
    };
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{kind === "signing" ? copy.secret.signing : copy.secret.token}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-app-label min-w-0 flex-1 font-mono break-all select-all">{secret}</span>
                    <Button aria-label={copy.secret.copy.value} onClick={write} size="icon-sm" variant="outline">
                        <HugeiconsIcon icon={Copy01Icon} size={15} />
                    </Button>
                </div>
                <p className="text-app-muted text-app-body">{copy.secret.once}</p>
            </Dialog.Body>
            <Dialog.Footer>
                <Dialog.Close render={<Button variant="secondary" />}>{copy.done}</Dialog.Close>
            </Dialog.Footer>
        </>
    );
}

function SecretDialog({ onClose, secret }: { onClose: () => void; secret: ShownSecret | null }) {
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={secret !== null}>
            <DialogContent>
                {secret === null ? null : <ShowOnce kind={secret.kind} secret={secret.value} />}
            </DialogContent>
        </Dialog>
    );
}

function AddDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
    const copy = useIntlayer("dashboard-webhooks");
    const [url, setUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [secret, setSecret] = useState<string | null>(null);
    const minting = useRef(false);
    const formId = useId();

    const close = () => {
        if (busy) {
            return;
        }
        setUrl("");
        setError(null);
        setSecret(null);
        onClose();
    };

    const submit = async () => {
        const trimmed = url.trim();
        if (trimmed === "" || minting.current) {
            return;
        }
        minting.current = true;
        setBusy(true);
        setError(null);
        try {
            const minted = newSigningSecret();
            const result = await convexClient().mutation(api.webhooks.addEndpoint, { secret: minted, url: trimmed });
            switch (result.kind) {
                case "added": {
                    setSecret(minted);
                    break;
                }
                case "invalidUrl": {
                    setError(copy.invalidUrl.value);
                    break;
                }
                case "invalidSecret": {
                    setError(copy.invalidSecret.value);
                    break;
                }
                case "tooMany": {
                    setError(copy.tooMany.value);
                    break;
                }
                default: {
                    setError(copy.addFailed.value);
                }
            }
        } catch {
            setError(copy.addFailed.value);
        } finally {
            minting.current = false;
            setBusy(false);
        }
    };

    return (
        <Dialog onOpenChange={(next) => next || close()} open={open}>
            <DialogContent>
                {secret === null ? (
                    <>
                        <Dialog.Header>
                            <Dialog.Title>{copy.addAddress}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <form
                                className="flex flex-col gap-4"
                                id={formId}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    submit();
                                }}
                            >
                                <Field invalid={error !== null}>
                                    <Field.Label>{copy.address}</Field.Label>
                                    <Input
                                        autoComplete="off"
                                        autoFocus
                                        inputMode="url"
                                        onChange={(event) => {
                                            setUrl(event.target.value);
                                            setError(null);
                                        }}
                                        placeholder={copy.addPlaceholder.value}
                                        spellCheck={false}
                                        value={url}
                                    />
                                    {error === null ? null : <Field.Error match>{error}</Field.Error>}
                                </Field>
                                <p className="text-app-body text-app-muted">{copy.addDisclosure}</p>
                            </form>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.Close disabled={busy} render={<Button variant="secondary" />}>
                                {copy.cancel}
                            </Dialog.Close>
                            <Button disabled={busy || url.trim() === ""} form={formId} type="submit">
                                {busy ? copy.addBusy : copy.add}
                            </Button>
                        </Dialog.Footer>
                    </>
                ) : (
                    <ShowOnce kind="signing" secret={secret} />
                )}
            </DialogContent>
        </Dialog>
    );
}
