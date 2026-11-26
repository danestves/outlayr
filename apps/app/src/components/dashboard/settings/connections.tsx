import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import BotIcon from "@hugeicons/core-free-icons/BotIcon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import WebhookIcon from "@hugeicons/core-free-icons/WebhookIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { LEDGER_MCP_ORIGIN } from "@outlayr/shared/urls";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { Empty } from "@/components/dashboard/home/empty";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { MenuContent } from "@/components/ui/menu-content";
import { connectionsQuery } from "@/lib/account-state";
import { convexClient } from "@/lib/convex";
import { webhooksOpen } from "@/lib/webhooks";

import { Banks } from "./banks";
import { Row, SectionHead, SettingsCard } from "./parts";

const SERVER = `${LEDGER_MCP_ORIGIN}/mcp`;

interface Agent {
    createdAt: number;
    id: string;
    lastUsedAt?: number;
    name?: string;
    scopes: readonly string[];
}

function useCopyServer() {
    const copy = useIntlayer("dashboard-connections");
    const toast = useToast();
    return async () => {
        try {
            await navigator.clipboard.writeText(SERVER);
            toast.add({ title: copy.copied.value });
        } catch {
            toast.add({ title: copy.copyFailed.value, type: "destructive" });
        }
    };
}

function ServerLine() {
    const copy = useIntlayer("dashboard-connections");
    const write = useCopyServer();
    return (
        <span className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground">{copy.server}</span>
            <span className="text-app-label min-w-0 truncate font-mono select-all">{SERVER}</span>
            <Button aria-label={copy.copyServer.value} onClick={write} size="icon-sm" variant="ghost">
                <HugeiconsIcon icon={Copy01Icon} size={15} />
            </Button>
        </span>
    );
}

function ConnectBody() {
    const copy = useIntlayer("dashboard-connections");
    const write = useCopyServer();
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{copy.connect}</Dialog.Title>
                <Dialog.Description>{copy.connectBody}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
                <Row
                    hint={<span className="text-app-label font-mono break-all select-all">{SERVER}</span>}
                    label={copy.server}
                >
                    <Button aria-label={copy.copyServer.value} onClick={write} size="icon-sm" variant="outline">
                        <HugeiconsIcon icon={Copy01Icon} size={15} />
                    </Button>
                </Row>
            </Dialog.Body>
            <Dialog.Footer>
                <Dialog.Close render={<Button variant="secondary" />}>{copy.done}</Dialog.Close>
            </Dialog.Footer>
        </>
    );
}

function ConnectDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <DialogContent>
                <ConnectBody />
            </DialogContent>
        </Dialog>
    );
}

function DisconnectDialog({
    agent,
    onClose,
    onConfirm,
    open,
}: {
    agent: Agent | null;
    onClose: () => void;
    onConfirm: (agent: Agent) => void;
    open: boolean;
}) {
    const copy = useIntlayer("dashboard-connections");
    return (
        <ConfirmDialog
            action={copy.disconnect}
            body={copy.disconnectBody}
            cancel={copy.cancel}
            onAction={() => {
                if (agent) {
                    onConfirm(agent);
                }
            }}
            onOpenChange={(next) => next || onClose()}
            open={open}
            title={copy.disconnectTitle({ name: agent?.name ?? copy.agent.value })}
            tone="destructive"
        />
    );
}

function useAccessLabel() {
    const copy = useIntlayer("dashboard-connections");
    return (scopes: readonly string[]) => {
        const reads = scopes.includes("ledger:read");
        const logs = scopes.includes("ledger:write");
        if (reads && logs) {
            return copy.readLog;
        }
        return logs ? copy.logOnly : copy.read;
    };
}

export function Connections() {
    const copy = useIntlayer("dashboard-connections");
    const webhooks = useIntlayer("dashboard-webhooks");
    const { sections } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const toast = useToast();
    const access = useAccessLabel();
    const [connecting, setConnecting] = useState(false);
    const [target, setTarget] = useState<Agent | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);
    const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
    const [thisYear] = useState(() => new Date().getFullYear());
    const [webhooksOn] = useState(() => webhooksOpen(Date.now()));
    const { data } = useQuery(connectionsQuery);
    const agents: readonly Agent[] = (data ?? []).filter(({ id }) => !gone.has(id));

    const day = (at: number) =>
        new Date(at).toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: new Date(at).getFullYear() === thisYear ? undefined : "numeric",
        });

    const disconnect = async (agent: Agent) => {
        setDisconnecting(false);
        setGone((current) => new Set(current).add(agent.id));
        try {
            await convexClient().mutation(api.mcp.revokeConnection, { id: agent.id });
            toast.add({ title: copy.disconnected({ name: agent.name ?? copy.agent.value }).value });
        } catch {
            setGone((current) => {
                const next = new Set(current);
                next.delete(agent.id);
                return next;
            });
            toast.add({ title: copy.disconnectFailed.value, type: "destructive" });
        }
    };

    return (
        <>
            <SectionHead
                action={
                    <Button onClick={() => setConnecting(true)} variant="outline">
                        <HugeiconsIcon icon={BotIcon} size={16} />
                        {copy.connect}
                    </Button>
                }
                title={sections.connections}
            />
            <div className="@container flex flex-col gap-4 pb-8">
                <Banks />
                {webhooksOn ? (
                    <SettingsCard title={webhooks.webhooks}>
                        <Link
                            className="hover:bg-app-hover min-h-app-row flex w-full items-center gap-3 px-4 py-3 text-left"
                            to="/settings/connections/webhooks"
                        >
                            <span className="bg-app-fill text-app-muted rounded-app-sm grid size-7 shrink-0 place-items-center">
                                <HugeiconsIcon icon={WebhookIcon} size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="text-app-body block font-medium">{webhooks.rowTitle}</span>
                                <span className="text-app-muted text-app-label block">{webhooks.rowHint}</span>
                            </span>
                            <HugeiconsIcon className="text-app-muted size-4.5" icon={ArrowRight01Icon} />
                        </Link>
                    </SettingsCard>
                ) : null}
                {agents.length === 0 ? (
                    <Skeleton loading={data === undefined}>
                        <SettingsCard title={copy.agents}>
                            <Empty
                                action={
                                    <Button onClick={() => setConnecting(true)} size="sm">
                                        {copy.connect}
                                    </Button>
                                }
                                icon={BotIcon}
                                line={copy.emptyBody}
                                title={copy.emptyTitle}
                            />
                        </SettingsCard>
                    </Skeleton>
                ) : (
                    <SettingsCard footer={<ServerLine />} title={copy.agents}>
                        <Table aria-label={copy.agents.value} framed maxHeight="none">
                            <Table.Header className="in-data-[sticky]:bg-card">
                                <Table.Row>
                                    <Table.Head>{copy.agent}</Table.Head>
                                    <Table.Head>{copy.access}</Table.Head>
                                    <Table.Head className="max-sm:hidden">{copy.connected}</Table.Head>
                                    <Table.Head className="max-sm:hidden">{copy.lastUsed}</Table.Head>
                                    <Table.Head />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {agents.map((agent) => {
                                    const name = agent.name ?? copy.agent.value;
                                    return (
                                        <Table.Row key={agent.id}>
                                            <Table.Cell>
                                                <span className="flex items-center gap-2.5 font-medium">
                                                    <span className="bg-app-fill text-muted-foreground rounded-app-sm grid size-6.5 shrink-0 place-items-center">
                                                        <HugeiconsIcon icon={BotIcon} size={15} />
                                                    </span>
                                                    <span className="ph-no-capture max-w-56 truncate">{name}</span>
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>{access(agent.scopes)}</Table.Cell>
                                            <Table.Cell className="max-sm:hidden">{day(agent.createdAt)}</Table.Cell>
                                            <Table.Cell className="max-sm:hidden">
                                                {agent.lastUsedAt === undefined
                                                    ? copy.neverUsed
                                                    : day(agent.lastUsedAt)}
                                            </Table.Cell>
                                            <Table.Cell className="w-10 text-right">
                                                <Menu>
                                                    <Menu.Trigger
                                                        aria-label={copy.more({ name }).value}
                                                        render={
                                                            <Button
                                                                className="text-muted-foreground -mr-1"
                                                                size="icon-sm"
                                                                variant="ghost"
                                                            />
                                                        }
                                                    >
                                                        <HugeiconsIcon icon={MoreVerticalIcon} size={17} />
                                                    </Menu.Trigger>
                                                    <MenuContent align="end" className="w-60" sideOffset={4}>
                                                        <Menu.Item
                                                            onClick={() => {
                                                                setTarget(agent);
                                                                setDisconnecting(true);
                                                            }}
                                                            variant="destructive"
                                                        >
                                                            <HugeiconsIcon icon={Unlink01Icon} size={16} />
                                                            {copy.disconnect}
                                                        </Menu.Item>
                                                    </MenuContent>
                                                </Menu>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table>
                    </SettingsCard>
                )}
            </div>
            <ConnectDialog onClose={() => setConnecting(false)} open={connecting} />
            <DisconnectDialog
                agent={target}
                onClose={() => setDisconnecting(false)}
                onConfirm={disconnect}
                open={disconnecting}
            />
        </>
    );
}
